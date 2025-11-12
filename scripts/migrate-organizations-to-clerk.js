/**
 * Migrate Local Organizations to Clerk
 *
 * This script takes existing organizations from the local PostgreSQL database
 * and creates them in Clerk, along with their memberships.
 *
 * Usage: npm run clerk:migrate
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
  console.log('🔄 Starting local organizations migration to Clerk...\n');

  // Initialize Clerk client
  const clerkClient = createClerkClient({
    secretKey: process.env.CLERK_SECRET_KEY
  });

  // Initialize database connection
  const db = new Client(dbConfig);
  await db.connect();
  console.log('✅ Connected to database');

  try {
    // Fetch all organizations from local database
    console.log('\n📋 Fetching organizations from local database...');
    const orgsResult = await db.query(`
      SELECT id, name, slug, description, created_at
      FROM organizations
      ORDER BY created_at ASC
    `);

    console.log(`Found ${orgsResult.rows.length} organizations in local database\n`);

    let orgsMigrated = 0;
    let orgsSkipped = 0;
    let membershipsMigrated = 0;

    for (const org of orgsResult.rows) {
      console.log(`\n📦 Processing organization: ${org.name} (${org.id})`);

      try {
        // Get the first super_admin or admin user to be the creator
        const creatorResult = await db.query(`
          SELECT user_id
          FROM organization_memberships
          WHERE organization_id = $1
            AND role IN ('super_admin', 'admin')
          ORDER BY joined_at ASC
          LIMIT 1
        `, [org.id]);

        if (creatorResult.rows.length === 0) {
          console.log(`  ⚠️  No admin found for organization, skipping`);
          orgsSkipped++;
          continue;
        }

        const creatorUserId = creatorResult.rows[0].user_id;
        console.log(`  ℹ️  Using user ${creatorUserId} as creator`);

        // Check if organization already exists in Clerk
        let clerkOrg;
        try {
          clerkOrg = await clerkClient.organizations.getOrganization({ organizationId: org.id });
          console.log(`  ℹ️  Organization already exists in Clerk, skipping creation`);
          orgsSkipped++;
        } catch (error) {
          // Organization doesn't exist, create it
          if (error.status === 404 || error.message.includes('not found')) {
            console.log(`  ⚙️  Creating organization in Clerk...`);

            // Try creating with slug first, if that fails, create without slug
            try {
              clerkOrg = await clerkClient.organizations.createOrganization({
                name: org.name,
                slug: org.slug,
                createdBy: creatorUserId,
              });
            } catch (slugError) {
              if (slugError.errors?.[0]?.code === 'organization_slugs_disabled') {
                console.log(`  ℹ️  Slugs not enabled, creating without slug...`);
                clerkOrg = await clerkClient.organizations.createOrganization({
                  name: org.name,
                  createdBy: creatorUserId,
                });
              } else {
                throw slugError;
              }
            }

            console.log(`  ✓ Organization created in Clerk with ID: ${clerkOrg.id}`);

            // If Clerk generated a different ID, we need to update our local database
            if (clerkOrg.id !== org.id) {
              console.log(`  ⚠️  Clerk generated different ID (${clerkOrg.id}), updating local database...`);

              // Update the organization ID in local database
              await db.query('UPDATE organizations SET id = $1 WHERE id = $2', [clerkOrg.id, org.id]);

              // Update foreign key references in organization_memberships
              await db.query('UPDATE organization_memberships SET organization_id = $1 WHERE organization_id = $2', [clerkOrg.id, org.id]);

              // Update foreign key references in other tables
              await db.query('UPDATE organization_ai_configs SET organization_id = $1 WHERE organization_id = $2', [clerkOrg.id, org.id]).catch(() => {});
              await db.query('UPDATE organization_spaces SET organization_id = $1 WHERE organization_id = $2', [clerkOrg.id, org.id]).catch(() => {});
              await db.query('UPDATE teams SET organization_id = $1 WHERE organization_id = $2', [clerkOrg.id, org.id]).catch(() => {});
              await db.query('UPDATE organization_user_roles SET organization_id = $1 WHERE organization_id = $2', [clerkOrg.id, org.id]).catch(() => {});
              await db.query('UPDATE user_preferences SET active_organization_id = $1 WHERE active_organization_id = $2', [clerkOrg.id, org.id]).catch(() => {});

              console.log(`  ✓ Local database updated with Clerk ID`);
            }

            orgsMigrated++;
          } else {
            throw error;
          }
        }

        // Fetch memberships for this organization from local database
        console.log(`  📋 Fetching memberships from local database...`);
        const membershipsResult = await db.query(`
          SELECT om.user_id, om.role, u.email, u.name
          FROM organization_memberships om
          JOIN users u ON om.user_id = u.id
          WHERE om.organization_id = $1
          ORDER BY om.joined_at ASC
        `, [clerkOrg.id]);

        console.log(`  Found ${membershipsResult.rows.length} members`);

        // Add members to Clerk organization
        for (const membership of membershipsResult.rows) {
          try {
            // Map our roles to Clerk roles
            const roleMapping = {
              'super_admin': 'org:admin',
              'admin': 'org:admin',
              'user': 'org:member'
            };
            const clerkRole = roleMapping[membership.role] || 'org:member';

            // Check if user already exists as a member
            try {
              const existingMemberships = await clerkClient.organizations.getOrganizationMembershipList({
                organizationId: clerkOrg.id,
                limit: 100
              });

              const existingMember = existingMemberships.data.find(
                m => m.publicUserData.userId === membership.user_id
              );

              if (existingMember) {
                console.log(`  ℹ️  User ${membership.email} is already a member, skipping`);
                continue;
              }
            } catch (error) {
              // Continue with adding the member
            }

            // Add user to organization in Clerk
            console.log(`  ⚙️  Adding ${membership.email} as ${clerkRole}...`);

            await clerkClient.organizations.createOrganizationMembership({
              organizationId: clerkOrg.id,
              userId: membership.user_id,
              role: clerkRole
            });

            membershipsMigrated++;
            console.log(`  ✓ Member added: ${membership.email} as ${clerkRole}`);

          } catch (memberError) {
            if (memberError.status === 422 || memberError.message.includes('already a member')) {
              console.log(`  ℹ️  User ${membership.email} is already a member`);
            } else if (memberError.status === 404 || memberError.message.includes('not found')) {
              console.log(`  ⚠️  User ${membership.email} (${membership.user_id}) not found in Clerk, skipping`);
            } else {
              console.error(`  ✗ Failed to add member ${membership.email}:`, memberError.message);
            }
          }
        }

      } catch (orgError) {
        console.error(`  ✗ Failed to process organization ${org.name}:`, orgError.message);
        if (orgError.errors) {
          console.error('  Error details:', JSON.stringify(orgError.errors, null, 2));
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed!');
    console.log(`  Organizations migrated: ${orgsMigrated}`);
    console.log(`  Organizations skipped (already exist): ${orgsSkipped}`);
    console.log(`  Memberships migrated: ${membershipsMigrated}`);
    console.log('='.repeat(60));

    console.log('\n📝 Next Steps:');
    console.log('  1. Run "npm run clerk:sync" to verify synchronization');
    console.log('  2. Check http://localhost:3000/organizations to see your orgs');
    console.log('  3. Configure Clerk webhooks for automatic future syncing\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    if (error.errors) {
      console.error('Error details:', JSON.stringify(error.errors, null, 2));
    }
    throw error;
  } finally {
    await db.end();
    console.log('✅ Database connection closed');
  }
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
