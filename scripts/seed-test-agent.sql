-- Insert a test agent deployment for OgenticAI organization
-- This will make the agent visible in the Zashboard UI

-- First, let's find the organization ID for OgenticAI
DO $$
DECLARE
  v_org_id VARCHAR(255);
  v_deployment_id VARCHAR(255);
  v_slack_id VARCHAR(255);
  v_config_id VARCHAR(255);
BEGIN
  -- Get the organization ID
  SELECT id INTO v_org_id FROM organizations WHERE slug LIKE '%ogentical%' OR name LIKE '%OgenticAI%' LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Organization not found. Please check organization name.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found organization: %', v_org_id;

  -- Generate IDs
  v_deployment_id := 'deploy_test_' || substr(md5(random()::text), 1, 16);
  v_slack_id := 'slack_test_' || substr(md5(random()::text), 1, 16);
  v_config_id := 'config_test_' || substr(md5(random()::text), 1, 16);

  -- Insert agent deployment
  INSERT INTO agent_deployments (
    id, organization_id, employed_agent_id, agent_type, status,
    config, deployed_at, created_at, updated_at
  ) VALUES (
    v_deployment_id,
    v_org_id,
    'employed_agent_test_001',
    'slack_knowledge_assistant',
    'active',
    '{"documentCount": 5, "knowledgeSources": ["Company Handbook.pdf", "HR Policies.pdf", "Engineering Guide.pdf", "Sales Playbook.pdf", "Product Specs.pdf"]}',
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created deployment: %', v_deployment_id;

  -- Insert Slack workspace connection
  INSERT INTO agent_slack_workspaces (
    id, agent_deployment_id, slack_team_id, slack_team_name,
    bot_token, bot_user_id, scopes, installed_at, is_active
  ) VALUES (
    v_slack_id,
    v_deployment_id,
    'T12345TEST',
    'OgenticAI Workspace',
    'xoxb-test-token-encrypted',
    'U12345BOT',
    ARRAY['app_mentions:read', 'chat:write', 'im:history', 'channels:history'],
    NOW(),
    true
  );

  RAISE NOTICE 'Created Slack workspace: %', v_slack_id;

  -- Insert agent configuration
  INSERT INTO agent_configurations (
    id, agent_deployment_id, system_prompt, response_tone,
    enable_emoji, escalation_channel, created_at, updated_at
  ) VALUES (
    v_config_id,
    v_deployment_id,
    'Always be helpful and cite sources from our company knowledge base.',
    'professional',
    true,
    '#help-desk',
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Created configuration: %', v_config_id;

  -- Insert some sample knowledge base entries
  INSERT INTO agent_knowledge_base (
    id, agent_deployment_id, source_type, title, content,
    metadata, created_at, created_by
  ) VALUES
  (
    'kb_test_1_' || substr(md5(random()::text), 1, 16),
    v_deployment_id,
    'upload',
    'Company Handbook.pdf',
    'Welcome to OgenticAI! Our company values innovation, collaboration, and excellence. We offer competitive benefits including unlimited PTO, comprehensive health insurance, and professional development opportunities.',
    '{"originalFileName": "Company Handbook.pdf", "fileSize": 245678, "fileType": "application/pdf"}',
    NOW(),
    'test_user'
  ),
  (
    'kb_test_2_' || substr(md5(random()::text), 1, 16),
    v_deployment_id,
    'upload',
    'HR Policies.pdf',
    'PTO Policy: All employees receive 20 days of paid time off per year. PTO accrues monthly and can be used for vacation, sick days, or personal time. No rollover limit applies.',
    '{"originalFileName": "HR Policies.pdf", "fileSize": 189234, "fileType": "application/pdf"}',
    NOW(),
    'test_user'
  ),
  (
    'kb_test_3_' || substr(md5(random()::text), 1, 16),
    v_deployment_id,
    'upload',
    'Engineering Guide.pdf',
    'Development Environment Setup: Clone the repository, install dependencies with npm install, configure environment variables, and run npm run dev to start the development server.',
    '{"originalFileName": "Engineering Guide.pdf", "fileSize": 312456, "fileType": "application/pdf"}',
    NOW(),
    'test_user'
  );

  -- Insert some sample executions for analytics
  INSERT INTO agent_executions (
    id, agent_deployment_id, execution_type, input_text, output_text,
    context_retrieved, tokens_used, duration_ms, status, executed_at
  ) VALUES
  (
    'exec_1_' || substr(md5(random()::text), 1, 16),
    v_deployment_id,
    'slack_message',
    'What is our PTO policy?',
    'Based on the HR Policies document: All employees receive 20 days of paid time off per year. PTO accrues monthly and can be used for vacation, sick days, or personal time. No rollover limit applies.',
    '["HR Policies.pdf"]',
    245,
    1234,
    'success',
    NOW() - INTERVAL '2 hours'
  ),
  (
    'exec_2_' || substr(md5(random()::text), 1, 16),
    v_deployment_id,
    'slack_message',
    'How do I set up my development environment?',
    'Based on the Engineering Guide: Clone the repository, install dependencies with npm install, configure environment variables, and run npm run dev to start the development server.',
    '["Engineering Guide.pdf"]',
    198,
    987,
    'success',
    NOW() - INTERVAL '1 hour'
  ),
  (
    'exec_3_' || substr(md5(random()::text), 1, 16),
    v_deployment_id,
    'slack_message',
    'What benefits do we offer?',
    'According to the Company Handbook: We offer competitive benefits including unlimited PTO, comprehensive health insurance, and professional development opportunities.',
    '["Company Handbook.pdf"]',
    212,
    1098,
    'success',
    NOW() - INTERVAL '30 minutes'
  );

  RAISE NOTICE 'Test agent deployment created successfully!';
  RAISE NOTICE 'Refresh your Zashboard organization page to see the agent.';
END $$;
