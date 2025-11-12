/**
 * RBAC (Role-Based Access Control) Functions
 *
 * Provides comprehensive role and permission management functionality
 * for the Zashboard application.
 */

import { query, transaction } from './index'

// ============================================
// Type Definitions
// ============================================

export interface Role {
  id: string
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

export interface Permission {
  id: string
  name: string
  display_name: string
  description: string | null
  category: string
  resource: string
  action: string
  is_system: boolean
  created_at: Date
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_at: Date
  assigned_by: string | null
  expires_at: Date | null
  is_active: boolean
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

export interface UserWithRoles {
  id: string
  email: string
  name: string
  registration_source: 'zing' | 'web'
  roles: Role[]
  permissions: Permission[]
}

// ============================================
// Permission Checking Functions
// ============================================

/**
 * Check if a user has a specific permission
 */
export async function userHasPermission(
  userId: string,
  permissionName: string
): Promise<boolean> {
  try {
    const result = await query(
      'SELECT user_has_permission($1, $2) as has_permission',
      [userId, permissionName]
    )
    return result.rows[0]?.has_permission || false
  } catch (error) {
    console.error('Error checking user permission:', error)
    return false
  }
}

/**
 * Check if a user has a specific role
 */
export async function userHasRole(userId: string, roleName: string): Promise<boolean> {
  try {
    const result = await query(
      `SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1
          AND r.name = $2
          AND ur.is_active = TRUE
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
      ) as has_role`,
      [userId, roleName]
    )
    return result.rows[0]?.has_role || false
  } catch (error) {
    console.error('Error checking user role:', error)
    return false
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  try {
    const result = await query(
      `SELECT * FROM get_user_permissions($1)`,
      [userId]
    )
    return result.rows
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string): Promise<Role[]> {
  try {
    const result = await query(
      `SELECT DISTINCT r.*
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1
         AND ur.is_active = TRUE
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
       ORDER BY r.level DESC`,
      [userId]
    )
    return result.rows
  } catch (error) {
    console.error('Error getting user roles:', error)
    return []
  }
}

/**
 * Get user with all their roles and permissions
 */
export async function getUserWithRolesAndPermissions(userId: string): Promise<UserWithRoles | null> {
  try {
    const userResult = await query(
      'SELECT id, email, name, registration_source FROM users WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return null
    }

    const user = userResult.rows[0]
    const roles = await getUserRoles(userId)
    const permissions = await getUserPermissions(userId)

    return {
      ...user,
      roles,
      permissions
    }
  } catch (error) {
    console.error('Error getting user with roles:', error)
    return null
  }
}

// ============================================
// Role Management Functions
// ============================================

/**
 * Get all roles
 */
export async function getAllRoles(): Promise<Role[]> {
  try {
    const result = await query(
      'SELECT * FROM roles WHERE is_active = TRUE ORDER BY level DESC'
    )
    return result.rows
  } catch (error) {
    console.error('Error getting all roles:', error)
    return []
  }
}

/**
 * Get role by ID
 */
export async function getRoleById(roleId: string): Promise<Role | null> {
  try {
    const result = await query(
      'SELECT * FROM roles WHERE id = $1',
      [roleId]
    )
    return result.rows[0] || null
  } catch (error) {
    console.error('Error getting role:', error)
    return null
  }
}

/**
 * Get role with all its permissions
 */
export async function getRoleWithPermissions(roleId: string): Promise<RoleWithPermissions | null> {
  try {
    const role = await getRoleById(roleId)
    if (!role) return null

    const permissionsResult = await query(
      `SELECT p.*
       FROM role_permissions rp
       JOIN permissions p ON rp.permission_id = p.id
       WHERE rp.role_id = $1
       ORDER BY p.category, p.name`,
      [roleId]
    )

    return {
      ...role,
      permissions: permissionsResult.rows
    }
  } catch (error) {
    console.error('Error getting role with permissions:', error)
    return null
  }
}

/**
 * Create a custom role
 */
export async function createRole(
  name: string,
  displayName: string,
  description: string,
  level: number,
  createdBy: string
): Promise<{ success: boolean; role?: Role; error?: string }> {
  try {
    return await transaction(async (client) => {
      // Check if role name already exists
      const existing = await client.query('SELECT id FROM roles WHERE name = $1', [name])
      if (existing.rows.length > 0) {
        return { success: false, error: 'Role with this name already exists' }
      }

      // Check if level already exists
      const levelExists = await client.query('SELECT id FROM roles WHERE level = $1', [level])
      if (levelExists.rows.length > 0) {
        return { success: false, error: 'Role with this level already exists' }
      }

      const result = await client.query(
        `INSERT INTO roles (name, display_name, description, level, is_system, created_by)
         VALUES ($1, $2, $3, $4, FALSE, $5)
         RETURNING *`,
        [name, displayName, description, level, createdBy]
      )

      return { success: true, role: result.rows[0] }
    })
  } catch (error) {
    console.error('Error creating role:', error)
    return { success: false, error: 'Failed to create role' }
  }
}

// ============================================
// Permission Management Functions
// ============================================

/**
 * Get all permissions
 */
export async function getAllPermissions(): Promise<Permission[]> {
  try {
    const result = await query(
      'SELECT * FROM permissions ORDER BY category, resource, action'
    )
    return result.rows
  } catch (error) {
    console.error('Error getting all permissions:', error)
    return []
  }
}

/**
 * Get permissions by category
 */
export async function getPermissionsByCategory(category: string): Promise<Permission[]> {
  try {
    const result = await query(
      'SELECT * FROM permissions WHERE category = $1 ORDER BY name',
      [category]
    )
    return result.rows
  } catch (error) {
    console.error('Error getting permissions by category:', error)
    return []
  }
}

/**
 * Create a custom permission
 */
export async function createPermission(
  name: string,
  displayName: string,
  description: string,
  category: string,
  resource: string,
  action: string
): Promise<{ success: boolean; permission?: Permission; error?: string }> {
  try {
    return await transaction(async (client) => {
      // Check if permission name already exists
      const existing = await client.query('SELECT id FROM permissions WHERE name = $1', [name])
      if (existing.rows.length > 0) {
        return { success: false, error: 'Permission with this name already exists' }
      }

      // Check if resource:action combination already exists
      const resourceActionExists = await client.query(
        'SELECT id FROM permissions WHERE resource = $1 AND action = $2',
        [resource, action]
      )
      if (resourceActionExists.rows.length > 0) {
        return {
          success: false,
          error: 'Permission with this resource:action combination already exists'
        }
      }

      const result = await client.query(
        `INSERT INTO permissions (name, display_name, description, category, resource, action, is_system)
         VALUES ($1, $2, $3, $4, $5, $6, FALSE)
         RETURNING *`,
        [name, displayName, description, category, resource, action]
      )

      return { success: true, permission: result.rows[0] }
    })
  } catch (error) {
    console.error('Error creating permission:', error)
    return { success: false, error: 'Failed to create permission' }
  }
}

// ============================================
// Role Assignment Functions
// ============================================

/**
 * Assign role to user
 */
export async function assignRoleToUser(
  userId: string,
  roleId: string,
  assignedBy: string,
  expiresAt?: Date
): Promise<{ success: boolean; error?: string }> {
  try {
    return await transaction(async (client) => {
      // Get user's registration source
      const userResult = await client.query(
        'SELECT registration_source FROM users WHERE id = $1',
        [userId]
      )

      if (userResult.rows.length === 0) {
        return { success: false, error: 'User not found' }
      }

      const registrationSource = userResult.rows[0].registration_source

      // Get role level
      const roleResult = await client.query(
        'SELECT level FROM roles WHERE id = $1',
        [roleId]
      )

      if (roleResult.rows.length === 0) {
        return { success: false, error: 'Role not found' }
      }

      const roleLevel = roleResult.rows[0].level

      // Enforce: Zing users cannot be admins (level >= 90)
      if (registrationSource === 'zing' && roleLevel >= 90) {
        return {
          success: false,
          error: 'Users registered via Zing Browser cannot be assigned administrator roles'
        }
      }

      // Check if user already has this role
      const existing = await client.query(
        'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
        [userId, roleId]
      )

      if (existing.rows.length > 0) {
        return { success: false, error: 'User already has this role' }
      }

      // Assign role
      await client.query(
        `INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [userId, roleId, assignedBy, expiresAt]
      )

      return { success: true }
    })
  } catch (error: any) {
    console.error('Error assigning role:', error)
    // Check if this is the database trigger error
    if (error.message?.includes('Zing Browser')) {
      return { success: false, error: error.message }
    }
    return { success: false, error: 'Failed to assign role' }
  }
}

/**
 * Remove role from user
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    )

    if (result.rowCount === 0) {
      return { success: false, error: 'User does not have this role' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error removing role:', error)
    return { success: false, error: 'Failed to remove role' }
  }
}

// ============================================
// Permission Assignment to Roles
// ============================================

/**
 * Assign permission to role
 */
export async function assignPermissionToRole(
  roleId: string,
  permissionId: string,
  grantedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await transaction(async (client) => {
      // Check if permission already assigned
      const existing = await client.query(
        'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
        [roleId, permissionId]
      )

      if (existing.rows.length > 0) {
        return { success: false, error: 'Role already has this permission' }
      }

      await client.query(
        'INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES ($1, $2, $3)',
        [roleId, permissionId, grantedBy]
      )

      return { success: true }
    })
  } catch (error) {
    console.error('Error assigning permission:', error)
    return { success: false, error: 'Failed to assign permission' }
  }
}

/**
 * Remove permission from role
 */
export async function removePermissionFromRole(
  roleId: string,
  permissionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await query(
      'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permissionId]
    )

    if (result.rowCount === 0) {
      return { success: false, error: 'Role does not have this permission' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error removing permission:', error)
    return { success: false, error: 'Failed to remove permission' }
  }
}

/**
 * Update all permissions for a role
 */
export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[],
  updatedBy: string
): Promise<{ success: boolean; error?: string }> {
  try {
    return await transaction(async (client) => {
      // Remove all existing permissions
      await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId])

      // Add new permissions
      for (const permissionId of permissionIds) {
        await client.query(
          'INSERT INTO role_permissions (role_id, permission_id, granted_by) VALUES ($1, $2, $3)',
          [roleId, permissionId, updatedBy]
        )
      }

      return { success: true }
    })
  } catch (error) {
    console.error('Error updating role permissions:', error)
    return { success: false, error: 'Failed to update role permissions' }
  }
}

// ============================================
// Audit Log Functions
// ============================================

export interface AuditLogEntry {
  id: string
  user_id: string | null
  action: string
  target_user_id: string | null
  target_role_id: string | null
  target_permission_id: string | null
  details: Record<string, any>
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

/**
 * Get audit log entries
 */
export async function getAuditLog(
  limit: number = 100,
  offset: number = 0
): Promise<AuditLogEntry[]> {
  try {
    const result = await query(
      'SELECT * FROM audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    )
    return result.rows
  } catch (error) {
    console.error('Error getting audit log:', error)
    return []
  }
}

/**
 * Get audit log for specific user
 */
export async function getUserAuditLog(
  userId: string,
  limit: number = 50
): Promise<AuditLogEntry[]> {
  try {
    const result = await query(
      `SELECT * FROM audit_log
       WHERE target_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    )
    return result.rows
  } catch (error) {
    console.error('Error getting user audit log:', error)
    return []
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if user can assign a specific role
 * Users can only assign roles with level lower than their highest role
 */
export async function canAssignRole(
  assignerId: string,
  targetRoleId: string
): Promise<boolean> {
  try {
    // Get assigner's highest role level
    const assignerRoles = await query(
      `SELECT MAX(r.level) as max_level
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1
         AND ur.is_active = TRUE`,
      [assignerId]
    )

    const assignerMaxLevel = assignerRoles.rows[0]?.max_level || 0

    // Get target role level
    const targetRole = await query(
      'SELECT level FROM roles WHERE id = $1',
      [targetRoleId]
    )

    const targetLevel = targetRole.rows[0]?.level || 0

    // Assigner must have higher level than target role
    return assignerMaxLevel > targetLevel
  } catch (error) {
    console.error('Error checking role assignment permission:', error)
    return false
  }
}

/**
 * Get registration source badge emoji
 */
export function getRegistrationSourceBadge(source: 'zing' | 'dashboard' | 'zashboard.ai'): string {
  switch (source) {
    case 'zing':
      return '🦊'
    case 'dashboard':
      return '🖥️'
    case 'zashboard.ai':
      return '🌐'
    default:
      return '❓'
  }
}
