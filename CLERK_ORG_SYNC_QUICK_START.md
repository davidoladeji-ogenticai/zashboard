# Clerk Organization Sync - Quick Start Guide

## ✅ Status: Working and Tested

Your Clerk organizations are now fully synchronized with your local database!

## Quick Commands

### Sync Organizations from Clerk → Local Database
```bash
npm run clerk:sync
```
**Use when:** You created/updated organizations in Clerk Dashboard

**Expected output:**
```
✅ Organizations synced: 1
✅ Memberships synced: 1
```

### Migrate Organizations from Local → Clerk
```bash
npm run clerk:migrate
```
**Use when:** You have local organizations to push to Clerk

---

## Current Status

### ✅ What's Synced
- **Organizations:** 1 (OgenticAI)
- **Memberships:** 1 (david@zashboard.ai as admin)
- **Database ID Format:** VARCHAR(255) (supports Clerk IDs)

### 📊 Verify Sync
```bash
# Check organizations
psql $DATABASE_URL -c "SELECT id, name FROM organizations;"

# Check memberships
psql $DATABASE_URL -c "
  SELECT o.name, u.email, om.role
  FROM organization_memberships om
  JOIN organizations o ON om.organization_id = o.id
  JOIN users u ON om.user_id = u.id;
"
```

---

## How It Works

### 🔄 Automatic Sync (via Webhooks)
When configured, changes in Clerk automatically sync to your local database:

1. User creates org in Clerk → Webhook fires → Local DB updated
2. User joins org in Clerk → Webhook fires → Membership created locally
3. User role changes → Webhook fires → Role updated locally

**To enable:** See [Setup Webhooks](#setup-webhooks) below

### 🔧 Manual Sync (via Scripts)
Run anytime to sync data:
- `npm run clerk:sync` - Pull latest from Clerk
- `npm run clerk:migrate` - Push local data to Clerk

---

## Setup Webhooks (Recommended)

### Step 1: Get Webhook URL
For local development, use **ngrok**:
```bash
ngrok http 3000
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

### Step 2: Configure in Clerk
1. Go to [Clerk Dashboard → Webhooks](https://dashboard.clerk.com/apps/app_35LM4lHBSMQSbnjUvPVZvajwm4X/instances/ins_35LM4neSDnyScWmN53pTuabgY9V/webhooks)
2. Click **"Add Endpoint"**
3. Set URL: `https://abc123.ngrok.io/api/webhooks/clerk`
4. Select these events:
   - ✅ `organization.created`
   - ✅ `organization.updated`
   - ✅ `organization.deleted`
   - ✅ `organizationMembership.created`
   - ✅ `organizationMembership.updated`
   - ✅ `organizationMembership.deleted`
5. Click **"Create"**
6. Copy the **Webhook Secret** (starts with `whsec_`)

### Step 3: Update Environment
Edit `.env.local`:
```bash
CLERK_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

### Step 4: Test
1. Create a test organization in Clerk Dashboard
2. Check logs in your terminal - should see webhook received
3. Visit `http://localhost:3000/organizations` - new org should appear!

---

## Troubleshooting

### ❌ "Missing Clerk Secret Key"
**Solution:** ✅ Fixed! Scripts now load `.env.local` automatically

### ❌ Organizations not appearing in app
**Solution:**
```bash
npm run clerk:sync  # Manually sync from Clerk
```

### ❌ Webhook not firing
**Checklist:**
- [ ] Webhook URL is correct (use ngrok for local dev)
- [ ] All 6 organization events are selected
- [ ] Webhook secret is in `.env.local`
- [ ] Server is running (`npm run dev`)

### ❌ UUID vs Clerk ID mismatch
**Solution:** ✅ Fixed! Database now uses VARCHAR(255) for IDs

---

## Testing Guide

### Test 1: Manual Sync
```bash
npm run clerk:sync
# Should output: Organizations synced: 1, Memberships synced: 1
```

### Test 2: View Organizations
```bash
npm run dev
# Open: http://localhost:3000/organizations
# Should show: OgenticAI with 1 member
```

### Test 3: Create New Org in Clerk
1. Go to Clerk Dashboard → Organizations
2. Click "Create Organization"
3. Run `npm run clerk:sync`
4. Refresh `/organizations` page
5. New org should appear ✅

### Test 4: Add User to Org
1. In Clerk Dashboard, add a user to organization
2. Run `npm run clerk:sync`
3. Check memberships in database:
   ```bash
   psql $DATABASE_URL -c "SELECT * FROM organization_memberships;"
   ```

---

## Files Reference

- **Webhook Handler:** [src/app/api/webhooks/clerk/route.ts](src/app/api/webhooks/clerk/route.ts)
- **Sync Script:** [scripts/sync-clerk-organizations.js](scripts/sync-clerk-organizations.js)
- **Migration Script:** [scripts/migrate-organizations-to-clerk.js](scripts/migrate-organizations-to-clerk.js)
- **Schema Migration:** [scripts/update-org-id-to-varchar.sql](scripts/update-org-id-to-varchar.sql)

---

## Role Mapping

| Clerk Role     | Local Role   |
|----------------|--------------|
| `org:admin`    | `admin`      |
| `org:member`   | `user`       |
| `admin`        | `super_admin`|

---

## Success! 🎉

Your organizations are now synced between:
- ✅ Clerk Dashboard
- ✅ Local PostgreSQL Database
- ✅ Your `/organizations` page

**Next:** Configure webhooks for real-time automatic sync!

For complete documentation, see: [CLERK_ORGANIZATION_SYNC_COMPLETE.md](CLERK_ORGANIZATION_SYNC_COMPLETE.md)
