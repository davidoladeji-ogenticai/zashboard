/**
 * Sync Existing Clerk Organizations to Local Database
 *
 * This script fetches all organizations and memberships from Clerk
 * and syncs them to the local PostgreSQL database.
 *
 * Usage: npm run clerk:sync
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClerkClient } = require('@clerk/nextjs/server');
const { Client } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'zashboard',
  user: process.env.DB_USER || 'macbook',
  password: process.env.DB_PASSWORD || ''
};

async function main() {
  console.log('🔄 Starting Clerk organization sync...\n');

  // Initialize database connection
  const db = new Client(dbConfig);
  await db.connect();
  console.log('✅ Connected to database');

  try {
    // Initialize Clerk client
    const clerkClient = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY
    });

    // Fetch all organizations from Clerk
    console.log('\n📋 Fetching organizations from Clerk...');
    const organizations = await clerkClient.organizations.getOrganizationList({ limit: 100 });

    console.log(`Found ${organizations.data.length} organizations in Clerk`);
    console.log(`Total count: ${organizations.totalCount}`);

    if (organizations.data.length === 0) {
      console.log('\n⚠️  No organizations found in Clerk.');
      console.log('   This could mean:');
      console.log('   1. No organizations have been created in Clerk yet');
      console.log('   2. Organizations feature may not be enabled in your Clerk instance');
      console.log('   3. The API key may not have permission to access organizations');
      console.log('\n   Please check your Clerk dashboard at:');
      console.log('   https://dashboard.clerk.com/apps/app_35LM4lHBSMQSbnjUvPVZvajwm4X/instances/ins_35LM4neSDnyScWmN53pTuabgY9V/organizations\n');
    }

    let orgsSynced = 0;
    let membershipsSynced = 0;

    for (const org of organizations.data) {
      console.log(`\n📦 Processing organization: ${org.name} (${org.id})`);

      // Sync organization to database
      await db.query(
        `INSERT INTO organizations (
          id,
          name,
          slug,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $4)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          slug = EXCLUDED.slug,
          updated_at = NOW()`,
        [
          org.id,
          org.name,
          org.slug || org.name.toLowerCase().replace(/\s+/g, '-'),
          new Date(org.createdAt)
        ]
      );
      orgsSynced++;
      console.log(`  ✓ Organization synced to database`);

      // Fetch organization memberships
      console.log(`  📋 Fetching memberships...`);
      const memberships = await clerkClient.organizations.getOrganizationMembershipList({
        organizationId: org.id,
        limit: 100
      });

      console.log(`  Found ${memberships.data.length} members`);

      // Sync memberships
      for (const membership of memberships.data) {
        const userId = membership.publicUserData.userId;
        const role = membership.role;

        // Map Clerk roles to our system roles
        const roleMapping = {
          'org:admin': 'admin',
          'org:member': 'user',
          'admin': 'super_admin'
        };
        const mappedRole = roleMapping[role] || 'user';

        // Check if user exists in database
        const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [userId]);

        if (userCheck.rows.length === 0) {
          console.log(`  ⚠️  User ${userId} not found in database, fetching from Clerk...`);

          try {
            const clerkUser = await clerkClient.users.getUser(userId);
            const primaryEmail = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId);

            if (primaryEmail) {
              const email = primaryEmail.emailAddress;
              const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email;

              await db.query(
                `INSERT INTO users (id, email, name, registration_source, created_at, updated_at, is_active)
                 VALUES ($1, $2, $3, 'web', NOW(), NOW(), true)
                 ON CONFLICT (id) DO NOTHING`,
                [userId, email, name]
              );
              console.log(`  ✓ User ${email} created in database`);
            }
          } catch (userError) {
            console.error(`  ✗ Failed to fetch/create user ${userId}:`, userError.message);
            continue;
          }
        }

        // Insert membership
        await db.query(
          `INSERT INTO organization_memberships (
            user_id,
            organization_id,
            role,
            joined_at
          )
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, organization_id) DO UPDATE SET
            role = EXCLUDED.role,
            last_accessed_at = NOW()`,
          [userId, org.id, mappedRole, new Date(membership.createdAt)]
        );

        membershipsSynced++;
        console.log(`  ✓ Membership synced: ${membership.publicUserData.identifier} as ${mappedRole}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Sync completed successfully!');
    console.log(`  Organizations synced: ${orgsSynced}`);
    console.log(`  Memberships synced: ${membershipsSynced}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    throw error;
  } finally {
    await db.end();
    console.log('\n✅ Database connection closed');
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});