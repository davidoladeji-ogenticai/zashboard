# AWS Deployment Guide for zashboard.ai

Complete guide to deploy Zashboard on AWS with ECS Fargate and configure the zashboard.ai domain.

## Architecture

- **ECS Fargate**: Serverless containers for the Next.js app
- **RDS PostgreSQL**: Managed database
- **Application Load Balancer**: HTTPS traffic handling
- **Route 53**: DNS for zashboard.ai
- **ECR**: Docker image storage
- **Secrets Manager**: Secure credentials
- **ACM**: SSL/TLS certificates

## Quick Start

### 1. Install Prerequisites
```bash
# AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# Configure AWS CLI
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key
# Default region: us-east-1
# Default output format: json
```

### 2. Create Infrastructure

```bash
# Set variables
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export PROJECT_NAME="zashboard"

# Create ECR repository
aws ecr create-repository \
  --repository-name $PROJECT_NAME \
  --region $AWS_REGION

# Create ECS cluster
aws ecs create-cluster \
  --cluster-name ${PROJECT_NAME}-cluster \
  --region $AWS_REGION

# Create CloudWatch log group
aws logs create-log-group \
  --log-group-name /ecs/${PROJECT_NAME}-app \
  --region $AWS_REGION
```

### 3. Setup Database

```bash
# Create RDS PostgreSQL instance
aws rds create-db-instance \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username zashboard_admin \
  --master-user-password "CHANGE_THIS_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name default \
  --backup-retention-period 7 \
  --publicly-accessible false \
  --region $AWS_REGION

# Wait for database to be available
aws rds wait db-instance-available \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --region $AWS_REGION

# Get database endpoint
export DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "Database endpoint: $DB_ENDPOINT"
```

### 4. Store Secrets

```bash
# Generate secure secrets
export JWT_SECRET=$(openssl rand -base64 32)
export NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Store in AWS Secrets Manager
aws secretsmanager create-secret \
  --name ${PROJECT_NAME}/jwt-secret \
  --secret-string "$JWT_SECRET" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name ${PROJECT_NAME}/nextauth-secret \
  --secret-string "$NEXTAUTH_SECRET" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name ${PROJECT_NAME}/db-user \
  --secret-string "zashboard_user" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name ${PROJECT_NAME}/db-password \
  --secret-string "YOUR_DB_PASSWORD" \
  --region $AWS_REGION

# Optional: Google OAuth
aws secretsmanager create-secret \
  --name ${PROJECT_NAME}/google-client-id \
  --secret-string "your-google-client-id" \
  --region $AWS_REGION

aws secretsmanager create-secret \
  --name ${PROJECT_NAME}/google-client-secret \
  --secret-string "your-google-client-secret" \
  --region $AWS_REGION
```

### 5. Initialize Database

```bash
# Connect to RDS via bastion or port forwarding
psql -h $DB_ENDPOINT -U zashboard_admin -d postgres

# Create user and database
CREATE USER zashboard_user WITH PASSWORD 'YOUR_DB_PASSWORD';
CREATE DATABASE zashboard OWNER zashboard_user;
\c zashboard
GRANT ALL PRIVILEGES ON DATABASE zashboard TO zashboard_user;
GRANT ALL ON SCHEMA public TO zashboard_user;

# Run schema initialization
\i src/lib/database/schema.sql

# Run migrations
\i src/lib/database/migrations/001_rbac.sql
\i src/lib/database/migrations/002_organizations.sql
\i src/lib/database/migrations/003_system_ai.sql

\q
```

### 6. Build and Push Docker Image

```bash
# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build image
docker build -t $PROJECT_NAME:latest .

# Tag image
docker tag $PROJECT_NAME:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME:latest

# Push to ECR
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$PROJECT_NAME:latest
```

### 7. Create Load Balancer

```bash
# Create Application Load Balancer
aws elbv2 create-load-balancer \
  --name ${PROJECT_NAME}-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups sg-xxxxx \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --region $AWS_REGION

# Create Target Group
aws elbv2 create-target-group \
  --name ${PROJECT_NAME}-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxxxx \
  --target-type ip \
  --health-check-enabled \
  --health-check-path /api/auth/validate \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region $AWS_REGION
```

### 8. Setup SSL Certificate

```bash
# Request certificate for zashboard.ai
aws acm request-certificate \
  --domain-name zashboard.ai \
  --subject-alternative-names "*.zashboard.ai" \
  --validation-method DNS \
  --region $AWS_REGION

# Get certificate ARN
export CERT_ARN=$(aws acm list-certificates \
  --query 'CertificateSummaryList[?DomainName==`zashboard.ai`].CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"

# Note: You need to validate the certificate via DNS
# Check AWS Console for DNS validation records
```

### 9. Create ALB Listener

```bash
# Get ALB ARN
export ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names ${PROJECT_NAME}-alb \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get Target Group ARN
export TG_ARN=$(aws elbv2 describe-target-groups \
  --names ${PROJECT_NAME}-tg \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text)

# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $AWS_REGION

# Create HTTP listener (redirect to HTTPS)
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
  --region $AWS_REGION
```

### 10. Update ECS Task Definition

Update `aws-ecs-task-definition.json` with your values:

