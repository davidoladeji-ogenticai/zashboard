-- ============================================================================
-- Zashboard Database Migration: Agent Deployment System (VARCHAR-compatible)
-- Migration Version: 006
-- Purpose: Add support for deploying agents from Ogents Market
-- Note: Modified to work with VARCHAR IDs and without pgvector for now
-- ============================================================================

-- ============================================================================
-- PART 1: Agent Deployments
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_deployments (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('deploy_' || substr(md5(random()::text), 1, 20)),
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employed_agent_id VARCHAR(255) NOT NULL,
  agent_type VARCHAR(100) NOT NULL DEFAULT 'slack_knowledge_assistant',
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'paused', 'error', 'deleted')),
  config JSONB DEFAULT '{}'::jsonb,
  deployed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employed_agent_id),
  UNIQUE(organization_id, agent_type)
);

CREATE INDEX IF NOT EXISTS idx_agent_deployments_org ON agent_deployments(organization_id);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_status ON agent_deployments(status);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_type ON agent_deployments(agent_type);
CREATE INDEX IF NOT EXISTS idx_agent_deployments_employed_agent ON agent_deployments(employed_agent_id);

COMMENT ON TABLE agent_deployments IS 'Agent deployments from Ogents Market, linked to organizations';

-- ============================================================================
-- PART 2: Slack Workspace Connections
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_slack_workspaces (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('slack_' || substr(md5(random()::text), 1, 20)),
  agent_deployment_id VARCHAR(255) NOT NULL REFERENCES agent_deployments(id) ON DELETE CASCADE,
  slack_team_id VARCHAR(255) NOT NULL,
  slack_team_name VARCHAR(255) NOT NULL,
  bot_token TEXT NOT NULL,
  bot_user_id VARCHAR(255),
  scopes TEXT[] DEFAULT ARRAY[]::TEXT[],
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  installed_by TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(slack_team_id),
  UNIQUE(agent_deployment_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_slack_deployments ON agent_slack_workspaces(agent_deployment_id);
CREATE INDEX IF NOT EXISTS idx_agent_slack_team ON agent_slack_workspaces(slack_team_id);
CREATE INDEX IF NOT EXISTS idx_agent_slack_active ON agent_slack_workspaces(is_active);

COMMENT ON TABLE agent_slack_workspaces IS 'Slack workspace OAuth connections for agent deployments';

-- ============================================================================
-- PART 3: Knowledge Base (Simple version without pgvector)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_knowledge_base (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('kb_' || substr(md5(random()::text), 1, 20)),
  agent_deployment_id VARCHAR(255) NOT NULL REFERENCES agent_deployments(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL
    CHECK (source_type IN ('upload', 'confluence', 'notion', 'google-drive', 'manual')),
  source_id VARCHAR(500),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  url VARCHAR(1000),
  metadata JSONB DEFAULT '{}'::jsonb,
  access_level VARCHAR(50) DEFAULT 'all'
    CHECK (access_level IN ('all', 'admin', 'team')),
  indexed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  parent_document_id VARCHAR(255) REFERENCES agent_knowledge_base(id) ON DELETE CASCADE,
  chunk_index INTEGER
);

CREATE INDEX IF NOT EXISTS idx_knowledge_deployment ON agent_knowledge_base(agent_deployment_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON agent_knowledge_base(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_created ON agent_knowledge_base(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_parent ON agent_knowledge_base(parent_document_id) WHERE parent_document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_metadata ON agent_knowledge_base USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_knowledge_content_fts ON agent_knowledge_base USING GIN (to_tsvector('english', content));

COMMENT ON TABLE agent_knowledge_base IS 'Knowledge base documents for agent search (vector embeddings to be added later)';

-- ============================================================================
-- PART 4: Agent Configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_configurations (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('config_' || substr(md5(random()::text), 1, 20)),
  agent_deployment_id VARCHAR(255) NOT NULL UNIQUE REFERENCES agent_deployments(id) ON DELETE CASCADE,
  system_prompt TEXT,
  response_tone VARCHAR(50) DEFAULT 'professional'
    CHECK (response_tone IN ('professional', 'casual', 'technical', 'friendly')),
  enable_emoji BOOLEAN DEFAULT TRUE,
  escalation_channel VARCHAR(255),
  escalation_users TEXT[] DEFAULT ARRAY[]::TEXT[],
  usage_limit INTEGER DEFAULT 5000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_config_deployment ON agent_configurations(agent_deployment_id);

COMMENT ON TABLE agent_configurations IS 'Agent behavior configuration and customization per deployment';

-- ============================================================================
-- PART 5: Agent Execution Logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_executions (
  id VARCHAR(255) PRIMARY KEY DEFAULT ('exec_' || substr(md5(random()::text), 1, 20)),
  agent_deployment_id VARCHAR(255) NOT NULL REFERENCES agent_deployments(id) ON DELETE CASCADE,
  execution_type VARCHAR(50) NOT NULL
    CHECK (execution_type IN ('slack_query', 'knowledge_index', 'sync', 'test', 'other')),
  slack_user_id VARCHAR(255),
  slack_user_name VARCHAR(255),
  slack_channel_id VARCHAR(255),
  slack_thread_ts VARCHAR(255),
  input_data JSONB,
  output_data JSONB,
  knowledge_sources JSONB,
  was_helpful BOOLEAN,
  feedback TEXT,
  feedback_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  error_message TEXT,
  error_code VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executions_deployment ON agent_executions(agent_deployment_id);
CREATE INDEX IF NOT EXISTS idx_executions_created ON agent_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_type ON agent_executions(execution_type);
CREATE INDEX IF NOT EXISTS idx_executions_slack_user ON agent_executions(slack_user_id) WHERE slack_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_executions_helpful ON agent_executions(was_helpful) WHERE was_helpful IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_executions_errors ON agent_executions(agent_deployment_id, created_at) WHERE error_message IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_executions_recent ON agent_executions(agent_deployment_id, created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

COMMENT ON TABLE agent_executions IS 'Agent execution logs for analytics, billing, and debugging';

-- ============================================================================
-- PART 6: Triggers & Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION update_agent_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agent_deployments_updated ON agent_deployments;
CREATE TRIGGER trigger_agent_deployments_updated
  BEFORE UPDATE ON agent_deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_updated_at();

DROP TRIGGER IF EXISTS trigger_agent_config_updated ON agent_configurations;
CREATE TRIGGER trigger_agent_config_updated
  BEFORE UPDATE ON agent_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_updated_at();

-- ============================================================================
-- PART 7: Analytics Views
-- ============================================================================

CREATE OR REPLACE VIEW agent_daily_executions AS
SELECT
  agent_deployment_id,
  DATE(created_at) as execution_date,
  COUNT(*) as total_executions,
  COUNT(CASE WHEN execution_type = 'slack_query' THEN 1 END) as slack_queries,
  COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as errors,
  AVG(execution_time_ms) as avg_execution_time_ms,
  SUM(tokens_used) as total_tokens,
  SUM(cost_usd) as total_cost_usd
FROM agent_executions
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY agent_deployment_id, DATE(created_at);

COMMENT ON VIEW agent_daily_executions IS 'Daily aggregated execution metrics per agent deployment';

CREATE OR REPLACE VIEW agent_deployment_summary AS
SELECT
  ad.id as deployment_id,
  ad.organization_id,
  ad.employed_agent_id,
  ad.agent_type,
  ad.status,
  ad.deployed_at,
  o.name as organization_name,
  asw.slack_team_name,
  asw.slack_team_id,
  asw.is_active as slack_connected,
  COUNT(DISTINCT akb.id) as knowledge_docs_count,
  COUNT(DISTINCT ae.id) FILTER (WHERE ae.created_at > NOW() - INTERVAL '30 days') as executions_last_30_days,
  AVG(ae.execution_time_ms) FILTER (WHERE ae.created_at > NOW() - INTERVAL '30 days') as avg_response_time_ms,
  COUNT(ae.id) FILTER (WHERE ae.was_helpful = true AND ae.created_at > NOW() - INTERVAL '30 days') * 100.0 /
    NULLIF(COUNT(ae.id) FILTER (WHERE ae.was_helpful IS NOT NULL AND ae.created_at > NOW() - INTERVAL '30 days'), 0) as satisfaction_percentage
FROM agent_deployments ad
LEFT JOIN organizations o ON ad.organization_id = o.id
LEFT JOIN agent_slack_workspaces asw ON ad.id = asw.agent_deployment_id
LEFT JOIN agent_knowledge_base akb ON ad.id = akb.agent_deployment_id
LEFT JOIN agent_executions ae ON ad.id = ae.agent_deployment_id
GROUP BY ad.id, ad.organization_id, ad.employed_agent_id, ad.agent_type,
         ad.status, ad.deployed_at, o.name, asw.slack_team_name,
         asw.slack_team_id, asw.is_active;

COMMENT ON VIEW agent_deployment_summary IS 'Comprehensive summary of agent deployments with key metrics';

-- ============================================================================
-- PART 8: Cleanup Function
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_agent_executions(
  retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM agent_executions
  WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  INSERT INTO system_metrics (metric_name, metric_value, metric_text)
  VALUES (
    'agent_executions_cleanup',
    deleted_count,
    format('Deleted %s agent execution records older than %s days', deleted_count, retention_days)
  );

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_agent_executions IS 'Delete agent execution logs older than specified retention period';

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 006 completed successfully: Agent Deployment System';
  RAISE NOTICE 'Tables created: agent_deployments, agent_slack_workspaces, agent_knowledge_base, agent_configurations, agent_executions';
  RAISE NOTICE 'Note: Vector embeddings (pgvector) to be added in future migration';
  RAISE NOTICE 'Views created: agent_daily_executions, agent_deployment_summary';
END $$;
