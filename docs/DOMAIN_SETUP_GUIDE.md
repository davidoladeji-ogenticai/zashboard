# Connecting zashboard.ai Domain to AWS

Complete guide to connect your domain **zashboard.ai** to your AWS-hosted Zashboard application.

## Prerequisites

- AWS Account with admin access
- Domain **zashboard.ai** registered (at registrar like Namecheap, GoDaddy, etc.)
- AWS CLI installed and configured
- Docker installed locally

## Overview

You have 2 options for managing your domain with AWS:

### Option 1: Transfer Domain to Route 53 (Recommended)
✅ Simplest setup - everything in one place
✅ Automatic DNS management
✅ Lower latency
❌ Domain transfer takes 5-7 days

### Option 2: Keep Domain at Current Registrar
✅ Immediate setup
✅ Keep existing registrar
❌ Manual nameserver updates required

---

## Option 1: Transfer Domain to Route 53 (Recommended)

### Step 1: Unlock Domain at Current Registrar

1. Log into your domain registrar (Namecheap, GoDaddy, etc.)
2. Find **zashboard.ai** in your domain list
3. **Unlock** the domain (remove transfer lock)
4. Get **Authorization/EPP code** (transfer code)
5. Disable **WHOIS privacy** temporarily (required for transfer)

### Step 2: Initiate Transfer in AWS

```bash
# Start domain transfer
aws route53domains transfer-domain \
  --domain-name zashboard.ai \
  --duration-in-years 1 \
  --auth-code YOUR_EPP_CODE_HERE \
  --admin-contact "FirstName=David,LastName=Oladeji,OrganizationName=OgenticAI,AddressLine1=YourAddress,City=YourCity,State=YourState,CountryCode=US,ZipCode=12345,PhoneNumber=+1.1234567890,Email=david@ogenticai.com" \
  --registrant-contact "FirstName=David,LastName=Oladeji,OrganizationName=OgenticAI,AddressLine1=YourAddress,City=YourCity,State=YourState,CountryCode=US,ZipCode=12345,PhoneNumber=+1.1234567890,Email=david@ogenticai.com" \
  --tech-contact "FirstName=David,LastName=Oladeji,OrganizationName=OgenticAI,AddressLine1=YourAddress,City=YourCity,State=YourState,CountryCode=US,ZipCode=12345,PhoneNumber=+1.1234567890,Email=david@ogenticai.com"
```

**Or use AWS Console:**
1. Go to **Route 53** → **Registered domains**
2. Click **Transfer domain**
3. Enter **zashboard.ai** and EPP code
4. Complete contact information
5. Confirm transfer ($12/year)

### Step 3: Approve Transfer

1. Check email for transfer confirmation
2. Click approval link (from both old registrar and AWS)
3. Wait 5-7 days for transfer to complete

### Step 4: AWS Auto-Creates Hosted Zone

Once transferred, AWS automatically creates a hosted zone. Skip to **"Deploy Application"** section below.

---

## Option 2: Keep Domain at Current Registrar (Immediate)

### Step 1: Create Route 53 Hosted Zone

```bash
# Set variables
export DOMAIN="zashboard.ai"

# Create hosted zone
aws route53 create-hosted-zone \
  --name $DOMAIN \
  --caller-reference $(date +%s)

# Get nameservers
aws route53 list-hosted-zones-by-name \
  --dns-name $DOMAIN \
  --query 'HostedZones[0].Id' \
  --output text
```

**Get the nameservers:**

```bash
export HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name $DOMAIN \
  --query 'HostedZones[0].Id' \
  --output text | cut -d'/' -f3)

aws route53 get-hosted-zone \
  --id $HOSTED_ZONE_ID \
  --query 'DelegationSet.NameServers' \
  --output table
```

You'll get 4 nameservers like:
```
ns-1234.awsdns-56.org
ns-789.awsdns-12.com
ns-345.awsdns-67.net
ns-890.awsdns-34.co.uk
```

### Step 2: Update Nameservers at Your Registrar

**For Namecheap:**
1. Log into Namecheap account
2. Go to **Domain List** → Select **zashboard.ai**
3. Find **Nameservers** section
4. Select **Custom DNS**
5. Enter all 4 AWS nameservers
6. Save changes (propagation takes 15min-48hrs)

**For GoDaddy:**
1. Log into GoDaddy account
2. Go to **My Products** → **Domains**
3. Click **DNS** next to zashboard.ai
4. Scroll to **Nameservers** → Click **Change**
5. Select **Custom**
6. Enter all 4 AWS nameservers
7. Save (propagation takes 15min-48hrs)

**For Other Registrars:**
- Look for "Nameservers", "DNS Settings", or "Custom DNS"
- Replace with the 4 AWS nameservers

### Step 3: Verify DNS Propagation

```bash
# Check nameservers (may take up to 48 hours)
dig NS zashboard.ai +short

# Or use online tool
# https://www.whatsmydns.net/#NS/zashboard.ai
```

Wait until you see AWS nameservers returned.