```json
{
  "family": "zashboard-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "zashboard-app",
      "image": "YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/zashboard:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "NEXTAUTH_URL",
          "value": "https://zashboard.ai"
        },
        {
          "name": "DB_HOST",
          "value": "YOUR_RDS_ENDPOINT"
        }
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:zashboard/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/zashboard-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Register task definition:
```bash
aws ecs register-task-definition \
  --cli-input-json file://aws-ecs-task-definition.json
```

### 11. Create ECS Service

```bash
aws ecs create-service \
  --cluster ${PROJECT_NAME}-cluster \
  --service-name ${PROJECT_NAME}-service \
  --task-definition ${PROJECT_NAME}-app \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=${PROJECT_NAME}-app,containerPort=3000" \
  --region $AWS_REGION

# Wait for service to be stable
aws ecs wait services-stable \
  --cluster ${PROJECT_NAME}-cluster \
  --services ${PROJECT_NAME}-service \
  --region $AWS_REGION
```

### 12. Configure DNS (Route 53)

```bash
# Get ALB DNS name
export ALB_DNS=$(aws elbv2 describe-load-balancers \
  --names ${PROJECT_NAME}-alb \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

# Get ALB Hosted Zone ID
export ALB_ZONE=$(aws elbv2 describe-load-balancers \
  --names ${PROJECT_NAME}-alb \
  --query 'LoadBalancers[0].CanonicalHostedZoneId' \
  --output text)

# Create Route 53 hosted zone (if not exists)
aws route53 create-hosted-zone \
  --name zashboard.ai \
  --caller-reference $(date +%s)

# Get hosted zone ID
export HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name zashboard.ai \
  --query 'HostedZones[0].Id' \
  --output text)

# Create A record
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "zashboard.ai",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'$ALB_ZONE'",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Create www subdomain
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.zashboard.ai",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'$ALB_ZONE'",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

## Automated Deployment

Use the provided script for subsequent deployments:

```bash
# Update configuration in aws-deploy.sh
./aws-deploy.sh
```

## Monitoring

### CloudWatch Logs
```bash
# View application logs
aws logs tail /ecs/zashboard-app --follow

# View specific task logs
aws logs filter-log-events \
  --log-group-name /ecs/zashboard-app \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

### ECS Service Status
```bash
# Check service status
aws ecs describe-services \
  --cluster ${PROJECT_NAME}-cluster \
  --services ${PROJECT_NAME}-service

# List running tasks
aws ecs list-tasks \
  --cluster ${PROJECT_NAME}-cluster \
  --service-name ${PROJECT_NAME}-service
```

### Database Monitoring
```bash
# Check RDS metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=${PROJECT_NAME}-db \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --period 300 \
  --statistics Average
```

## Scaling

### Auto Scaling
```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/${PROJECT_NAME}-cluster/${PROJECT_NAME}-service \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --scalable-dimension ecs:service:DesiredCount \
  --resource-id service/${PROJECT_NAME}-cluster/${PROJECT_NAME}-service \
  --policy-name cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleInCooldown": 300,
    "ScaleOutCooldown": 60
  }'
```

## Cost Estimation

**Monthly costs (us-east-1):**
- ECS Fargate (2 tasks, 1 vCPU, 2GB): ~$50
- RDS db.t3.micro: ~$15
- Application Load Balancer: ~$20
- Data Transfer: ~$10-50
- Route 53: ~$1
- **Total: ~$100-150/month**

## Security Checklist

- [x] RDS in private subnet
- [x] Security groups restrict access
- [x] Secrets in AWS Secrets Manager
- [x] HTTPS with ACM certificate
- [x] CloudWatch logging enabled
- [ ] Enable AWS WAF on ALB
- [ ] Enable GuardDuty
- [ ] Setup CloudTrail
- [ ] Configure backup retention
- [ ] Enable MFA on AWS account

## Troubleshooting

### Container won't start
```bash
# Check task logs
aws ecs describe-tasks \
  --cluster ${PROJECT_NAME}-cluster \
  --tasks TASK_ID

# View stopped tasks
aws ecs list-tasks \
  --cluster ${PROJECT_NAME}-cluster \
  --desired-status STOPPED
```

### Database connection issues
```bash
# Test from ECS task
aws ecs execute-command \
  --cluster ${PROJECT_NAME}-cluster \
  --task TASK_ID \
  --container zashboard-app \
  --command "psql -h $DB_ENDPOINT -U zashboard_user -d zashboard" \
  --interactive
```

### SSL certificate not working
- Ensure DNS validation is complete in ACM console
- Verify Route 53 has correct CNAME records
- Check ALB listener is using correct certificate ARN

## Updates and Maintenance

### Deploy new version
```bash
# Build and push new image
./aws-deploy.sh

# Or manually
docker build -t zashboard:latest .
docker tag zashboard:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/zashboard:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/zashboard:latest

# Force new deployment
aws ecs update-service \
  --cluster ${PROJECT_NAME}-cluster \
  --service ${PROJECT_NAME}-service \
  --force-new-deployment
```

### Database backup
```bash
# Create snapshot
aws rds create-db-snapshot \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --db-snapshot-identifier ${PROJECT_NAME}-backup-$(date +%Y%m%d)
```

## Support

- AWS Documentation: https://docs.aws.amazon.com/
- Next.js Deployment: https://nextjs.org/docs/deployment
- Issue tracking: Check CloudWatch Logs and ECS service events
