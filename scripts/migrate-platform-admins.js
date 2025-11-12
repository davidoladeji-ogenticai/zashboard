/**
 * Migrate Platform Admin Roles
 *
 * This script sets up platform admin roles for existing users
 * by updating both the local database and Clerk user metadata.
 *
 * Run: node scripts/migrate-platform-admins.js
 */

const { Pool } = require('pg')

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || process.env.CLERK_SECRET
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://zashboard_user:zashboard_secure_password@localhost:5432/zashboard_db'

if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY environment variable is not set')
  process.exit(1)
}

// Helper to call Clerk API
async function clerkAPI(endpoint, method = 'GET', body = null) {
  const response = await fetch(`https://api.clerk.com/v1${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  })

  if (!response.ok) {
    throw new Error(`Clerk API error: ${response.status} ${await response.text()}`)
  }

  return response.json()
}

// Initialize database connection
const pool = new Pool({ connectionString: DATABASE_URL })

// Define platform admins (users who should have platform-level access)
const PLATFORM_ADMINS = [
  'david@zashboard.ai',  // Add other platform admin emails here
]

async function migratePlatformAdmins() {
  console.log('🚀 Migrating platform admin roles...\n')

  try {
    for (const email of PLATFORM_ADMINS) {
      console.log(`Processing: ${email}`)

      // 1. Find user in Clerk
      const clerkUsers = await clerkAPI(`/users?email_address=${encodeURIComponent(email)}`)

      if (!clerkUsers || clerkUsers.length === 0) {
        console.log(`  ⚠️  User not found in Clerk: ${email}`)
        continue
      }

      const clerkUser = clerkUsers[0]
      console.log(`  ✓ Found in Clerk: ${clerkUser.id}`)

      // 2. Update Clerk user metadata
      console.log(`  → Updating Clerk metadata...`)
      await clerkAPI(`/users/${clerkUser.id}`, 'PATCH', {
        public_metadata: {
          ...clerkUser.public_metadata,
          platform_role: 'super_admin'
        }
      })
      console.log(`  ✓ Clerk metadata updated`)

      // 3. Update local database
      console.log(`  → Updating local database...`)
      const result = await pool.query(
        'UPDATE users SET role = $1 WHERE id = $2 RETURNING email, role',
        ['super_admin', clerkUser.id]
      )

      if (result.rowCount > 0) {
        console.log(`  ✓ Database updated: ${result.rows[0].email} → ${result.rows[0].role}`)
      } else {
        console.log(`  ⚠️  User not found in local database`)
      }

      console.log(`  ✅ Complete\n`)
    }

    // 4. Verify platform admins
    console.log('═══════════════════════════════════════════════════════════')
    console.log('📊 Platform Admin Verification:')
    console.log('═══════════════════════════════════════════════════════════\n')

    const platformAdmins = await pool.query(
      "SELECT id, email, name, role FROM users WHERE role IN ('super_admin', 'admin') ORDER BY role DESC"
    )

    if (platformAdmins.rows.length > 0) {
      console.log('Platform Admins:')
      platformAdmins.rows.forEach(admin => {
        console.log(`  • ${admin.email} (${admin.name})`)
        console.log(`    Role: ${admin.role}`)
        console.log(`    ID: ${admin.id}\n`)
      })
    } else {
      console.log('  No platform admins found in database\n')
    }

    // 5. Check organization roles
    console.log('═══════════════════════════════════════════════════════════')
    console.log('📊 Organization Super Admins:')
    console.log('═══════════════════════════════════════════════════════════\n')

    const orgAdmins = await pool.query(`
      SELECT
        u.email,
        u.name,
        o.name as org_name,
        om.role as org_role,
        r.name as rbac_role,
        r.level as rbac_level
      FROM organization_memberships om
      JOIN users u ON om.user_id = u.id
      JOIN organizations o ON om.organization_id = o.id
      LEFT JOIN organization_user_roles our ON our.user_id = u.id AND our.organization_id = o.id
      LEFT JOIN organization_roles r ON our.role_id = r.id
      WHERE om.role = 'super_admin' OR r.level >= 100
      ORDER BY u.email, o.name
    `)

    if (orgAdmins.rows.length > 0) {
      console.log('Organization Super Admins:')
      orgAdmins.rows.forEach(admin => {
        console.log(`  • ${admin.email} (${admin.name})`)
        console.log(`    Organization: ${admin.org_name}`)
        console.log(`    Membership Role: ${admin.org_role}`)
        if (admin.rbac_role) {
          console.log(`    RBAC Role: ${admin.rbac_role} (level ${admin.rbac_level})`)
        }
        console.log()
      })
    } else {
      console.log('  No organization super admins found\n')
    }

    console.log('═══════════════════════════════════════════════════════════')
    console.log('✅ Migration Complete!')
    console.log('═══════════════════════════════════════════════════════════\n')

    console.log('Next Steps:')
    console.log('1. Verify platform admins can access /admin/* routes')
    console.log('2. Verify platform admins can VIEW all organizations')
    console.log('3. Assign org:super_admin role in Clerk for org management')
    console.log('4. Test that org super_admins can manage their orgs\n')

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migratePlatformAdmins().catch(console.error)
