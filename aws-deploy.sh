#!/bin/bash

# AWS Deployment Script for Zashboard
# This script automates the deployment of Zashboard to AWS ECS

set -e

# Configuration - Update these values
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="YOUR_ACCOUNT_ID"
ECR_REPOSITORY="zashboard"
ECS_CLUSTER="zashboard-cluster"
ECS_SERVICE="zashboard-service"
TASK_DEFINITION="zashboard-app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Zashboard AWS Deployment${NC}"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install it first.${NC}"
    exit 1
fi

# Login to ECR
echo -e "${YELLOW}📦 Logging into AWS ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker build -t $ECR_REPOSITORY:latest .

# Tag the image
echo -e "${YELLOW}🏷️  Tagging Docker image...${NC}"
docker tag $ECR_REPOSITORY:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
docker tag $ECR_REPOSITORY:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$(git rev-parse --short HEAD)

# Push to ECR
echo -e "${YELLOW}⬆️  Pushing Docker image to ECR...${NC}"
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:$(git rev-parse --short HEAD)

# Update ECS service
echo -e "${YELLOW}🔄 Updating ECS service...${NC}"
aws ecs update-service \
    --cluster $ECS_CLUSTER \
    --service $ECS_SERVICE \
    --force-new-deployment \
    --region $AWS_REGION

echo -e "${GREEN}✅ Deployment initiated successfully!${NC}"
echo -e "${YELLOW}⏳ Waiting for deployment to complete...${NC}"

# Wait for service to stabilize
aws ecs wait services-stable \
    --cluster $ECS_CLUSTER \
    --services $ECS_SERVICE \
    --region $AWS_REGION

echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"

# Get the service URL
SERVICE_URL=$(aws ecs describe-services \
    --cluster $ECS_CLUSTER \
    --services $ECS_SERVICE \
    --region $AWS_REGION \
    --query 'services[0].loadBalancers[0].targetGroupArn' \
    --output text)

if [ "$SERVICE_URL" != "None" ]; then
    echo -e "${GREEN}🌐 Service is running!${NC}"
else
    echo -e "${YELLOW}⚠️  Service is running but load balancer info not available.${NC}"
fi
