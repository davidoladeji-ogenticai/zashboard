/**
 * Organization Service
 *
 * Handles all organization-related database operations including
 * memberships, teams, AI configuration, and user context.
 */

import { query, transaction } from './index'
import type {
  Organization,
  OrganizationMembership,
  OrganizationAIConfig,
  OrganizationContext,
  UserOrganizationContext,
  OrganizationMemberDetail,
  Team,
  TeamMembership,
  OrganizationSpace,
  UserRole,
  TeamRole
} from '@/types/organization'

export class OrganizationService {
  /**
   * Get organization by ID
   */
  static async getById(orgId: string): Promise<Organization | null> {
    const result = await query(
      'SELECT * FROM organizations WHERE id = $1',
      [orgId]
    )
    return result.rows[0] || null
  }

  /**
   * Get organization by slug
   */
  static async getBySlug(slug: string): Promise<Organization | null> {
    const result = await query(
      'SELECT * FROM organizations WHERE slug = $1',
      [slug]
    )
    return result.rows[0] || null
  }

  /**
   * Check if user is member of organization
   */
  static async isUserMember(userId: string, orgId: string): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM organization_memberships WHERE user_id = $1 AND organization_id = $2',
      [userId, orgId]
    )
    return result.rows.length > 0
  }

  /**
   * Get user's role in organization
   */
  static async getUserRole(userId: string, orgId: string): Promise<UserRole | null> {
    const result = await query(
      'SELECT role FROM organization_memberships WHERE user_id = $1 AND organization_id = $2',
      [userId, orgId]
    )
    return result.rows[0]?.role || null
  }

  /**
   * Get all organizations user belongs to with full context
   */
  static async getUserOrganizations(userId: string): Promise<UserOrganizationContext> {
    // Get user preferences (active organization)
    const prefsResult = await query(
      'SELECT active_organization_id FROM user_preferences WHERE user_id = $1',
      [userId]
    )
    const activeOrgId = prefsResult.rows[0]?.active_organization_id || null

    // Get all organization memberships
    const membershipQuery = `
      SELECT
        om.*,
        o.*,
        CASE WHEN $2 != '' AND o.id = $2 THEN true ELSE false END as is_active
      FROM organization_memberships om
      JOIN organizations o ON om.organization_id = o.id
      WHERE om.user_id = $1
      ORDER BY om.last_accessed_at DESC
    `

    console.log('[ORG SERVICE] About to query organizations with:', { userId, activeOrgId: activeOrgId || '' })
    const membershipResult = await query(membershipQuery, [userId, activeOrgId || ''])

    // Build organization contexts
    const organizations = await Promise.all(
      membershipResult.rows.map(async (row) => {
        const orgId = row.organization_id

        // Get AI config
        const aiConfig = await this.getAIConfig(orgId)

        // Get user's teams in this organization
        const teams = await this.getUserTeams(userId, orgId)

        // Get organization spaces
        const spaces = await this.getOrganizationSpaces(orgId)

        // Get user's organization-specific roles (new RBAC system)
        let orgRoles = []
        let orgPermissions = []
        try {
          const rolesResult = await query(
            `SELECT DISTINCT r.id, r.name, r.display_name, r.level
             FROM organization_user_roles our
             JOIN organization_roles r ON our.role_id = r.id
             WHERE our.user_id = $1
               AND our.organization_id = $2
               AND our.is_active = TRUE
               AND (our.expires_at IS NULL OR our.expires_at > NOW())
             ORDER BY r.level DESC`,
            [userId, orgId]
          )
          orgRoles = rolesResult.rows

          const permsResult = await query(
            `SELECT DISTINCT p.name, p.display_name, p.resource, p.action, p.category
             FROM organization_user_roles our
             JOIN organization_role_permissions orp ON our.role_id = orp.role_id
             JOIN organization_permissions p ON orp.permission_id = p.id
             WHERE our.user_id = $1
               AND our.organization_id = $2
               AND our.is_active = TRUE
               AND (our.expires_at IS NULL OR our.expires_at > NOW())
             ORDER BY p.category, p.name`,
            [userId, orgId]
          )
          orgPermissions = permsResult.rows
        } catch (error) {
          // Organization RBAC tables may not exist yet - gracefully handle
          console.warn('Organization RBAC tables may not exist yet:', error)
        }

        return {
          membership: {
            id: row.id,
            user_id: row.user_id,
            organization_id: row.organization_id,
            role: row.role,
            title: row.title,
            department: row.department,
            joined_at: row.joined_at,
            last_accessed_at: row.last_accessed_at,
            organization: {
              id: orgId,
              name: row.name,
              slug: row.slug,
              description: row.description,
              logo_url: row.logo_url,
              website: row.website,
              industry: row.industry,
              size: row.size,
              created_at: row.created_at,
              updated_at: row.updated_at
            }
          },
          ai_config: aiConfig,
          teams,
          spaces,
          is_active: row.is_active,
          org_roles: orgRoles,
          org_permissions: orgPermissions
        }
      })
    )

    const activeOrg = organizations.find(org => org.is_active) || null

    return {
      organizations,
      active_organization_id: activeOrgId,
      active_organization: activeOrg
    }
  }

  /**
   * Set active organization for user
   */
  static async setActiveOrganization(userId: string, orgId: string): Promise<void> {
    // Verify user is member
    const isMember = await this.isUserMember(userId, orgId)
    if (!isMember) {
      throw new Error('User is not a member of this organization')
    }

    // Update or insert user preferences
    await query(`
      INSERT INTO user_preferences (user_id, active_organization_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET active_organization_id = $2, updated_at = NOW()
    `, [userId, orgId])

    // Update last_accessed_at
    await query(`
      UPDATE organization_memberships
      SET last_accessed_at = NOW()
      WHERE user_id = $1 AND organization_id = $2
    `, [userId, orgId])
  }

  /**
   * Get AI config for organization
   */
  static async getAIConfig(orgId: string): Promise<OrganizationAIConfig | null> {
    const result = await query(
      'SELECT * FROM organization_ai_configs WHERE organization_id = $1',
      [orgId]
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  }

  /**
   * Update AI config (super_admin only)
   */
  static async updateAIConfig(
    orgId: string,
    config: {
      welcome_messages: string[]
      welcome_title?: string
      welcome_description?: string
      enabled: boolean
      created_by: string
    }
  ): Promise<OrganizationAIConfig> {
    // Validate welcome_messages
    if (!Array.isArray(config.welcome_messages) || config.welcome_messages.length !== 3) {
      throw new Error('Must provide exactly 3 welcome messages')
    }

    const result = await query(`
      INSERT INTO organization_ai_configs (
        organization_id,
        welcome_messages,
        welcome_title,
        welcome_description,
        enabled,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (organization_id)
      DO UPDATE SET
        welcome_messages = $2,
        welcome_title = $3,
        welcome_description = $4,
        enabled = $5,
        created_by = $6,
        updated_at = NOW()
      RETURNING *
    `, [
      orgId,
      JSON.stringify(config.welcome_messages),
      config.welcome_title,
      config.welcome_description,
      config.enabled,
      config.created_by
    ])

    return result.rows[0]
  }

  /**
   * Get system-wide AI config (singleton)
   */
  static async getSystemAIConfig(): Promise<OrganizationAIConfig | null> {
    const result = await query(
      'SELECT * FROM system_ai_config WHERE id = $1',
      ['00000000-0000-0000-0000-000000000001']
    )

    if (result.rows.length === 0) {
      return null
    }

    return result.rows[0]
  }

  /**
   * Update system-wide AI config (platform admin only)
   */
  static async updateSystemAIConfig(
    config: {
      welcome_messages: string[]
      welcome_title?: string
      welcome_description?: string
      enabled: boolean
      created_by: string
    }
  ): Promise<OrganizationAIConfig> {
    // Validate welcome_messages
    if (!Array.isArray(config.welcome_messages) || config.welcome_messages.length !== 3) {
      throw new Error('Must provide exactly 3 welcome messages')
    }

    const result = await query(`
      INSERT INTO system_ai_config (
        id,
        welcome_messages,
        welcome_title,
        welcome_description,
        enabled,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id)
      DO UPDATE SET
        welcome_messages = $2,
        welcome_title = $3,
        welcome_description = $4,
        enabled = $5,
        created_by = $6,
        updated_at = NOW()
      RETURNING *
    `, [
      '00000000-0000-0000-0000-000000000001',
      JSON.stringify(config.welcome_messages),
      config.welcome_title,
      config.welcome_description,
      config.enabled,
      config.created_by
    ])

    return result.rows[0]
  }

  /**
   * Get organization members
   */
  static async getMembers(orgId: string): Promise<OrganizationMemberDetail[]> {
    const result = await query(`
      SELECT
        u.id as user_id,
        u.email,
        u.name,
        om.role,
        om.title,
        om.department,
        om.joined_at
      FROM organization_memberships om
      JOIN users u ON om.user_id = u.id
      WHERE om.organization_id = $1
      ORDER BY om.joined_at DESC
    `, [orgId])

    return result.rows
  }

  /**
   * Get user's teams in organization
   */
  static async getUserTeams(userId: string, orgId: string): Promise<Team[]> {
    const result = await query(`
      SELECT
        t.*,
        tm.role as user_role,
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count
      FROM teams t
      JOIN team_members tm ON t.id = tm.team_id
      WHERE tm.user_id = $1 AND t.organization_id = $2
      ORDER BY t.created_at DESC
    `, [userId, orgId])

    return result.rows
  }

  /**
   * Get organization spaces
   */
  static async getOrganizationSpaces(orgId: string): Promise<OrganizationSpace[]> {
    const result = await query(
      'SELECT * FROM organization_spaces WHERE organization_id = $1',
      [orgId]
    )
    return result.rows
  }

  /**
   * Add member to organization
   */
  static async addMember(
    orgId: string,
    email: string,
    role: UserRole
  ): Promise<OrganizationMembership> {
    // Find user by email
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (userResult.rows.length === 0) {
      throw new Error('User not found')
    }

    const userId = userResult.rows[0].id

    // Add membership
    const result = await query(`
      INSERT INTO organization_memberships (user_id, organization_id, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, organization_id) DO NOTHING
      RETURNING *
    `, [userId, orgId, role])

    if (result.rows.length === 0) {
      throw new Error('User is already a member of this organization')
    }

    return result.rows[0]
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    orgId: string,
    userId: string,
    role: UserRole
  ): Promise<void> {
    await query(`
      UPDATE organization_memberships
      SET role = $1
      WHERE user_id = $2 AND organization_id = $3
    `, [role, userId, orgId])
  }

  /**
   * Remove member from organization
   */
  static async removeMember(orgId: string, userId: string): Promise<void> {
    await query(
      'DELETE FROM organization_memberships WHERE user_id = $1 AND organization_id = $2',
      [userId, orgId]
    )
  }

  /**
   * Create new organization
   */
  static async create(data: {
    name: string
    slug: string
    description?: string
    logo_url?: string
    website?: string
    industry?: string
    size?: string
  }): Promise<Organization> {
    const result = await query(`
      INSERT INTO organizations (name, slug, description, logo_url, website, industry, size)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      data.name,
      data.slug,
      data.description,
      data.logo_url,
      data.website,
      data.industry,
      data.size
    ])

    return result.rows[0]
  }

  /**
   * Update organization
   */
  static async update(
    orgId: string,
    data: Partial<Organization>
  ): Promise<Organization> {
    const fields = []
    const values = []
    let paramCount = 1

    if (data.name) {
      fields.push(`name = $${paramCount++}`)
      values.push(data.name)
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`)
      values.push(data.description)
    }
    if (data.logo_url !== undefined) {
      fields.push(`logo_url = $${paramCount++}`)
      values.push(data.logo_url)
    }
    if (data.website !== undefined) {
      fields.push(`website = $${paramCount++}`)
      values.push(data.website)
    }
    if (data.industry !== undefined) {
      fields.push(`industry = $${paramCount++}`)
      values.push(data.industry)
    }
    if (data.size !== undefined) {
      fields.push(`size = $${paramCount++}`)
      values.push(data.size)
    }

    if (fields.length === 0) {
      throw new Error('No fields to update')
    }

    values.push(orgId)

    const result = await query(`
      UPDATE organizations
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING *
    `, values)

    return result.rows[0]
  }
}
