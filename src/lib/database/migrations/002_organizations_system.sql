-- Organizations System Migration
-- Adds multi-organization support with teams, spaces, and AI configuration
-- Migration Version: 002

-- ============================================
-- PART 1: Create Organizations Table
-- ============================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  website VARCHAR(255),
  industry VARCHAR(100),
  size VARCHAR(50) CHECK (size IN ('small', 'medium', 'large', 'enterprise')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created_at ON organizations(created_at);

-- Add comment
COMMENT ON TABLE organizations IS 'Organizations that users can belong to';

-- ============================================
-- PART 2: Create Organization Memberships Table
-- ============================================

-- Organization memberships (many-to-many: users <-> organizations)
CREATE TABLE IF NOT EXISTS organization_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  title VARCHAR(100),
  department VARCHAR(100),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role ON organization_memberships(role);
CREATE INDEX IF NOT EXISTS idx_org_memberships_last_accessed ON organization_memberships(last_accessed_at);

-- Add comment
COMMENT ON TABLE organization_memberships IS 'User memberships in organizations with roles';

-- ============================================
-- PART 3: Create Teams Table
-- ============================================

-- Teams within organizations
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_org ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_teams_created_at ON teams(created_at);

-- Add comment
COMMENT ON TABLE teams IS 'Teams within organizations';

-- ============================================
-- PART 4: Create Team Members Table
-- ============================================

-- Team memberships
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'lead', 'admin')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);

-- Add comment
COMMENT ON TABLE team_members IS 'User memberships in teams with roles';

-- ============================================
-- PART 5: Create Organization Spaces Table
-- ============================================

-- Link Zing spaces to organizations
CREATE TABLE IF NOT EXISTS organization_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  space_id VARCHAR(255) NOT NULL,
  profile_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, space_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_spaces_org ON organization_spaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_spaces_space ON organization_spaces(space_id);

-- Add comment
COMMENT ON TABLE organization_spaces IS 'Links Zing Browser spaces to organizations';

-- ============================================
-- PART 6: Create Organization AI Configs Table
-- ============================================

-- AI Assistant configuration per organization
CREATE TABLE IF NOT EXISTS organization_ai_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  welcome_messages JSONB NOT NULL DEFAULT '["What''s the most urgent thing I should handle now?", "Summarize the last team Slack thread", "What''s one task in my mail I can finish in 10 minutes?"]'::jsonb,
  welcome_title VARCHAR(255),
  welcome_description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_org_ai_configs_org ON organization_ai_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_ai_configs_enabled ON organization_ai_configs(enabled);

-- Add constraint to ensure exactly 3 welcome messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_welcome_messages_count'
  ) THEN
    ALTER TABLE organization_ai_configs
      ADD CONSTRAINT check_welcome_messages_count
      CHECK (jsonb_array_length(welcome_messages) = 3);
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE organization_ai_configs IS 'AI Assistant configuration per organization';

-- ============================================
-- PART 7: Create User Preferences Table
-- ============================================

-- User preferences including active organization
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  active_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  org_space_preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_prefs_user ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_active_org ON user_preferences(active_organization_id);

-- Add comment
COMMENT ON TABLE user_preferences IS 'User preferences including active organization selection';

-- ============================================
-- PART 8: Create Triggers for updated_at
-- ============================================

-- Create or replace trigger function (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_ai_configs_updated_at ON organization_ai_configs;
CREATE TRIGGER update_org_ai_configs_updated_at
  BEFORE UPDATE ON organization_ai_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_prefs_updated_at ON user_preferences;
CREATE TRIGGER update_user_prefs_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 9: Insert Default Test Data (Optional)
-- ============================================

-- Create a default organization for testing
INSERT INTO organizations (name, slug, description, size)
VALUES
  ('OgenticAI', 'ogentic-ai', 'AI-powered browser and productivity tools', 'medium')
ON CONFLICT (slug) DO NOTHING;

-- Get the organization ID (for reference)
-- You can manually add users to this organization via:
-- INSERT INTO organization_memberships (user_id, organization_id, role)
-- VALUES ('user-uuid-here', 'org-uuid-here', 'super_admin');
