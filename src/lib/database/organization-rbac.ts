/**
 * Organization RBAC (Role-Based Access Control) Functions
 *
 * Provides organization-scoped role and permission management functionality.
 * This is separate from platform-level RBAC.
 */

import { query, transaction } from './index'

// ============================================
// Type Definitions
// ============================================

export interface OrganizationRole {
  id: string
  organization_id: string
  name: string
  display_name: string
  description: string | null
  level: number
  is_system: boolean
  is_active: boolean
  created_at: Date
  updated_at: Date
  created_by: string | null
}

export interface OrganizationPermission {
  id: string
  organization_id: string
  name: string
  display_name: string
  description: string | null
  category: string
  resource: string
  action: string
  is_system: boolean
  created_at: Date
  created_by: string | null
}

export interface OrganizationUserRole {
  id: string
  user_id: string
  organization_id: string
  role_id: string
  assigned_at: Date
  assigned_by: string | null
  expires_at: Date | null
  is_active: boolean
}

export interface OrganizationRoleWithPermissions extends OrganizationRole {
  permissions: OrganizationPermission[]
}

export interface UserOrgRoles {
  user_id: string
  organization_id: string
  roles: OrganizationRole[]
  permissions: OrganizationPermission[]
}

// ============================================
// Permission Checking Functions
// ============================================

/**
 * Check if a user has a specific permission in an organization
 */
export async function userHasOrgPermission(
  userId: string,
  orgId: string,
  permissionName: string
): Promise<boolean> {
  try {
    const result = await query(
      'SELECT user_has_org_permission($1, $2, $3) as has_permission',
      [userId, orgId, permissionName]
    )
    return result.rows[0]?.has_permission || false
  } catch (error) {
    console.error('Error checking user org permission:', error)
    return false
  }
}

/**
 * Check if a user has a specific role in an organization
 */
export async function userHasOrgRole(
  userId: string,
  orgId: string,
  roleName: string
): Promise<boolean> {
  try {
    const result = await query(
      `SELECT EXISTS (
        SELECT 1
        FROM organization_user_roles our
        JOIN organization_roles r ON our.role_id = r.id
        WHERE our.user_id = $1
          AND our.organization_id = $2
          AND r.name = $3
          AND our.is_active = TRUE
          AND (our.expires_at IS NULL OR our.expires_at > NOW())
      ) as has_role`,
      [userId, orgId, roleName]
    )
    return result.rows[0]?.has_role || false
  } catch (error) {
    console.error('Error checking user org role:', error)
    return false
  }
}

/**
 * Get all permissions for a user in an organization
 */
export async function getUserOrgPermissions(
  userId: string,
  orgId: string
): Promise<OrganizationPermission[]> {
  try {
    const result = await query(
      `SELECT * FROM get_user_org_permissions($1, $2)`,
      [userId, orgId]
    )
    return result.rows
  } catch (error) {
    console.error('Error getting user org permissions:', error)
    return []
  }
}

/**
 * Get all roles for a user in an organization
 */
export async function getUserOrgRoles(
  userId: string,
  orgId: string
): Promise<OrganizationRole[]> {
  try {
    const result = await query(
      `SELECT DISTINCT r.*
       FROM organization_user_roles our
       JOIN organization_roles r ON our.role_id = r.id
       WHERE our.user_id = $1
         AND our.organization_id = $2
         AND our.is_active = TRUE
         AND (our.expires_at IS NULL OR our.expires_at > NOW())
       ORDER BY r.level DESC`,
      [userId, orgId]
    )
    return result.rows
  } catch (error) {
    console.error('Error getting user org roles:', error)
    return []
  }
}

/**
 * Get user with all their roles and permissions in an organization
 */
export async function getUserOrgRolesAndPermissions(
  userId: string,
  orgId: string
): Promise<UserOrgRoles | null> {
  try {
    const roles = await getUserOrgRoles(userId, orgId)
    const permissions = await getUserOrgPermissions(userId, orgId)

    return {
      user_id: userId,
      organization_id: orgId,
      roles,
      permissions
    }
  } catch (error) {
    console.error('Error getting user org roles and permissions:', error)
    return null
  }
}

/**
 * Get highest role level for a user in an organization
 */
