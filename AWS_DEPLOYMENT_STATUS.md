# AWS Deployment Status for zashboard.ai

## ✅ Completed Steps

### 1. AWS CLI Setup
- ✅ Installed AWS CLI via Homebrew
- ✅ Configured credentials (Account: 235436273845)
- ✅ Set region to us-east-1

### 2. Route 53 & DNS
- ✅ Created hosted zone: Z056534416HHTUBQH9VD3
- ✅ Got AWS nameservers
- ✅ Created A record pointing to ALB

**YOUR AWS NAMESERVERS (Update these in Hover):**
```
ns-1217.awsdns-24.org
ns-1910.awsdns-46.co.uk
ns-276.awsdns-34.com
ns-970.awsdns-57.net
```

### 3. ECR & ECS
- ✅ Created ECR repository: `235436273845.dkr.ecr.us-east-1.amazonaws.com/zashboard`
- ✅ Created ECS cluster: `zashboard-cluster`
- ✅ Created CloudWatch log group: `/ecs/zashboard-app`

### 4. SSL Certificate
- ✅ Requested certificate (ARN: `arn:aws:acm:us-east-1:235436273845:certificate/cb3a24b7-9423-4d48-a061-0e7cd99764d4`)
- ✅ Added DNS validation record to Route 53
- ⏳ **Status: PENDING_VALIDATION** (waiting for DNS propagation)

### 5. Networking
- ✅ Using default VPC: `vpc-00f9608064671ce64`
- ✅ Created ALB security group: `sg-0ffdf45f395c5317a` (allows HTTP/HTTPS from internet)
- ✅ Created ECS security group: `sg-0d2b87a33d1cb71db` (allows port 3000 from ALB)

### 6. Application Load Balancer
- ✅ Created ALB: `zashboard-alb`
- ✅ ALB DNS: `zashboard-alb-680846428.us-east-1.elb.amazonaws.com`
- ✅ Created target group: `zashboard-tg` (port 3000, health check on `/`)
- ✅ Created HTTP listener on port 80

---

## ⏳ Pending Actions

### URGENT: Update Nameservers in Hover

**You must update Hover with the correct nameservers:**

1. Go to https://www.hover.com/signin
2. Click **zashboard.ai** → **DNS** tab
3. Find **Nameservers** → Click **Edit**
4. Replace ALL nameservers with these 4:
   ```
   ns-1217.awsdns-24.org
   ns-1910.awsdns-46.co.uk
   ns-276.awsdns-34.com
   ns-970.awsdns-57.net
   ```
5. Save changes

**Current status:** Hover is pointing to different AWS nameservers. This is why the SSL certificate can't validate.

### 2. Wait for DNS Propagation (15-60 minutes after updating Hover)

Check status with:
```bash
dig NS zashboard.ai +short
```

Should show the nameservers above.

### 3. Wait for SSL Certificate Validation

Once DNS propagates, the certificate will auto-validate (5-30 minutes).

Check status:
```bash
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:235436273845:certificate/cb3a24b7-9423-4d48-a061-0e7cd99764d4 \
  --region us-east-1 \
  --query 'Certificate.Status' \
  --output text
```

Should show `ISSUED` when ready.

### 4. Add HTTPS Listener (after SSL validates)

```bash
source ~/zashboard-aws-env.sh

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

### 5. Build and Push Docker Image

```bash
source ~/zashboard-aws-env.sh
cd /Users/macbook/Downloads/projects/rair/rair-ogentic/zashboard

# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build image
docker build -t zashboard:latest .

# Tag and push
docker tag zashboard:latest $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/zashboard:latest
docker push $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/zashboard:latest
```

### 6. Create RDS PostgreSQL Database

```bash
source ~/zashboard-aws-env.sh

# Create RDS security group
RDS_SG=$(aws ec2 create-security-group \
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

# Create RDS instance (takes 10-15 minutes)
aws rds create-db-instance \
  --db-instance-identifier ${PROJECT_NAME}-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16.1 \
  --master-username zashboard_admin \
  --master-user-password "CHANGE_THIS_SECURE_PASSWORD" \
  --allocated-storage 20 \
  --storage-type gp3 \
  --vpc-security-group-ids $RDS_SG \
  --publicly-accessible false \
  --backup-retention-period 7 \
  --region $AWS_REGION
```

### 7. Create IAM Roles for ECS

```bash
# Create ECS task execution role (if doesn't exist)
aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": {"Service": "ecs-tasks.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }]
  }'

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
  }'
```

### 8. Create ECS Task Definition & Service

After Docker image is pushed and database is ready, create task definition and deploy service.

### 9. Update Clerk Webhooks

Once deployed, update Clerk Dashboard:
- Webhook URL: `https://zashboard.ai/api/webhooks/clerk`
- Homepage URL: `https://zashboard.ai`

---

## Environment Variables

All configuration saved to: `~/zashboard-aws-env.sh`

Load with:
```bash
source ~/zashboard-aws-env.sh
```

Contains:
- DOMAIN=zashboard.ai
- AWS_ACCOUNT_ID=235436273845
- AWS_REGION=us-east-1
- VPC_ID, ALB_ARN, TG_ARN, etc.

---

## Quick Commands

### Check DNS Status
```bash
dig NS zashboard.ai +short
dig zashboard.ai +short
```

### Check SSL Certificate Status
```bash
source ~/zashboard-aws-env.sh
aws acm describe-certificate --certificate-arn $CERT_ARN --region $AWS_REGION --query 'Certificate.Status'
```

### Check ALB Status
```bash
source ~/zashboard-aws-env.sh
aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --query 'LoadBalancers[0].State'
```

### View CloudWatch Logs (once deployed)
```bash
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

## Next Steps Summary

1. **Update nameservers in Hover** (URGENT - required for everything else)
2. **Wait for DNS propagation** (15-60 minutes)
3. **Wait for SSL certificate validation** (automatic once DNS propagates)
4. **Add HTTPS listener to ALB**
5. **Build and push Docker image**
6. **Create RDS database**
7. **Deploy ECS service**
8. **Update Clerk webhooks**
9. **Test https://zashboard.ai** 🎉

---

Need help? All commands are in this document and in [DOMAIN_SETUP_GUIDE.md](./DOMAIN_SETUP_GUIDE.md).
