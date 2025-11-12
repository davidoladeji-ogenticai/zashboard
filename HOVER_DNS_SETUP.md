# Setting Up zashboard.ai with AWS Route 53 (Domain at Hover)

Quick guide to connect your Hover domain **zashboard.ai** to AWS.

## Step 1: Create Route 53 Hosted Zone in AWS

```bash
# Set your domain
export DOMAIN="zashboard.ai"
export AWS_REGION="us-east-1"

# Create hosted zone
aws route53 create-hosted-zone \
  --name $DOMAIN \
  --caller-reference $(date +%s)

# Get the hosted zone ID
export HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name \
  --dns-name $DOMAIN \
  --query 'HostedZones[0].Id' \
  --output text | cut -d'/' -f3)

echo "Hosted Zone ID: $HOSTED_ZONE_ID"

# Get your AWS nameservers
aws route53 get-hosted-zone \
  --id $HOSTED_ZONE_ID \
  --query 'DelegationSet.NameServers' \
  --output table
```

**You'll get 4 nameservers like:**
```
ns-1234.awsdns-56.org
ns-789.awsdns-12.com
ns-345.awsdns-67.net
ns-890.awsdns-34.co.uk
```

**📝 Copy these 4 nameservers - you'll need them in the next step.**

---

## Step 2: Update Nameservers at Hover

### Via Hover Website (Easiest)

1. **Log into Hover**: https://www.hover.com/signin
2. Click on **zashboard.ai** in your domain list
3. Click the **DNS** tab or **Edit DNS**
4. Scroll down to **Nameservers** section
5. Click **Edit** next to Nameservers
6. Select **Use custom nameservers** (or similar option)
7. **Delete** all existing Hover nameservers
8. **Add** the 4 AWS nameservers (one per line):
   ```
   ns-1234.awsdns-56.org
   ns-789.awsdns-12.com
   ns-345.awsdns-67.net
   ns-890.awsdns-34.co.uk
   ```
9. Click **Save** or **Update Nameservers**

### Important Notes:
- ⚠️ **Remove ALL Hover nameservers** - only AWS nameservers should remain
- Hover may show a warning that you're using external nameservers - this is expected
- DNS propagation typically takes **15 minutes to 2 hours** with Hover (faster than most registrars)

---

## Step 3: Verify DNS Propagation

```bash
# Check if nameservers have updated (run every few minutes)
dig NS zashboard.ai +short

# Should show your AWS nameservers
# Keep checking until you see AWS nameservers instead of Hover's
```

**Or use online tool:**
- https://www.whatsmydns.net/#NS/zashboard.ai

Wait until **most locations** show your AWS nameservers (green checkmarks).

---

## Step 4: Request SSL Certificate

Once DNS is propagating (you see some AWS nameservers), request the certificate:

```bash
# Request certificate
aws acm request-certificate \
  --domain-name zashboard.ai \
  --subject-alternative-names "*.zashboard.ai" \
  --validation-method DNS \
  --region $AWS_REGION

# Get certificate ARN
export CERT_ARN=$(aws acm list-certificates \
  --region $AWS_REGION \
  --query "CertificateSummaryList[?DomainName=='zashboard.ai'].CertificateArn" \
  --output text)

echo "Certificate ARN: $CERT_ARN"
```

---

## Step 5: Add DNS Validation Record

```bash
# Get validation record details
export VALIDATION_NAME=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region $AWS_REGION \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord.Name' \
  --output text)

export VALIDATION_VALUE=$(aws acm describe-certificate \
  --certificate-arn $CERT_ARN \
  --region $AWS_REGION \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord.Value' \
  --output text)

echo "Validation Record:"
echo "Name: $VALIDATION_NAME"
echo "Type: CNAME"
echo "Value: $VALIDATION_VALUE"

# Add validation record to Route 53
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

echo "✅ Validation record added"
echo "⏳ Waiting for certificate validation (5-30 minutes)..."

# Wait for validation
aws acm wait certificate-validated \
  --certificate-arn $CERT_ARN \
  --region $AWS_REGION

echo "✅ Certificate validated and ready to use!"
```

---

## Step 6: Continue with AWS Deployment

Now continue with the main deployment guide: [DOMAIN_SETUP_GUIDE.md](./DOMAIN_SETUP_GUIDE.md)

Start from **"Step 4: Set Up VPC and Security Groups"**

---

## Troubleshooting

### DNS not updating after 2 hours?

**Check Hover:**
1. Log into Hover
2. Go to zashboard.ai → DNS tab
3. Verify only AWS nameservers are listed
4. Make sure no old Hover nameservers remain

**Force DNS check:**
```bash
# Check what nameservers are authoritative
dig zashboard.ai NS @8.8.8.8

# Check from different DNS servers
dig zashboard.ai NS @1.1.1.1
dig zashboard.ai NS @208.67.222.222
```

### Hover-Specific Tips:

✅ **Hover is DNS-friendly** - they don't lock you in
✅ **Fast propagation** - usually 15-60 minutes
✅ **No waiting period** - changes are immediate
✅ **Keep domain at Hover** - no need to transfer to AWS (saves $12/year)

### Common Hover Issues:

1. **"DNS Template" applied**:
   - Hover may have a DNS template active
   - You must **remove** the template or it will override your nameservers
   - Go to DNS tab → Check for "Template" section → Remove/Disable it

2. **DNSSEC enabled**:
   - If DNSSEC is enabled, disable it before changing nameservers
   - Go to domain settings → DNSSEC → Disable
   - Wait 1-2 hours, then change nameservers

3. **Subdomains configured**:
   - If you have existing DNS records (A, CNAME, etc.) at Hover, they'll be ignored once you switch to AWS nameservers
   - You'll need to recreate them in Route 53

---

## Quick Reference: Hover vs AWS

| Feature | Hover | AWS Route 53 |
|---------|-------|--------------|
| Nameservers | ns1.hover.com, ns2.hover.com | ns-xxxx.awsdns-xx.org (4 servers) |
| DNS Records | Hover DNS panel | AWS Route 53 console |
| SSL Certificates | Manual purchase | Free with ACM |
| Propagation Time | 15-60 minutes | 15 minutes-2 hours |
| Cost | Included with domain | $0.50/month + queries |

---

## What Happens After Nameserver Update?

✅ **Domain registration** stays at Hover (you keep paying Hover for the domain)
✅ **DNS management** moves to AWS Route 53
✅ **All DNS records** must be created in Route 53 (Hover DNS is ignored)
✅ **Email hosting** (if you have it) needs MX records added to Route 53

---

## Need Help?

**Hover Support:**
- Email: help@hover.com
- Live Chat: Available in dashboard
- They're very helpful with nameserver changes

**Quick Test:**
Once nameservers are updated, visit:
```
https://dnschecker.org/#NS/zashboard.ai
```

You should see AWS nameservers propagating worldwide.

---

## Next Steps

1. ✅ Create Route 53 hosted zone (Step 1)
2. ✅ Update nameservers at Hover (Step 2)
3. ⏳ Wait for DNS propagation (15-60 minutes)
4. ✅ Request SSL certificate (Step 4)
5. ✅ Validate certificate (Step 5)
6. 🚀 Deploy application (see [DOMAIN_SETUP_GUIDE.md](./DOMAIN_SETUP_GUIDE.md))

**Ready to start?** Run the commands in Step 1 above!
