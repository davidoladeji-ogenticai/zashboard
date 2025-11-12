# Zashboard AWS Deployment - Next Steps

## ✅ Completed Infrastructure

### DNS & Certificates
- ✅ Using existing Route 53 hosted zone: **Z0555332RFIZCFBSC35K**
- ✅ Hover nameservers are correctly configured (no action needed)
- ✅ SSL certificate requested: `arn:aws:acm:us-east-1:235436273845:certificate/cb3a24b7-9423-4d48-a061-0e7cd99764d4`
- ✅ DNS validation record added to Route 53
- ✅ A record added: `zashboard.ai` → ALB
- ⏳ **SSL Certificate Status: PENDING_VALIDATION** (will validate in 5-30 minutes)

### AWS Infrastructure
- ✅ ECR Repository: `235436273845.dkr.ecr.us-east-1.amazonaws.com/zashboard`
- ✅ ECS Cluster: `zashboard-cluster`
- ✅ CloudWatch Logs: `/ecs/zashboard-app`
- ✅ VPC: `vpc-00f9608064671ce64`
- ✅ ALB Security Group: `sg-0ffdf45f395c5317a` (HTTP/HTTPS from internet)
- ✅ ECS Security Group: `sg-0d2b87a33d1cb71db` (port 3000 from ALB)

### Load Balancer
- ✅ ALB: `zashboard-alb`
- ✅ ALB DNS: `zashboard-alb-680846428.us-east-1.elb.amazonaws.com`
- ✅ Target Group: `zashboard-tg` (port 3000)
- ✅ HTTP Listener (port 80) configured

---

## 📋 Remaining Tasks

### 1. Wait for SSL Certificate Validation (5-30 minutes)

Check status:
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:235436273845:certificate/cb3a24b7-9423-4d48-a061-0e7cd99764d4 \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Should return `ISSUED` when ready.

---

### 2. Add HTTPS Listener (after SSL validates)

```bash
source ~/zashboard-aws-env.sh

# Create HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $AWS_REGION

# Update HTTP listener to redirect to HTTPS
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:235436273845:listener/app/zashboard-alb/359bf31e2b71d4ee/b0d816ab7fae12de \
  --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}"
```

---

### 3. Build and Push Docker Image

**Open Docker Desktop first**, then run:

```bash
source ~/zashboard-aws-env.sh
cd /Users/macbook/Downloads/projects/rair/rair-ogentic/zashboard

# Login to ECR
aws ecr get-login-password --region us-east-1 > /tmp/ecr_pass.txt
cat /tmp/ecr_pass.txt | docker login --username AWS --password-stdin 235436273845.dkr.ecr.us-east-1.amazonaws.com
rm /tmp/ecr_pass.txt

# Build image
docker build -t zashboard:latest .

# Tag image
docker tag zashboard:latest 235436273845.dkr.ecr.us-east-1.amazonaws.com/zashboard:latest

# Push to ECR
docker push 235436273845.dkr.ecr.us-east-1.amazonaws.com/zashboard:latest
```

---

### 4. Create RDS PostgreSQL Database

```bash
source ~/zashboard-aws-env.sh

# Create RDS security group
export RDS_SG=$(aws ec2 create-security-group \
  --group-name ${PROJECT_NAME}-rds-sg \
  --description "Security group for Zashboard RDS" \
  --vpc-id $VPC_ID \
  --output text | cut -f1)

# Allow PostgreSQL from ECS
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG

# Generate secure database password
export DB_PASSWORD=$(openssl rand -base64 20)
echo "Database password (save this): $DB_PASSWORD"

# Create RDS instance (takes 10-15 minutes)
aws rds create-db-instance \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username zashboard_admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids $RDS_SG \
  --publicly-accessible false \
  --backup-retention-period 7 \
  --region $AWS_REGION

# Wait for database (10-15 minutes)
echo "⏳ Waiting for database to be available (10-15 minutes)..."
aws rds wait db-instance-available \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --region $AWS_REGION

# Get database endpoint
export DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "✅ Database ready at: $DB_ENDPOINT"

# Save to environment file
echo "export DB_ENDPOINT=\"$DB_ENDPOINT\"" >> ~/zashboard-aws-env.sh
echo "export DB_PASSWORD=\"$DB_PASSWORD\"" >> ~/zashboard-aws-env.sh
```

---

### 5. Create IAM Roles for ECS

```bash
# Create ECS task execution role
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' || echo "Role already exists"

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create ECS task role
aws iam create-role \
  --role-name ecsTaskRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }' || echo "Role already exists"

echo "✅ IAM roles created"
```

---

### 6. Store Secrets in AWS Secrets Manager

