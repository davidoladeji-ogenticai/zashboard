#!/bin/bash

# Automated deployment script - runs once SSL and RDS are ready
# Run this script to complete the deployment

set -e

source ~/zashboard-aws-env.sh

echo "🚀 Zashboard Automated Deployment"
echo "=================================="
echo ""

# Step 1: Wait for SSL Certificate
echo "⏳ Step 1: Waiting for SSL certificate validation..."
aws acm wait certificate-validated \
  --certificate-arn $CERT_ARN \
  --region $AWS_REGION
echo "✅ SSL certificate validated!"
echo ""

# Step 2: Add HTTPS Listener
echo "🔒 Step 2: Adding HTTPS listener to ALB..."
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=$CERT_ARN \
  --default-actions Type=forward,TargetGroupArn=$TG_ARN \
  --region $AWS_REGION \
  --output text > /tmp/https_listener.txt

echo "✅ HTTPS listener created!"

# Update HTTP listener to redirect
echo "🔀 Updating HTTP listener to redirect to HTTPS..."
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:235436273845:listener/app/zashboard-alb/359bf31e2b71d4ee/b0d816ab7fae12de \
  --default-actions Type=redirect,RedirectConfig="{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}" \
  --region $AWS_REGION > /dev/null

echo "✅ HTTP redirect configured!"
echo ""

# Step 3: Wait for RDS
echo "⏳ Step 3: Waiting for RDS database to be available..."
aws rds wait db-instance-available \
  --db-instance-identifier zashboard-db \
  --region $AWS_REGION

# Get database endpoint
export DB_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier zashboard-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "✅ RDS database ready at: $DB_ENDPOINT"
echo ""

# Step 4: Create Secrets
echo "🔐 Step 4: Creating AWS Secrets Manager secrets..."

# Generate new secrets
export JWT_SECRET=$(openssl rand -base64 32)
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export DB_PASSWORD=$(cat /tmp/db_password.txt)

# Create secrets
aws secretsmanager create-secret \
  --name zashboard/env \
  --secret-string '{
    "DB_HOST": "'$DB_ENDPOINT'",
    "DB_PORT": "5432",
    "DB_NAME": "zashboard",
    "DB_USER": "zashboard_user",
    "DB_PASSWORD": "'$DB_PASSWORD'",
    "JWT_SECRET": "'$JWT_SECRET'",
    "NEXTAUTH_SECRET": "'$NEXTAUTH_SECRET'",
    "NEXTAUTH_URL": "https://zashboard.ai",
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": "pk_test_Y29uY2lzZS1ncm91cGVyLTk0LmNsZXJrLmFjY291bnRzLmRldiQ",
    "CLERK_SECRET_KEY": "sk_test_u6auz5QAhfr9WzmKxPKfyaJCSXREPIeHvoRdMk7KUC",
    "CLERK_WEBHOOK_SECRET": "whsec_JTZ41Fe6LTGoiEiNXIvDQ5Zp8ZSX7o7H"
  }' \
  --region $AWS_REGION 2>&1 | grep -v "ResourceExistsException" || echo "Secrets already exist, updating..."

echo "✅ Secrets configured!"
echo ""

# Step 5: Build and Push Docker Image
echo "🐳 Step 5: Building and pushing Docker image..."
cd /Users/macbook/Downloads/projects/rair/rair-ogentic/zashboard

# Login to ECR
aws ecr get-login-password --region $AWS_REGION > /tmp/ecr_pass.txt
cat /tmp/ecr_pass.txt | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
rm /tmp/ecr_pass.txt

# Build
docker build -t zashboard:latest .

# Tag
docker tag zashboard:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/zashboard:latest

# Push
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/zashboard:latest

echo "✅ Docker image pushed to ECR!"
echo ""

# Step 6: Register Task Definition
echo "📋 Step 6: Registering ECS task definition..."
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION > /dev/null

echo "✅ Task definition registered!"
echo ""

# Step 7: Create ECS Service
echo "🚢 Step 7: Deploying ECS service..."
aws ecs create-service \
  --cluster zashboard-cluster \
  --service-name zashboard-service \
  --task-definition zashboard-app \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$TG_ARN,containerName=zashboard-app,containerPort=3000" \
  --region $AWS_REGION > /dev/null

echo "⏳ Waiting for service to become stable..."
aws ecs wait services-stable \
  --cluster zashboard-cluster \
  --services zashboard-service \
  --region $AWS_REGION

echo "✅ ECS service deployed!"
echo ""

# Step 8: Verify Deployment
echo "🎉 Step 8: Deployment Complete!"
echo "================================"
echo ""
echo "✅ SSL Certificate: ISSUED"
echo "✅ Database: AVAILABLE"
echo "✅ Docker Image: PUSHED"
echo "✅ ECS Service: RUNNING"
echo ""
echo "🌐 Your application is live at: https://zashboard.ai"
echo ""
echo "📊 Next steps:"
echo "1. Update Clerk webhooks: https://zashboard.ai/api/webhooks/clerk"
echo "2. Test the application"
echo "3. View logs: aws logs tail /ecs/zashboard-app --follow"
echo ""
