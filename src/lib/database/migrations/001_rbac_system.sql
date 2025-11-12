-- RBAC System Migration
-- Adds comprehensive Role-Based Access Control to Zashboard
-- Migration Version: 001

-- ============================================
-- PART 1: Update Users Table
-- ============================================

-- Add registration source and metadata columns
ALTER TABLE users
ADD COLUMN IF NOT EXISTS registration_source VARCHAR(50)
    CHECK (registration_source IN ('zing', 'web'))
    DEFAULT 'web',
ADD COLUMN IF NOT EXISTS source_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS registration_ip INET,
ADD COLUMN IF NOT EXISTS registration_user_agent TEXT;

-- Update existing users to have web source
UPDATE users SET registration_source = 'web' WHERE registration_source IS NULL;

-- Add index for registration source
CREATE INDEX IF NOT EXISTS idx_users_registration_source ON users(registration_source);

-- ============================================
-- PART 2: Create Roles Table
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    level INTEGER NOT NULL, -- Hierarchy: 100=super_admin, 90=admin, 50=analyst, 30=viewer, 10=user
    is_system BOOLEAN DEFAULT FALSE, -- System roles cannot be deleted
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    CONSTRAINT unique_role_name UNIQUE(name),
    CONSTRAINT unique_role_level UNIQUE(level)
);

-- ============================================
-- PART 3: Create Permissions Table
-- ============================================

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL, -- Format: resource:action (e.g., users:read)
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- users, analytics, system, settings, roles, permissions
    resource VARCHAR(50) NOT NULL, -- users, analytics, roles, etc.
    action VARCHAR(50) NOT NULL, -- read, write, delete, export, manage
    is_system BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_permission_name UNIQUE(name),
    CONSTRAINT unique_resource_action UNIQUE(resource, action)
);

-- ============================================
-- PART 4: Create Role-Permission Junction Table
-- ============================================

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),

    CONSTRAINT unique_role_permission UNIQUE(role_id, permission_id)
);

-- ============================================
-- PART 5: Create User-Role Junction Table
-- ============================================

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL = permanent
    is_active BOOLEAN DEFAULT TRUE,

    CONSTRAINT unique_user_role UNIQUE(user_id, role_id)
);

-- ============================================
-- PART 6: Create Audit Log Table
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- role_assigned, role_removed, permission_granted, etc.
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    target_permission_id UUID REFERENCES permissions(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 7: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);

CREATE INDEX IF NOT EXISTS idx_permissions_category ON permissions(category);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ============================================
-- PART 8: Insert Predefined Roles
-- ============================================

INSERT INTO roles (name, display_name, description, level, is_system, created_at) VALUES
('super_admin', 'Super Administrator', 'Full system access with all permissions', 100, TRUE, NOW()),
('admin', 'Administrator', 'Full access to user management and analytics', 90, TRUE, NOW()),
('analyst', 'Analyst', 'Read access to analytics and reports', 50, TRUE, NOW()),
('viewer', 'Viewer', 'Read-only access to dashboards', 30, TRUE, NOW()),
('user', 'User', 'Basic user access', 10, TRUE, NOW())
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PART 9: Insert Predefined Permissions
-- ============================================