```bash
source ~/zashboard-aws-env.sh

# Generate secrets
export JWT_SECRET=$(openssl rand -base64 32)
export NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Get your Clerk keys from .env.local
export CLERK_PUBLISHABLE_KEY="pk_test_Y29uY2lzZS1ncm91cGVyLTk0LmNsZXJrLmFjY291bnRzLmRldiQ"
export CLERK_SECRET_KEY="sk_test_u6auz5QAhfr9WzmKxPKfyaJCSXREPIeHvoRdMk7KUC"
export CLERK_WEBHOOK_SECRET="whsec_JTZ41Fe6LTGoiEiNXIvDQ5Zp8ZSX7o7H"

# Store all secrets in one JSON
aws secretsmanager create-secret \
  --name ${PROJECT_NAME}/env \
  --secret-string '{
    "DB_HOST": "'$DB_ENDPOINT'",
    "DB_PORT": "5432",
    "DB_NAME": "zashboard",
    "DB_USER": "zashboard_user",
    "DB_PASSWORD": "'$DB_PASSWORD'",
    "JWT_SECRET": "'$JWT_SECRET'",
    "NEXTAUTH_SECRET": "'$NEXTAUTH_SECRET'",
    "NEXTAUTH_URL": "https://zashboard.ai",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "'$CLERK_PUBLISHABLE_KEY'",
    "CLERK_SECRET_KEY": "'$CLERK_SECRET_KEY'",
    "CLERK_WEBHOOK_SECRET": "'$CLERK_WEBHOOK_SECRET'"
  }' \
  --region $AWS_REGION

echo "✅ Secrets stored in AWS Secrets Manager"
```

---

### 7. Initialize Database Schema

After RDS is created, initialize the database:

```bash
source ~/zashboard-aws-env.sh

# Connect via psql (you may need to create a bastion or use port forwarding)
# For now, we'll run migrations after the ECS task starts
```

---

### 8. Create ECS Task Definition

Create file `task-definition.json`:

```json
{
  "family": "zashboard-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::235436273845:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::235436273845:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "zashboard-app",
      "image": "235436273845.dkr.ecr.us-east-1.amazonaws.com/zashboard:latest",
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
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "DB_HOST",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:235436273845:secret:zashboard/env:DB_HOST::"
        },
        {
          "name": "DB_PORT",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:235436273845:secret:zashboard/env:DB_PORT::"
        },
        {
          "name": "DB_NAME",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:235436273845:secret:zashboard/env:DB_NAME::"
        },
        {
          "name": "DB_USER",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:235436273845:secret:zashboard/env:DB_USER::"
        },
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:235436273845:secret:zashboard/env:DB_PASSWORD::"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:235436273845:secret:zashboard/env:JWT_SECRET::"
        },
        {
          "name": "NEXTAUTH_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:235436273845:secret:zashboard/env:NEXTAUTH_SECRET::"
        },
        {
          "name": "NEXTAUTH_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:235436273845:secret:zashboard/env:NEXTAUTH_URL::"
        },
        {
          "name": "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:235436273845:secret:zashboard/env:NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY::"
        },
        {
          "name": "CLERK_SECRET_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:235436273845:secret:zashboard/env:CLERK_SECRET_KEY::"
        },
        {
          "name": "CLERK_WEBHOOK_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:235436273845:secret:zashboard/env:CLERK_WEBHOOK_SECRET::"
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
  --cli-input-json file://task-definition.json \
  --region us-east-1
```

---

### 9. Deploy ECS Service

```bash
source ~/zashboard-aws-env.sh

aws ecs create-service \
  --cluster ${PROJECT_NAME}-cluster \
  --service-name ${PROJECT_NAME}-service \
  --task-definition ${PROJECT_NAME}-app \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=${PROJECT_NAME}-app,containerPort=3000" \
  --region $AWS_REGION

echo "⏳ Deploying service..."

# Wait for service
aws ecs wait services-stable \
  --cluster ${PROJECT_NAME}-cluster \
  --services ${PROJECT_NAME}-service \
  --region $AWS_REGION

echo "✅ Service deployed!"
```

---

### 10. Update Clerk for Production

1. Go to **Clerk Dashboard** → Your Application → **Settings**
2. Update URLs:
   - Homepage: `https://zashboard.ai`
   - Sign-in: `https://zashboard.ai/sign-in`
   - Sign-up: `https://zashboard.ai/sign-up`
3. Add allowed origins: `https://zashboard.ai`, `https://www.zashboard.ai`

4. Configure Webhooks:
   - Go to **Webhooks** → **Add Endpoint**
   - URL: `https://zashboard.ai/api/webhooks/clerk`
   - Events: `user.*`, `organizationMembership.*`

---

## Quick Status Checks

### Check SSL Certificate
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:235436273845:certificate/cb3a24b7-9423-4d48-a061-0e7cd99764d4 \
  --region us-east-1 \
  --query 'Certificate.Status'
```

### Check DNS
```bash
dig zashboard.ai +short
```

### Check ECS Service
```bash
aws ecs describe-services \
  --cluster zashboard-cluster \
  --services zashboard-service \
  --region us-east-1 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'
```

### View Logs
```bash
aws logs tail /ecs/zashboard-app --follow
```

---

## Environment Configuration

All variables saved in: `~/zashboard-aws-env.sh`

Load anytime with:
```bash
source ~/zashboard-aws-env.sh
```

---

## Estimated Timeline

1. **SSL Certificate Validation**: 5-30 minutes (waiting now)
2. **Docker Build & Push**: 5-10 minutes
3. **RDS Database Creation**: 10-15 minutes
4. **ECS Service Deployment**: 5-10 minutes

**Total time from now: ~30-60 minutes**

---

## Cost Summary

- ECS Fargate (2 tasks): ~$50/month
- RDS t3.micro: ~$15/month
- ALB: ~$20/month
- Data transfer: ~$10/month
- Route 53: $0.50/month
- **Total: ~$95-100/month**

---

**Next step: Wait for SSL certificate to validate, then continue from Step 2.**