---

## Deploy Application to AWS

### Step 1: Set Up AWS Infrastructure

```bash
# Set environment variables
export AWS_REGION="us-east-1"
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export PROJECT_NAME="zashboard"
export DOMAIN="zashboard.ai"

echo "AWS Account ID: $AWS_ACCOUNT_ID"
echo "Region: $AWS_REGION"
```

### Step 2: Create ECR Repository

```bash
# Create repository for Docker images
aws ecr create-repository \
  --repository-name $PROJECT_NAME \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true

echo "✅ ECR repository created"
```

### Step 3: Create ECS Cluster

```bash
# Create Fargate cluster
aws ecs create-cluster \
  --cluster-name ${PROJECT_NAME}-cluster \
  --region $AWS_REGION

# Create CloudWatch log group
aws logs create-log-group \
  --log-group-name /ecs/${PROJECT_NAME}-app \
  --region $AWS_REGION

echo "✅ ECS cluster created"
```

### Step 4: Set Up VPC and Security Groups

```bash
# Get default VPC
export VPC_ID=$(aws ec2 describe-vpcs \
  --filters "Name=isDefault,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text)

# Get subnets
export SUBNET_1=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[0].SubnetId' \
  --output text)

export SUBNET_2=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[1].SubnetId' \
  --output text)

# Create security group for ALB
export ALB_SG=$(aws ec2 create-security-group \
  --group-name ${PROJECT_NAME}-alb-sg \
  --description "Security group for Zashboard ALB" \
  --vpc-id $VPC_ID \
  --output text)

# Allow HTTP and HTTPS
aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $ALB_SG \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Create security group for ECS tasks
export ECS_SG=$(aws ec2 create-security-group \
  --group-name ${PROJECT_NAME}-ecs-sg \
  --description "Security group for Zashboard ECS tasks" \
  --vpc-id $VPC_ID \
  --output text)

# Allow traffic from ALB
aws ec2 authorize-security-group-ingress \
  --group-id $ECS_SG \
  --protocol tcp \
  --port 3000 \
  --source-group $ALB_SG

echo "✅ Security groups created"
echo "VPC: $VPC_ID"
echo "Subnets: $SUBNET_1, $SUBNET_2"
echo "ALB SG: $ALB_SG"
echo "ECS SG: $ECS_SG"
```

### Step 5: Request SSL Certificate

```bash
# Request certificate for your domain
aws acm request-certificate \
  --domain-name $DOMAIN \
  --subject-alternative-names "*.$DOMAIN" \
  --validation-method DNS \
  --region $AWS_REGION

# Get certificate ARN
export CERT_ARN=$(aws acm list-certificates \
  --region $AWS_REGION \
  --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn" \
  --output text)

echo "Certificate ARN: $CERT_ARN"
echo "⚠️  IMPORTANT: You must validate this certificate via DNS"
```

### Step 6: Validate SSL Certificate (CRITICAL)

```bash
# Get DNS validation records
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region $AWS_REGION \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --output table
```

This will show something like:
```
Name: _abc123.zashboard.ai
Type: CNAME
Value: _xyz789.acm-validations.aws.
```

**Add this DNS record:**

```bash
# Get hosted zone ID
export HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name $DOMAIN \
  --query 'HostedZones[0].Id' \
  --output text | cut -d'/' -f3)

# Get validation record details
export VALIDATION_NAME=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord.Name' \
  --output text)

export VALIDATION_VALUE=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord.Value' \
  --output text)

# Create validation record
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "'$VALIDATION_NAME'",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "'$VALIDATION_VALUE'"}]
      }
    }]
  }'

echo "✅ Validation record created"
echo "⏳ Waiting for certificate validation (5-30 minutes)..."

# Wait for validation
aws acm wait certificate-validated \
  --certificate-arn $CERT_ARN \
  --region $AWS_REGION

echo "✅ Certificate validated!"
```

### Step 7: Create Application Load Balancer

```bash
# Create ALB
export ALB_ARN=$(aws elbv2 create-load-balancer \
  --name ${PROJECT_NAME}-alb \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $ALB_SG \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get ALB DNS name
export ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

export ALB_ZONE=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns $ALB_ARN \
  --query 'LoadBalancers[0].CanonicalHostedZoneId' \
  --output text)

# Create target group
export TG_ARN=$(aws elbv2 create-target-group \
  --name ${PROJECT_NAME}-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-enabled \
  --health-check-path / \
  --health-check-interval-seconds 30 \
  --health-check-timeout-seconds 5 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 3 \
  --region $AWS_REGION \
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

echo "✅ Load balancer created"
echo "ALB DNS: $ALB_DNS"
```

### Step 8: Create DNS Records

```bash
# Create A record for root domain
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "'$DOMAIN'",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'$ALB_ZONE'",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# Create A record for www subdomain
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.'$DOMAIN'",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "'$ALB_ZONE'",
          "DNSName": "'$ALB_DNS'",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

echo "✅ DNS records created"
```

