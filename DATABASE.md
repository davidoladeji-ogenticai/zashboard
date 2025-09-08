# Zashboard Database Setup

This document provides comprehensive instructions for setting up and managing the Zashboard PostgreSQL database.

## Overview

Zashboard uses PostgreSQL as its primary database for:
- User authentication and session management
- Analytics event storage and processing
- System metrics and health monitoring
- Real-time dashboard data

## Prerequisites

1. **PostgreSQL Installation**
   ```bash
   # macOS (using Homebrew)
   brew install postgresql
   brew services start postgresql
   
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   sudo systemctl start postgresql
   
   # CentOS/RHEL
   sudo yum install postgresql-server postgresql-contrib
   sudo postgresql-setup initdb
   sudo systemctl start postgresql
   ```

2. **Node.js Dependencies**
   ```bash
   pnpm install
   ```

## Database Configuration

### 1. Environment Variables

Create or update `.env.local` with your database configuration:

```bash
# PostgreSQL Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zashboard
DB_USER=postgres
DB_PASSWORD=your_password_here

# For production
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=zashboard_prod
DB_USER=zashboard_user
DB_PASSWORD=your-secure-password
```

### 2. Database User Setup (Optional)

Create a dedicated database user for better security:

```sql
-- Connect to PostgreSQL as superuser
CREATE USER zashboard_user WITH PASSWORD 'your-secure-password';
CREATE DATABASE zashboard OWNER zashboard_user;
GRANT ALL PRIVILEGES ON DATABASE zashboard TO zashboard_user;
```

## Database Initialization

### Automated Setup

Run the initialization script to create the database and schema:

```bash
# Initialize database and create all tables/views
pnpm db:init

# Test database connection
pnpm db:test
```

### Manual Setup

If you prefer manual setup:

1. **Create Database**
   ```sql
   CREATE DATABASE zashboard;
   ```

2. **Run Schema**
   ```bash
   psql -d zashboard -f src/lib/database/schema.sql
   ```

## Database Schema

### Core Tables

#### `users`
Stores user account information for dashboard authentication.
```sql
- id: UUID (Primary Key)
- email: VARCHAR(255) (Unique)
- password_hash: VARCHAR(255)
- name: VARCHAR(255)
- created_at: TIMESTAMP WITH TIME ZONE
- updated_at: TIMESTAMP WITH TIME ZONE
- last_login: TIMESTAMP WITH TIME ZONE
- is_active: BOOLEAN
- role: VARCHAR(50)
```

#### `analytics_events`
Stores all analytics events from Zing browser applications.
```sql
- id: UUID (Primary Key)
- event: VARCHAR(100)
- user_id: VARCHAR(255)
- hardware_id: VARCHAR(255)
- installation_id: VARCHAR(255)
- session_id: VARCHAR(255)
- app_version: VARCHAR(50)
- platform: VARCHAR(50)
- timestamp: BIGINT
- properties: JSONB
- created_at: TIMESTAMP WITH TIME ZONE
```

