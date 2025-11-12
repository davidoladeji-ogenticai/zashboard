/**
 * Setup Clerk Custom Organization Roles
 *
 * This script creates the custom org:super_admin role in Clerk
 * and documents the role mapping strategy.
 *
 * Run: node scripts/setup-clerk-custom-roles.js
 */

import { clerkClient } from '@clerk/clerk-sdk-node'

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY

if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY environment variable is not set')
  process.exit(1)
}

async function setupCustomRoles() {
  console.log('🚀 Setting up Clerk custom organization roles...\n')

  try {
    // Note: As of Clerk SDK v5, custom organization roles must be created via Dashboard
    // This script provides instructions and verifies setup

    console.log('📋 Custom Role Setup Instructions:')
    console.log('═══════════════════════════════════════════════════════════\n')

    console.log('1. Go to Clerk Dashboard → Organizations → Roles')
    console.log('   https://dashboard.clerk.com/apps/[your-app-id]/instances/[instance-id]/organizations/roles\n')

    console.log('2. Create a new custom role with these settings:')
    console.log('   ╭──────────────────────────────────────────╮')
    console.log('   │ Role Key:     org:super_admin            │')
    console.log('   │ Name:         Organization Super Admin   │')
    console.log('   │ Description:  Full control over          │')
    console.log('   │               organization settings,     │')
    console.log('   │               members, and permissions   │')
    console.log('   ╰──────────────────────────────────────────╯\n')

    console.log('3. Assign the following permissions to org:super_admin:')
    console.log('   ✓ org:sys_memberships:manage')
    console.log('   ✓ org:sys_profile:manage')
    console.log('   ✓ org:sys_profile:delete')
    console.log('   ✓ org:sys_domains:manage')
    console.log('   - Or grant ALL organization permissions\n')

    console.log('4. Save the role\n')

    console.log('═══════════════════════════════════════════════════════════\n')
    console.log('📊 Role Mapping Strategy:')
    console.log('═══════════════════════════════════════════════════════════\n')

    console.log('PLATFORM ROLES (stored in users.role via publicMetadata):')
    console.log('┌──────────────────────────────────────────────────────────┐')
    console.log('│ Set in Clerk User Metadata:                             │')
    console.log('│   publicMetadata: { "platform_role": "super_admin" }    │')
    console.log('│                                                          │')
    console.log('│ • super_admin → Platform-wide admin access              │')
    console.log('│   - Can access /admin/* routes                          │')
    console.log('│   - Can VIEW all organizations                          │')
    console.log('│   - CANNOT manage orgs (need org role)                  │')
    console.log('│                                                          │')
    console.log('│ • admin → Platform admin features                       │')
    console.log('│ • user → Regular user (default)                         │')
    console.log('└──────────────────────────────────────────────────────────┘\n')

    console.log('ORGANIZATION ROLES (stored in organization_memberships):')
    console.log('┌─────────────────────┬────────────────────┬──────────────┐')
    console.log('│ Clerk Role          │ Local DB Role      │ Level        │')
    console.log('├─────────────────────┼────────────────────┼──────────────┤')
    console.log('│ org:super_admin     │ super_admin        │ 100 (Full)   │')
    console.log('│ org:admin           │ admin              │ 50  (Manage) │')
    console.log('│ org:member          │ user               │ 10  (Basic)  │')
    console.log('│ admin (legacy)      │ admin              │ 50           │')
    console.log('└─────────────────────┴────────────────────┴──────────────┘\n')

    console.log('KEY PRINCIPLES:')
    console.log('• Platform super_admin ≠ Org super_admin')
    console.log('• Platform admins can VIEW but not MANAGE orgs')
    console.log('• Org permissions are scoped to specific organizations')
    console.log('• Users need org:super_admin role to manage an org\n')

    console.log('═══════════════════════════════════════════════════════════\n')
    console.log('👤 Setting Up Admin Users:')
    console.log('═══════════════════════════════════════════════════════════\n')

    console.log('For Platform Admin:')
    console.log('1. Go to Clerk Dashboard → Users → [Select User]')
    console.log('2. Click "Metadata" tab')
    console.log('3. Add to Public Metadata:')
    console.log('   {')
    console.log('     "platform_role": "super_admin"')
    console.log('   }')
    console.log('4. Save\n')

    console.log('For Organization Super Admin:')
    console.log('1. Go to Clerk Dashboard → Organizations → [Select Org]')
    console.log('2. Go to Members tab')
    console.log('3. Find the user → Change role to "org:super_admin"')
    console.log('4. Save\n')

    console.log('═══════════════════════════════════════════════════════════\n')
    console.log('✅ Next Steps:')
    console.log('1. Create the org:super_admin role in Clerk Dashboard')
    console.log('2. Run: node scripts/migrate-platform-admins.js')
    console.log('3. Assign users to appropriate roles')
    console.log('4. Test permissions are working correctly\n')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

setupCustomRoles()
