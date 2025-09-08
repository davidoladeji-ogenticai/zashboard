# Zashboard Production Deployment Guide

This guide covers deploying Zashboard to production with a PostgreSQL database and proper configuration.

## Overview

Zashboard is a Next.js application with:
- Frontend dashboard built with React and Tailwind CSS
- Backend API with JWT authentication
- PostgreSQL database for data persistence
- Real-time analytics processing

## Prerequisites

### System Requirements
- Node.js 18+ (recommended: 20+)
- PostgreSQL 13+ (recommended: 15+)
- Minimum 2GB RAM, 4GB recommended
- 10GB+ disk space for database growth

### Services Needed
- **Web Hosting**: Vercel, Netlify, or custom server
- **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL, Supabase)
- **Domain**: Custom domain with SSL certificate

## Database Setup

### Option 1: Managed Database (Recommended)

#### AWS RDS PostgreSQL
```bash
# Create RDS instance via AWS Console or CLI
aws rds create-db-instance \
    --db-instance-identifier zashboard-prod \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --master-username zashboard_admin \
    --master-user-password YOUR_SECURE_PASSWORD \
    --allocated-storage 20 \
    --storage-type gp2 \
    --publicly-accessible \
    --backup-retention-period 7
```

#### Google Cloud SQL
```bash
# Create Cloud SQL instance
gcloud sql instances create zashboard-prod \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region=us-central1 \
    --backup \
    --maintenance-release-channel=production
```

#### Supabase (Easiest)
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Get connection details from Settings > Database
4. Use the connection pooler URL for better performance

### Option 2: Self-Hosted Database

#### Digital Ocean Droplet Setup
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Secure installation
sudo -u postgres psql
ALTER USER postgres PASSWORD 'your-secure-password';
CREATE DATABASE zashboard_prod;
CREATE USER zashboard_user WITH PASSWORD 'your-app-password';
GRANT ALL PRIVILEGES ON DATABASE zashboard_prod TO zashboard_user;
\q

# Configure PostgreSQL for remote access
sudo nano /etc/postgresql/15/main/postgresql.conf
# Set: listen_addresses = '*'

sudo nano /etc/postgresql/15/main/pg_hba.conf
# Add: host all all 0.0.0.0/0 md5

sudo systemctl restart postgresql
```

## Environment Configuration

### Production Environment Variables

Create `.env.production.local`:

```bash
# Database Configuration
DB_HOST=your-production-db-host
DB_PORT=5432
DB_NAME=zashboard_prod
DB_USER=zashboard_user
DB_PASSWORD=your-secure-db-password

# Authentication
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-very-secure-secret-key-here

# Analytics Configuration
ZING_ANALYTICS_KEY=your-production-analytics-key
NEXT_PUBLIC_ZING_ANALYTICS_KEY=your-production-analytics-key

# Application Settings
NODE_ENV=production
```

### Security Settings

```bash
# Generate secure secrets
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -hex 16     # For ZING_ANALYTICS_KEY
```

## Deployment Options

### Option 1: Vercel (Recommended for Next.js)

#### Setup
1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Deploy from project directory
   vercel
   ```

2. **Configure Environment Variables**
   - Go to Vercel dashboard > Project > Settings > Environment Variables
   - Add all production environment variables
   - Set for "Production" environment

3. **Custom Domain**
   - Go to Project > Settings > Domains
   - Add your custom domain
   - Configure DNS records as shown

#### Database Connection
```bash
# Vercel supports PostgreSQL out of the box
# Just add your database URL to environment variables
DATABASE_URL=postgresql://user:password@host:port/database
```

### Option 2: Railway

1. **Deploy to Railway**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and deploy
   railway login
   railway init
   railway up
   ```

2. **Add PostgreSQL Service**
   - Go to Railway dashboard
   - Click "New" > "Database" > "PostgreSQL"
   - Connect database to your application

### Option 3: DigitalOcean App Platform

1. **Create App**
   - Connect GitHub repository
   - Choose Node.js environment
   - Set build command: `pnpm build`
   - Set run command: `pnpm start`

2. **Add Database Component**
   - Add PostgreSQL database
   - Configure connection environment variables

### Option 4: Custom Server (VPS)

#### Server Setup
```bash
# Install Node.js (using NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2 for process management
npm install -g pm2