### Step 9: Set Up Database (RDS PostgreSQL)

```bash
# Create RDS security group
export RDS_SG=$(aws ec2 create-security-group \
  --group-name ${PROJECT_NAME}-rds-sg \
  --description "Security group for Zashboard RDS" \
  --vpc-id $VPC_ID \
  --output text)

# Allow PostgreSQL from ECS
aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG \
  --protocol tcp \
  --port 5432 \
  --source-group $ECS_SG

# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username zashboard_admin \
  --master-user-password "$(openssl rand -base64 20)" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids $RDS_SG \
  --publicly-accessible false \
  --backup-retention-period 7 \
  --region $AWS_REGION

echo "⏳ Creating RDS instance (10-15 minutes)..."

# Wait for database
aws rds wait db-instance-available \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --region $AWS_REGION

# Get database endpoint
export DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "✅ Database created"
echo "Database endpoint: $DB_ENDPOINT"
```

### Step 10: Store Secrets

```bash
# Generate secrets
export JWT_SECRET=$(openssl rand -base64 32)
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export DB_PASSWORD=$(openssl rand -base64 20)

# Store in AWS Secrets Manager
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
    "NEXTAUTH_URL": "https://'$DOMAIN'",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "'$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'",
    "CLERK_SECRET_KEY": "'$CLERK_SECRET_KEY'",
    "CLERK_WEBHOOK_SECRET": "'$CLERK_WEBHOOK_SECRET'"
  }' \
  --region $AWS_REGION

echo "✅ Secrets stored"
```

### Step 11: Build and Push Docker Image

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

echo "✅ Docker image pushed to ECR"
```

### Step 12: Create ECS Task Definition

Create `task-definition.json`:

```json
{
  "family": "zashboard-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT_ID:role/ecsTaskRole",
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
      "secrets": [
        {
          "name": "DB_HOST",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:YOUR_ACCOUNT_ID:secret:zashboard/env:DB_HOST::"
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

Register it:

```bash
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION
```

### Step 13: Create ECS Service

```bash
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

### Step 14: Verify Deployment

```bash
# Check DNS propagation
dig $DOMAIN +short

# Test HTTPS
curl -I https://$DOMAIN

# View logs
aws logs tail /ecs/${PROJECT_NAME}-app --follow
```

Visit **https://zashboard.ai** - your app should be live! 🎉

---

## Update Clerk for Production

### Set Production URLs

1. Go to **Clerk Dashboard** → Your Application → **Settings**
2. Update **Application URLs**:
   - Homepage URL: `https://zashboard.ai`
   - Sign-in URL: `https://zashboard.ai/sign-in`
   - Sign-up URL: `https://zashboard.ai/sign-up`
3. Add **Allowed origins**: `https://zashboard.ai`, `https://www.zashboard.ai`

### Configure Webhooks

1. Go to **Clerk Dashboard** → **Webhooks**
2. Click **Add Endpoint**
3. Enter URL: `https://zashboard.ai/api/webhooks/clerk`
4. Subscribe to events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
   - `organizationMembership.created`
   - `organizationMembership.updated`
   - `organizationMembership.deleted`
5. Copy **Signing Secret** and update in Secrets Manager

---

## Monitoring & Maintenance

### View Logs
```bash
aws logs tail /ecs/zashboard-app --follow --since 1h
```

### Update Application
```bash
# Build and push new image
./aws-deploy.sh

# Or force new deployment
aws ecs update-service \
  --cluster zashboard-cluster \
  --service zashboard-service \
  --force-new-deployment
```

### Scale Service
```bash
aws ecs update-service \
  --cluster zashboard-cluster \
  --service zashboard-service \
  --desired-count 4
```

---

## Troubleshooting

### Domain not resolving
```bash
# Check nameservers
dig NS zashboard.ai +short

# Should show AWS nameservers (if using Route 53)
# Allow 15min-48hrs for DNS propagation
```

### SSL Certificate issues
```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --query 'Certificate.Status'

# Should be "ISSUED"
```

### Application not loading
```bash
# Check ECS tasks
aws ecs list-tasks \
  --cluster zashboard-cluster \
  --service-name zashboard-service

# Check task logs
aws logs tail /ecs/zashboard-app --follow
```

---

## Cost Estimate

**Monthly AWS costs:**
- ECS Fargate (2 tasks): ~$50
- RDS PostgreSQL (t3.micro): ~$15
- Application Load Balancer: ~$20
- Data transfer: ~$10
- Route 53 hosted zone: $0.50
- **Total: ~$95-100/month**

---

## Next Steps

1. ✅ Deploy application to AWS
2. ✅ Configure domain DNS
3. ✅ Set up SSL certificate
4. ✅ Update Clerk webhooks
5. [ ] Set up CloudWatch alarms
6. [ ] Configure auto-scaling
7. [ ] Set up CI/CD pipeline (GitHub Actions)
8. [ ] Enable AWS WAF for security

Need help? Check [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md) for more details.
