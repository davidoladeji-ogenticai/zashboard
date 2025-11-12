-- System AI Configuration Migration
-- Adds system-wide AI configuration that platform admins can set
-- Organization configs override system config when present
-- Migration Version: 004

-- ============================================
-- PART 1: Create System AI Config Table
-- ============================================

CREATE TABLE IF NOT EXISTS system_ai_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  welcome_messages JSONB NOT NULL DEFAULT '["What''s the most urgent thing I should handle now?", "Summarize the last team Slack thread", "What''s one task in my mail I can finish in 10 minutes?"]'::jsonb,
  welcome_title VARCHAR(255) DEFAULT 'Welcome to AI Assistant',
  welcome_description TEXT DEFAULT 'Your intelligent productivity companion',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_system_ai_config_enabled ON system_ai_config(enabled);
CREATE INDEX IF NOT EXISTS idx_system_ai_config_created_by ON system_ai_config(created_by);

-- Add constraint to ensure exactly 3 welcome messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_system_welcome_messages_count'
  ) THEN
    ALTER TABLE system_ai_config
      ADD CONSTRAINT check_system_welcome_messages_count
      CHECK (jsonb_array_length(welcome_messages) = 3);
  END IF;
END $$;

-- Ensure only one row exists (singleton pattern)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'system_ai_config_singleton'
  ) THEN
    ALTER TABLE system_ai_config
      ADD CONSTRAINT system_ai_config_singleton
      CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid);
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE system_ai_config IS 'System-wide AI Assistant configuration (singleton) - platform admins only';

-- ============================================
-- PART 2: Create Trigger for Updated At
-- ============================================

DROP TRIGGER IF EXISTS update_system_ai_config_updated_at ON system_ai_config;
CREATE TRIGGER update_system_ai_config_updated_at
  BEFORE UPDATE ON system_ai_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PART 3: Insert Default System Configuration
-- ============================================

-- Insert default system-wide AI config (singleton with fixed UUID)
INSERT INTO system_ai_config (
  id,
  welcome_messages,
  welcome_title,
  welcome_description,
  enabled
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '["What''s the most urgent thing I should handle now?", "Summarize the last team Slack thread", "What''s one task in my mail I can finish in 10 minutes?"]'::jsonb,
  'Welcome to AI Assistant',
  'Your intelligent productivity companion',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PART 4: Migration Complete
-- ============================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 004: System AI Config completed successfully';
END $$;