export async function getUserHighestOrgRoleLevel(
  userId: string,
  orgId: string
): Promise<number> {
  try {
    const result = await query(
      `SELECT MAX(r.level) as max_level
       FROM organization_user_roles our
       JOIN organization_roles r ON our.role_id = r.id
       WHERE our.user_id = $1
         AND our.organization_id = $2
         AND our.is_active = TRUE
         AND (our.expires_at IS NULL OR our.expires_at > NOW())`,
      [userId, orgId]
    )
    return result.rows[0]?.max_level || 0
  } catch (error) {
    console.error('Error getting user highest org role level:', error)
    return 0
  }
}

// ============================================
// Role Management Functions
// ============================================

/**
 * Get all roles in an organization
 */
export async function getOrgRoles(orgId: string): Promise<OrganizationRole[]> {
  try {
    const result = await query(
      'SELECT * FROM organization_roles WHERE organization_id = $1 AND is_active = TRUE ORDER BY level DESC',
      [orgId]
    )
    return result.rows
  } catch (error) {
    console.error('Error getting org roles:', error)
    return []
  }
}

/**
 * Get role by ID
 */
export async function getOrgRoleById(roleId: string): Promise<OrganizationRole | null> {
  try {
    const result = await query(
      'SELECT * FROM organization_roles WHERE id = $1',
      [roleId]
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('Error getting org role:', error)
    return null
  }
}

/**
 * Get role with all its permissions
 */
export async function getOrgRoleWithPermissions(
  roleId: string
): Promise<OrganizationRoleWithPermissions | null> {
  try {
    const role = await getOrgRoleById(roleId)
    if (!role) return null

    const permissionsResult = await query(
      `SELECT p.*
       FROM organization_role_permissions orp
       JOIN organization_permissions p ON orp.permission_id = p.id
       WHERE orp.role_id = $1
       ORDER BY p.category, p.name`,
      [roleId]
    )

    return {
      ...role,
      permissions: permissionsResult.rows
    }
  } catch (error) {
    console.error('Error getting org role with permissions:', error)
    return null
  }
}

/**
 * Create a custom organization role
 */
export async function createOrgRole(
  orgId: string,
  name: string,
  displayName: string,
  description: string,
  level: number,
  createdBy: string
): Promise<{ success: boolean; role?: OrganizationRole; error?: string }> {
  try {
    return await transaction(async (client) => {
      // Check if role name already exists in this org
      const existing = await client.query(
        'SELECT id FROM organization_roles WHERE organization_id = $1 AND name = $2',
        [orgId, name]
      )
      if (existing.rows.length > 0) {
        return { success: false, error: 'Role with this name already exists in this organization' }
      }

      // Check if level already exists in this org
      const levelExists = await client.query(
        'SELECT id FROM organization_roles WHERE organization_id = $1 AND level = $2',
        [orgId, level]
      )
      if (levelExists.rows.length > 0) {
        return {
          success: false,
          error: 'Role with this level already exists in this organization'
        }
      }

      // Prevent creating roles with level >= 100 (reserved for super_admin)
      if (level >= 100) {
        return {
          success: false,
          error: 'Role level 100 and above are reserved for super admin'
        }
      }

      const result = await client.query(
        `INSERT INTO organization_roles (organization_id, name, display_name, description, level, is_system, created_by)
         VALUES ($1, $2, $3, $4, $5, FALSE, $6)
         RETURNING *`,
        [orgId, name, displayName, description, level, createdBy]
      )

      return { success: true, role: result.rows[0] }
    })
  } catch (error) {
    console.error('Error creating org role:', error)
    return { success: false, error: 'Failed to create organization role' }
  }
}

/**
 * Update an organization role
 */
export async function updateOrgRole(
  roleId: string,
  displayName: string,
  description: string
): Promise<{ success: boolean; role?: OrganizationRole; error?: string }> {
  try {
    return await transaction(async (client) => {
      // Check if role exists and is not a system role
      const roleCheck = await client.query(
        'SELECT is_system FROM organization_roles WHERE id = $1',
        [roleId]
      )

      if (roleCheck.rows.length === 0) {
        return { success: false, error: 'Role not found' }
      }

      // Allow updating display_name and description for system roles
      // but prevent changing name and level

      const result = await client.query(
        `UPDATE organization_roles
         SET display_name = $1, description = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [displayName, description, roleId]
      )

      return { success: true, role: result.rows[0] }
    })
  } catch (error) {
    console.error('Error updating org role:', error)
    return { success: false, error: 'Failed to update organization role' }
  }
}

/**
 * Delete an organization role (only custom roles)
 */
export async function deleteOrgRole(
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await transaction(async (client) => {
      // Check if role exists and is not a system role
      const roleCheck = await client.query(
        'SELECT is_system FROM organization_roles WHERE id = $1',
        [roleId]
      )

      if (roleCheck.rows.length === 0) {
        return { success: false, error: 'Role not found' }
      }

      if (roleCheck.rows[0].is_system) {
        return { success: false, error: 'Cannot delete system roles' }
      }

      // Check if role is assigned to any users
      const usersWithRole = await client.query(
        'SELECT COUNT(*) as count FROM organization_user_roles WHERE role_id = $1 AND is_active = TRUE',
        [roleId]
      )

      if (parseInt(usersWithRole.rows[0].count) > 0) {
        return {
          success: false,
          error: 'Cannot delete role that is assigned to users. Remove role from all users first.'
        }
      }

      // Soft delete: mark as inactive
      await client.query(
        'UPDATE organization_roles SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
        [roleId]
      )

      return { success: true }
    })
  } catch (error) {
    console.error('Error deleting org role:', error)
    return { success: false, error: 'Failed to delete organization role' }
  }
}

// ============================================
// Permission Management Functions
// ============================================

/**
 * Get all permissions in an organization
 */
export async function getOrgPermissions(orgId: string): Promise<OrganizationPermission[]> {
  try {
    const result = await query(
      'SELECT * FROM organization_permissions WHERE organization_id = $1 ORDER BY category, resource, action',
      [orgId]
    )
    return result.rows
  } catch (error) {
    console.error('Error getting org permissions:', error)
    return []
  }
}

/**
 * Get permissions by category in an organization
 */
export async function getOrgPermissionsByCategory(
  orgId: string,
  category: string
): Promise<OrganizationPermission[]> {
  try {
    const result = await query(
      'SELECT * FROM organization_permissions WHERE organization_id = $1 AND category = $2 ORDER BY name',
      [orgId, category]
    )
    return result.rows
  } catch (error) {
    console.error('Error getting org permissions by category:', error)
    return []
  }
}

/**
 * Create a custom organization permission
 */
export async function createOrgPermission(
  orgId: string,
  name: string,
  displayName: string,
  description: string,
  category: string,
  resource: string,
  action: string,
  createdBy: string
): Promise<{ success: boolean; permission?: OrganizationPermission; error?: string }> {
  try {
    return await transaction(async (client) => {
      // Check if permission name already exists in this org
      const existing = await client.query(
        'SELECT id FROM organization_permissions WHERE organization_id = $1 AND name = $2',
        [orgId, name]
      )
      if (existing.rows.length > 0) {
        return {
          success: false,
          error: 'Permission with this name already exists in this organization'
        }
      }

      // Check if resource:action combination already exists in this org
      const resourceActionExists = await client.query(
        'SELECT id FROM organization_permissions WHERE organization_id = $1 AND resource = $2 AND action = $3',
        [orgId, resource, action]
      )
      if (resourceActionExists.rows.length > 0) {
        return {
          success: false,
          error: 'Permission with this resource:action combination already exists in this organization'
        }
      }

      const result = await client.query(
        `INSERT INTO organization_permissions (organization_id, name, display_name, description, category, resource, action, is_system, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8)
         RETURNING *`,
        [orgId, name, displayName, description, category, resource, action, createdBy]
      )

      return { success: true, permission: result.rows[0] }
    })
  } catch (error) {
    console.error('Error creating org permission:', error)
    return { success: false, error: 'Failed to create organization permission' }
  }
}

// ============================================
// Role Assignment Functions
// ============================================

/**
 * Assign role to user in organization
 */
export async function assignOrgRoleToUser(
  userId: string,
  orgId: string,
  roleId: string,
  assignedBy: string,
  expiresAt?: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    return await transaction(async (client) => {
      // Verify user is a member of the organization
      const memberCheck = await client.query(
        'SELECT id FROM organization_memberships WHERE user_id = $1 AND organization_id = $2',
        [userId, orgId]
      )

      if (memberCheck.rows.length === 0) {
        return { success: false, error: 'User is not a member of this organization' }
      }

      // Verify role belongs to this organization
      const roleCheck = await client.query(
        'SELECT id FROM organization_roles WHERE id = $1 AND organization_id = $2',
        [roleId, orgId]
      )

      if (roleCheck.rows.length === 0) {
        return { success: false, error: 'Role not found in this organization' }
      }

      // Check if user already has this role
      const existing = await client.query(
        'SELECT id FROM organization_user_roles WHERE user_id = $1 AND organization_id = $2 AND role_id = $3',
        [userId, orgId, roleId]
      )

      if (existing.rows.length > 0) {
        return { success: false, error: 'User already has this role' }
      }

      // Assign role
      await client.query(
        `INSERT INTO organization_user_roles (user_id, organization_id, role_id, assigned_by, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, orgId, roleId, assignedBy, expiresAt]
      )

      return { success: true }
    })
  } catch (error) {
    console.error('Error assigning org role:', error)
    return { success: false, error: 'Failed to assign organization role' }
  }
}

/**
 * Remove role from user in organization
 */
export async function removeOrgRoleFromUser(
  userId: string,
  orgId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      'DELETE FROM organization_user_roles WHERE user_id = $1 AND organization_id = $2 AND role_id = $3',
      [userId, orgId, roleId]
    )

    if (result.rowCount === 0) {
      return { success: false, error: 'User does not have this role' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error removing org role:', error)
    return { success: false, error: 'Failed to remove organization role' }
  }
}

// ============================================
// Permission Assignment to Roles
// ============================================

/**
 * Assign permission to role
 */
export async function assignPermissionToOrgRole(
  roleId: string,
  permissionId: string,
  grantedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await transaction(async (client) => {
      // Check if permission already assigned
      const existing = await client.query(
        'SELECT id FROM organization_role_permissions WHERE role_id = $1 AND permission_id = $2',
        [roleId, permissionId]
      )

      if (existing.rows.length > 0) {
        return { success: false, error: 'Role already has this permission' }
      }

      // Verify role and permission belong to same organization
      const orgCheck = await client.query(
        `SELECT r.organization_id as role_org, p.organization_id as perm_org
         FROM organization_roles r, organization_permissions p
         WHERE r.id = $1 AND p.id = $2`,
        [roleId, permissionId]
      )

      if (orgCheck.rows.length === 0) {
        return { success: false, error: 'Role or permission not found' }
      }

      if (orgCheck.rows[0].role_org !== orgCheck.rows[0].perm_org) {
        return { success: false, error: 'Role and permission must belong to the same organization' }
      }

      await client.query(
        'INSERT INTO organization_role_permissions (role_id, permission_id, granted_by) VALUES ($1, $2, $3)',
        [roleId, permissionId, grantedBy]
      )

      return { success: true }
    })
  } catch (error) {
    console.error('Error assigning permission to org role:', error)
    return { success: false, error: 'Failed to assign permission' }
  }
}

