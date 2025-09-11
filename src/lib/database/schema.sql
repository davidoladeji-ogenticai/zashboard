-- Zashboard Analytics Database Schema
-- PostgreSQL Database Schema for Analytics and User Management

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(50) DEFAULT 'user'
);

-- Analytics events table for storing all analytics data
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event VARCHAR(100) NOT NULL,
    user_id VARCHAR(255),
    hardware_id VARCHAR(255),
    installation_id VARCHAR(255),
    session_id VARCHAR(255),
    app_version VARCHAR(50),
    platform VARCHAR(50),
    timestamp BIGINT NOT NULL,
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User sessions table for tracking active sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- API keys table for authentication management
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_value VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- System metrics table for health monitoring
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4),
    metric_text VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tags JSONB DEFAULT '{}'
);

-- Indexes for performance optimization
CREATE INDEX idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX idx_analytics_events_event ON analytics_events(event);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_hardware_id ON analytics_events(hardware_id);
CREATE INDEX idx_analytics_events_app_version ON analytics_events(app_version);
CREATE INDEX idx_analytics_events_platform ON analytics_events(platform);
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_properties ON analytics_events USING GIN(properties);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_login ON users(last_login);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

CREATE INDEX idx_api_keys_key_value ON api_keys(key_value);
CREATE INDEX idx_api_keys_created_at ON api_keys(created_at);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

CREATE INDEX idx_system_metrics_metric_name ON system_metrics(metric_name);
CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);

-- Triggers for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to clean up old analytics events (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM analytics_events 
    WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO system_metrics (metric_name, metric_value, metric_text)
    VALUES ('cleanup_events_deleted', deleted_count, 'Cleanup job deleted old analytics events');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired user sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    INSERT INTO system_metrics (metric_name, metric_value, metric_text)
    VALUES ('cleanup_sessions_deleted', deleted_count, 'Cleanup job deleted expired sessions');
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create views for common analytics queries
CREATE VIEW user_analytics_summary AS
SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT COALESCE(hardware_id, installation_id, user_id)) as unique_users,
    COUNT(*) as total_events,
    COUNT(CASE WHEN event = 'zing_session_start' THEN 1 END) as sessions,
    COUNT(CASE WHEN event = 'zing_version_install_complete' AND properties->>'install_type' = 'fresh_install' THEN 1 END) as new_installs,
    COUNT(CASE WHEN event = 'zing_version_install_complete' AND properties->>'install_type' = 'version_update' THEN 1 END) as updates
FROM analytics_events 
GROUP BY DATE(created_at)
ORDER BY date DESC;

CREATE VIEW version_analytics_summary AS
SELECT 
    app_version,
    COUNT(DISTINCT COALESCE(hardware_id, installation_id, user_id)) as unique_users,
    COUNT(*) as total_events,
    MIN(created_at) as first_seen,
    MAX(created_at) as last_seen
FROM analytics_events 
WHERE app_version IS NOT NULL
GROUP BY app_version
ORDER BY first_seen DESC;

CREATE VIEW platform_analytics_summary AS
SELECT 
    platform,
    COUNT(DISTINCT COALESCE(hardware_id, installation_id, user_id)) as unique_users,
    COUNT(*) as total_events,
    AVG(CASE WHEN properties->>'startup_time' IS NOT NULL THEN (properties->>'startup_time')::NUMERIC END) as avg_startup_time,
    AVG(CASE WHEN properties->>'memory_usage' IS NOT NULL THEN (properties->>'memory_usage')::NUMERIC END) as avg_memory_usage
FROM analytics_events 
WHERE platform IS NOT NULL
GROUP BY platform
ORDER BY unique_users DESC;

-- Insert initial API keys
INSERT INTO api_keys (key_value, name, created_at, is_active) VALUES
('demo-key', 'Demo Analytics Key', NOW(), true),
('zash_x7bheq3bmr', 'Production Analytics Key', NOW(), true);

-- Insert initial system health data
INSERT INTO system_metrics (metric_name, metric_value, metric_text) VALUES
('database_schema_version', 1.0, 'Initial schema version'),
('database_initialized', 1, 'Database schema initialized successfully');

COMMENT ON TABLE users IS 'User accounts for dashboard authentication';
COMMENT ON TABLE analytics_events IS 'All analytics events from Zing browser applications';
COMMENT ON TABLE user_sessions IS 'Active user sessions for authentication tracking';  
COMMENT ON TABLE api_keys IS 'API keys for analytics endpoint authentication';
COMMENT ON TABLE system_metrics IS 'System health and performance metrics';
COMMENT ON VIEW user_analytics_summary IS 'Daily user analytics aggregated data';
COMMENT ON VIEW version_analytics_summary IS 'Version adoption and usage analytics';
COMMENT ON VIEW platform_analytics_summary IS 'Platform-specific usage and performance analytics';