#### `user_sessions`
Tracks active user sessions for authentication.
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key)
- session_token: VARCHAR(255)
- expires_at: TIMESTAMP WITH TIME ZONE
- created_at: TIMESTAMP WITH TIME ZONE
- last_used: TIMESTAMP WITH TIME ZONE
- ip_address: INET
- user_agent: TEXT
```

#### `system_metrics`
Stores system health and performance metrics.
```sql
- id: UUID (Primary Key)
- metric_name: VARCHAR(100)
- metric_value: DECIMAL(15,4)
- metric_text: VARCHAR(255)
- timestamp: TIMESTAMP WITH TIME ZONE
- tags: JSONB
```

### Views

- `user_analytics_summary`: Daily user analytics aggregation
- `version_analytics_summary`: Version adoption analytics
- `platform_analytics_summary`: Platform-specific metrics

### Functions

- `cleanup_old_analytics_events(retention_days)`: Remove old events
- `cleanup_expired_sessions()`: Remove expired user sessions
- `update_updated_at_column()`: Trigger function for timestamp updates

## Performance Optimization

### Indexes

The schema includes comprehensive indexes for optimal query performance:

- **Analytics Events**: timestamp, event, user_id, hardware_id, platform
- **Users**: email, created_at, last_login
- **Sessions**: user_id, session_token, expires_at
- **System Metrics**: metric_name, timestamp

### Query Optimization

1. **Use hardware_id for unique user counting**
   ```sql
   SELECT COUNT(DISTINCT hardware_id) FROM analytics_events;
   ```

2. **Filter by timestamp for time-based queries**
   ```sql
   SELECT * FROM analytics_events 
   WHERE timestamp > extract(epoch from now() - interval '1 hour') * 1000;
   ```

3. **Use JSONB operators for property queries**
   ```sql
   SELECT * FROM analytics_events 
   WHERE properties->>'install_type' = 'fresh_install';
   ```

## Data Retention

### Automated Cleanup

The database includes automated cleanup functions:

```sql
-- Clean up events older than 90 days
SELECT cleanup_old_analytics_events(90);

-- Clean up expired sessions
SELECT cleanup_expired_sessions();
```

### Scheduled Cleanup

Set up regular cleanup with cron or a scheduler:

```sql
-- Weekly cleanup job
0 2 * * 0 psql -d zashboard -c "SELECT cleanup_old_analytics_events(90);"
0 3 * * * psql -d zashboard -c "SELECT cleanup_expired_sessions();"
```

## Monitoring

### Database Statistics

Check database health and size:

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('zashboard'));

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Event count by day
SELECT 
    DATE(created_at) as date,
    COUNT(*) as events
FROM analytics_events 
GROUP BY DATE(created_at)
ORDER BY date DESC
LIMIT 7;
```

### Connection Monitoring

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'zashboard';

-- Long running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';
```

## Backup and Recovery

### Backup

```bash
# Full database backup
pg_dump -h localhost -U postgres zashboard > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump -h localhost -U postgres zashboard | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Data only backup
pg_dump -h localhost -U postgres --data-only zashboard > data_backup.sql
```

### Restore

```bash
# Restore from backup
psql -h localhost -U postgres -d zashboard < backup.sql

# Restore compressed backup
gunzip -c backup.sql.gz | psql -h localhost -U postgres -d zashboard
```

## Production Deployment

### Database Configuration

1. **Connection Pooling**: Use PgBouncer or similar for connection pooling
2. **SSL**: Enable SSL for encrypted connections
3. **Monitoring**: Set up monitoring with tools like pg_stat_statements
4. **Backups**: Implement automated backup strategy

### Environment Variables

```bash
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=zashboard_prod
DB_USER=zashboard_user
DB_PASSWORD=your-secure-password
```

### Security

1. **Network Security**: Use VPC/private networks
2. **Authentication**: Strong passwords and limited user privileges
3. **Encryption**: Enable data encryption at rest
4. **Auditing**: Enable PostgreSQL audit logging

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check PostgreSQL service is running
   - Verify connection parameters
   - Check firewall settings

2. **Permission Denied**
   - Verify user has correct privileges
   - Check pg_hba.conf configuration

3. **Out of Disk Space**
   - Check available disk space
   - Run cleanup functions
   - Consider data archival

### Useful Commands

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log

# Connect to database
psql -h localhost -U postgres -d zashboard

# Check database connections
SELECT * FROM pg_stat_activity WHERE datname = 'zashboard';
```

## Migration from In-Memory Storage

The application supports both in-memory and PostgreSQL storage simultaneously during the transition period. The PostgreSQL implementation maintains full compatibility with the existing API.

To switch to PostgreSQL:

1. Set up database using the instructions above
2. Update API endpoints to use PostgreSQL store
3. Test thoroughly with existing data flow
4. Monitor performance and adjust as needed

The in-memory storage will continue to work as a fallback during development and testing.