/**
 * Remove permission from role
 */
export async function removePermissionFromOrgRole(
  roleId: string,
  permissionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      'DELETE FROM organization_role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permissionId]
    )

    if (result.rowCount === 0) {
      return { success: false, error: 'Role does not have this permission' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error removing permission from org role:', error)
    return { success: false, error: 'Failed to remove permission' }
  }
}

/**
 * Update all permissions for a role
 */
export async function updateOrgRolePermissions(
  roleId: string,
  permissionIds: string[],
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await transaction(async (client) => {
      // Remove all existing permissions
      await client.query('DELETE FROM organization_role_permissions WHERE role_id = $1', [roleId])

      // Add new permissions
      for (const permissionId of permissionIds) {
        await client.query(
          'INSERT INTO organization_role_permissions (role_id, permission_id, granted_by) VALUES ($1, $2, $3)',
          [roleId, permissionId, updatedBy]
        )
      }

      return { success: true }
    })
  } catch (error) {
    console.error('Error updating org role permissions:', error)
    return { success: false, error: 'Failed to update role permissions' }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if user can manage roles in an organization
 * User must have 'org:roles:write' permission
 */
export async function canManageOrgRoles(userId: string, orgId: string): Promise<boolean> {
  return await userHasOrgPermission(userId, orgId, 'org:roles:write')
}

/**
 * Check if user can assign a specific role in an organization
 * User can only assign roles with level lower than their highest role
 */
export async function canAssignOrgRole(
  assignerId: string,
  orgId: string,
  targetRoleId: string
): Promise<boolean> {
  try {
    // Get assigner's highest role level in this org
    const assignerMaxLevel = await getUserHighestOrgRoleLevel(assignerId, orgId)

    // Get target role level
    const targetRole = await getOrgRoleById(targetRoleId)
    if (!targetRole) return false

    const targetLevel = targetRole.level

    // Assigner must have higher level than target role
    return assignerMaxLevel > targetLevel
  } catch (error) {
    console.error('Error checking org role assignment permission:', error)
    return false
  }
}
