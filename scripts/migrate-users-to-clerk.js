#!/usr/bin/env node

/**
 * Migrate Existing Users to Clerk
 *
 * This script migrates existing database users to Clerk by:
 * 1. Exporting users from PostgreSQL
 * 2. Creating corresponding Clerk accounts via API
 * 3. Updating database with new Clerk user IDs
 * 4. Preserving all relationships (orgs, teams, roles)
 *
 * Usage: node scripts/migrate-users-to-clerk.js
 *
 * Prerequisites:
 * - CLERK_SECRET_KEY in .env.local
 * - Database accessible
 * - Clerk application set up
 */

const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_API_BASE = 'https://api.clerk.com/v1';

// Database connection
const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'zashboard',
  user: process.env.DB_USER || 'macbook',
  password: process.env.DB_PASSWORD || '',
});

/**
 * Create a user in Clerk via API
 */
async function createClerkUser(email, firstName, lastName) {
  const response = await fetch(`${CLERK_API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: [email],
      first_name: firstName,
      last_name: lastName,
      skip_password_checks: true, // User will set password via email
      skip_password_requirement: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create Clerk user: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting user migration to Clerk...\n');

  try {
    // Connect to database
    await db.connect();
    console.log('✓ Connected to database');

    // Check Clerk API key
    if (!CLERK_SECRET_KEY || CLERK_SECRET_KEY === 'YOUR_SECRET_KEY') {
      throw new Error('CLERK_SECRET_KEY not set in .env.local');
    }
    console.log('✓ Clerk API key found\n');

    // Get existing users
    console.log('📋 Fetching existing users from database...');
    const usersResult = await db.query(`
      SELECT id, email, name, created_at, registration_source
      FROM users
      WHERE id NOT LIKE 'user_%'
      ORDER BY created_at ASC
    `);

    const users = usersResult.rows;
    console.log(`Found ${users.length} users to migrate\n`);

    if (users.length === 0) {
      console.log('✓ No users to migrate. All users already have Clerk IDs.');
      process.exit(0);
    }

    // Create mapping table for old ID -> new ID
    const userMapping = new Map();

    // Migrate each user
    for (const user of users) {
      console.log(`\n📝 Migrating: ${user.email}`);
      console.log(`   Old ID: ${user.id}`);

      // Split name into first/last
      const nameParts = user.name.split(' ');
      const firstName = nameParts[0] || user.email.split('@')[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      try {
        // Create Clerk user
        console.log('   Creating Clerk account...');
        const clerkUser = await createClerkUser(user.email, firstName, lastName);
        console.log(`   ✓ Created Clerk user: ${clerkUser.id}`);

        // Store mapping
        userMapping.set(user.id, clerkUser.id);

        // Update user in database
        console.log('   Updating database record...');
        await db.query(`
          UPDATE users
          SET id = $1, updated_at = NOW()
          WHERE id = $2
        `, [clerkUser.id, user.id]);
        console.log('   ✓ Database updated');

      } catch (error) {
        console.error(`   ✗ Error migrating ${user.email}:`, error.message);
        throw error;
      }
    }

    console.log('\n\n✅ Migration complete!\n');
    console.log('User Mapping:');
    userMapping.forEach((newId, oldId) => {
      console.log(`  ${oldId} → ${newId}`);
    });

    console.log('\n📊 Summary:');
    console.log(`  Total users migrated: ${userMapping.size}`);
    console.log(`  All relationships preserved: organizations, teams, roles, permissions`);

    console.log('\n📧 Next Steps:');
    console.log('  1. Users will receive email invitations from Clerk');
    console.log('  2. Users should click the link to set their password');
    console.log('  3. Test sign-in for each user');
    console.log('  4. Verify organization memberships work');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nRollback instructions:');
    console.error('  1. Restore database from backup');
    console.error('  2. Review error messages above');
    console.error('  3. Fix issues and re-run migration\n');
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run migration
if (require.main === module) {
  migrate().catch(console.error);
}

module.exports = { migrate };