# Clone and setup application
git clone your-repo-url /var/www/zashboard
cd /var/www/zashboard
pnpm install
pnpm build
```

#### PM2 Configuration
```json
{
  "name": "zashboard",
  "script": "pnpm",
  "args": "start",
  "cwd": "/var/www/zashboard",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3000"
  },
  "instances": "max",
  "exec_mode": "cluster"
}
```

```bash
# Start application
pm2 start ecosystem.config.json
pm2 startup
pm2 save
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Database Initialization

### Initialize Production Database
```bash
# Set production environment variables
export DB_HOST=your-production-host
export DB_PORT=5432
export DB_NAME=zashboard_prod
export DB_USER=zashboard_user
export DB_PASSWORD=your-password

# Initialize database schema
pnpm db:init

# Test connection
pnpm db:test
```

### Data Migration (if needed)
```bash
# Export existing data
pg_dump -h old-host -U old-user old-database > migration.sql

# Import to new database
psql -h new-host -U new-user -d new-database < migration.sql
```

## Monitoring and Maintenance

### Health Monitoring
```bash
# Set up monitoring endpoints
curl https://your-domain.com/api/dashboard/metrics/system
curl https://your-domain.com/api/analytics/health
```

### Database Maintenance
```sql
-- Set up automated cleanup (run weekly)
SELECT cleanup_old_analytics_events(90);  -- Keep 90 days
SELECT cleanup_expired_sessions();
```

### Backup Strategy
```bash
# Daily backups
#!/bin/bash
BACKUP_DIR="/backups/zashboard"
DATE=$(date +%Y%m%d_%H%M%S)

pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > $BACKUP_DIR/backup_$DATE.sql
gzip $BACKUP_DIR/backup_$DATE.sql

# Keep only last 30 days of backups
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

### Log Management
```bash
# Application logs
pm2 logs zashboard

# Database logs
tail -f /var/log/postgresql/postgresql-15-main.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## Performance Optimization

### Database Optimization
```sql
-- Update statistics
ANALYZE;

-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Index optimization
SELECT schemaname, tablename, attname, n_distinct, correlation 
FROM pg_stats 
WHERE schemaname = 'public';
```

### Application Optimization
```bash
# Enable gzip compression in Nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Use CDN for static assets
# Configure Next.js for CDN
```

## Security Checklist

### Database Security
- [ ] Use strong passwords
- [ ] Enable SSL connections
- [ ] Restrict network access
- [ ] Regular security updates
- [ ] Enable audit logging

### Application Security
- [ ] Use HTTPS everywhere
- [ ] Set secure cookies
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Regular dependency updates

### Infrastructure Security
- [ ] Configure firewall rules
- [ ] Use VPC/private networks
- [ ] Enable DDoS protection
- [ ] Set up monitoring alerts
- [ ] Regular backup testing

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```bash
   # Check connection
   telnet db-host 5432
   
   # Test credentials
   psql -h db-host -U db-user -d db-name
   ```

2. **High Memory Usage**
   ```bash
   # Check Node.js memory
   node --max-old-space-size=2048 server.js
   
   # Monitor with PM2
   pm2 monit
   ```

3. **Slow Database Queries**
   ```sql
   -- Check locks
   SELECT * FROM pg_locks WHERE NOT granted;
   
   -- Check connections
   SELECT * FROM pg_stat_activity;
   ```

### Performance Monitoring

```bash
# Application metrics
curl https://your-domain.com/api/dashboard/metrics/system

# Database metrics
psql -c "SELECT * FROM pg_stat_database WHERE datname = 'zashboard_prod';"

# Server metrics
htop
iostat -x 1
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (AWS ALB, Cloudflare)
- Database read replicas
- CDN for static assets
- Separate analytics processing

### Vertical Scaling
- Increase server resources
- Optimize database configuration
- Connection pooling (PgBouncer)
- Redis for caching

## Support and Updates

### Regular Maintenance
- Weekly database cleanup
- Monthly backup verification
- Quarterly security updates
- Semi-annual performance review

### Update Process
```bash
# 1. Backup database
pg_dump -h $DB_HOST -U $DB_USER $DB_NAME > pre-update-backup.sql

# 2. Update application
git pull origin main
pnpm install
pnpm build

# 3. Restart application
pm2 restart zashboard

# 4. Verify deployment
curl https://your-domain.com/api/analytics/health
```

This deployment guide ensures a robust, secure, and scalable production environment for Zashboard.