-- Users permissions
INSERT INTO permissions (name, display_name, description, category, resource, action) VALUES
('users:read', 'View Users', 'View user list and details', 'users', 'users', 'read'),
('users:write', 'Create/Edit Users', 'Create and edit user accounts', 'users', 'users', 'write'),
('users:delete', 'Delete Users', 'Delete user accounts', 'users', 'users', 'delete'),
('users:manage', 'Manage Users', 'Full user management including role assignment', 'users', 'users', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Analytics permissions
INSERT INTO permissions (name, display_name, description, category, resource, action) VALUES
('analytics:read', 'View Analytics', 'View analytics dashboards and reports', 'analytics', 'analytics', 'read'),
('analytics:write', 'Edit Analytics', 'Modify analytics configurations', 'analytics', 'analytics', 'write'),
('analytics:export', 'Export Analytics', 'Export analytics data', 'analytics', 'analytics', 'export')
ON CONFLICT (name) DO NOTHING;

-- Roles permissions
INSERT INTO permissions (name, display_name, description, category, resource, action) VALUES
('roles:read', 'View Roles', 'View roles and permissions', 'roles', 'roles', 'read'),
('roles:write', 'Create/Edit Roles', 'Create and edit custom roles', 'roles', 'roles', 'write'),
('roles:delete', 'Delete Roles', 'Delete custom roles', 'roles', 'roles', 'delete'),
('roles:assign', 'Assign Roles', 'Assign roles to users', 'roles', 'roles', 'assign')
ON CONFLICT (name) DO NOTHING;

-- Permissions permissions
INSERT INTO permissions (name, display_name, description, category, resource, action) VALUES
('permissions:read', 'View Permissions', 'View permission list', 'permissions', 'permissions', 'read'),
('permissions:manage', 'Manage Permissions', 'Assign permissions to roles', 'permissions', 'permissions', 'manage')
ON CONFLICT (name) DO NOTHING;

-- System permissions
INSERT INTO permissions (name, display_name, description, category, resource, action) VALUES
('system:read', 'View System', 'View system metrics and health', 'system', 'system', 'read'),
('system:write', 'Manage System', 'Manage system configuration', 'system', 'system', 'write')
ON CONFLICT (name) DO NOTHING;

-- Settings permissions
INSERT INTO permissions (name, display_name, description, category, resource, action) VALUES
('settings:read', 'View Settings', 'View application settings', 'settings', 'settings', 'read'),
('settings:write', 'Edit Settings', 'Edit application settings', 'settings', 'settings', 'write')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- PART 10: Assign Permissions to Roles
-- ============================================

-- Super Admin: ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin: All except super admin permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND p.name IN (
    'users:read', 'users:write', 'users:delete', 'users:manage',
    'analytics:read', 'analytics:write', 'analytics:export',
    'roles:read', 'roles:write', 'roles:assign',
    'permissions:read', 'permissions:manage',
    'system:read',
    'settings:read', 'settings:write'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Analyst: Analytics and view permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'analyst'
  AND p.name IN (
    'users:read',
    'analytics:read', 'analytics:export',
    'system:read',
    'settings:read'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Viewer: Read-only permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'viewer'
  AND p.name IN (
    'analytics:read',
    'settings:read'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User: Basic permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'user'
  AND p.name IN ('settings:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- PART 11: Create Trigger Functions
-- ============================================

-- Trigger to update updated_at on roles
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_roles_updated_at();

-- Trigger to prevent Zing users from getting admin roles
CREATE OR REPLACE FUNCTION prevent_zing_admin_role()
RETURNS TRIGGER AS $$
DECLARE
    user_source VARCHAR(50);
    role_level INTEGER;
BEGIN
    -- Get user's registration source
    SELECT registration_source INTO user_source
    FROM users
    WHERE id = NEW.user_id;

    -- Get role level
    SELECT level INTO role_level
    FROM roles
    WHERE id = NEW.role_id;

    -- Prevent Zing users from getting admin roles (level >= 90)
    IF user_source = 'zing' AND role_level >= 90 THEN
        RAISE EXCEPTION 'Users registered via Zing Browser cannot be assigned administrator roles';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_prevent_zing_admin_role
    BEFORE INSERT OR UPDATE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_zing_admin_role();

-- Trigger to create audit log entries
CREATE OR REPLACE FUNCTION log_role_assignment()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (action, target_user_id, target_role_id, details)
        VALUES ('role_assigned', NEW.user_id, NEW.role_id,
                json_build_object('assigned_by', NEW.assigned_by));
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (action, target_user_id, target_role_id, details)
        VALUES ('role_removed', OLD.user_id, OLD.role_id,
                json_build_object('removed_at', NOW()));
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_role_assignment
    AFTER INSERT OR DELETE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION log_role_assignment();

-- ============================================
-- PART 12: Utility Functions
-- ============================================

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_permission_name VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = p_user_id
          AND ur.is_active = TRUE
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND p.name = p_permission_name
    ) INTO has_perm;

    RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- Function to get all user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (
    permission_name VARCHAR,
    permission_display_name VARCHAR,
    category VARCHAR,
    role_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        p.name,
        p.display_name,
        p.category,
        r.name
    FROM user_roles ur
    JOIN roles r ON ur.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    ORDER BY p.category, p.name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 13: Comments
-- ============================================

COMMENT ON TABLE roles IS 'User roles with hierarchical levels';
COMMENT ON TABLE permissions IS 'Granular permissions using resource:action pattern';
COMMENT ON TABLE role_permissions IS 'Maps permissions to roles';
COMMENT ON TABLE user_roles IS 'Maps roles to users with audit trail';
COMMENT ON TABLE audit_log IS 'Audit trail for all role and permission changes';

COMMENT ON COLUMN users.registration_source IS 'Source of user registration: zing, web';
COMMENT ON COLUMN users.source_metadata IS 'Additional metadata about registration source';
COMMENT ON COLUMN roles.level IS 'Hierarchical level: 100=super_admin, 90=admin, 50=analyst, 30=viewer, 10=user';
COMMENT ON COLUMN permissions.name IS 'Permission identifier in resource:action format';

-- ============================================
-- PART 14: Update Schema Version
-- ============================================

INSERT INTO system_metrics (metric_name, metric_value, metric_text) VALUES
('database_schema_version', 2.0, 'RBAC system migration complete'),
('rbac_system_enabled', 1, 'Role-Based Access Control system active');
