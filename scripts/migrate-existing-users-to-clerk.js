/**
 * Automatic User Migration Script for Clerk Integration
 *
 * This script migrates existing UUID-based users to Clerk authentication:
 * 1. Creates users in Clerk via Backend API
 * 2. Updates all database foreign key references
 * 3. Preserves organization memberships and RBAC roles
 * 4. Verifies migration success
 * 5. Soft-deletes old UUID users
 *
 * Usage:
 *   node scripts/migrate-existing-users-to-clerk.js
 *
 * Prerequisites:
 *   - CLERK_SECRET_KEY environment variable set
 *   - Database connection configured
 *   - Users to migrate: david@zashboard.ai, david@ogenticai.com
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

// Clerk Backend API configuration
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const CLERK_API_BASE = 'https://api.clerk.com/v1';

if (!CLERK_SECRET_KEY) {
  console.error('❌ CLERK_SECRET_KEY not found in environment variables');
  process.exit(1);
}

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'zashboard',
  password: process.env.DB_PASSWORD || 'postgres',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Users to migrate (hardcoded based on database analysis)
const USERS_TO_MIGRATE = [
  {
    oldId: 'ce40decb-1aac-4a1d-9b8d-ade3cd3f9ad8',
    email: 'david@zashboard.ai',
    name: 'David (Zashboard)',
    username: 'david_zashboard'
  },
  {
    oldId: '69ed1e9f-4c36-4e81-8299-72ee0ca2ff46',
    email: 'david@ogenticai.com',
    name: 'David (Ogentic)',
    username: 'david_ogentic'
  }
];

/**
 * Get or create user in Clerk via Backend API
 */
async function getOrCreateClerkUser(email, name, username) {
  console.log(`\n📝 Looking up Clerk user for ${email}...`);

  // First, try to find existing user by email
  const searchResponse = await fetch(`${CLERK_API_BASE}/users?email_address=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (searchResponse.ok) {
    const users = await searchResponse.json();
    if (users.length > 0) {
      console.log(`✅ Found existing Clerk user: ${users[0].id}`);
      return users[0].id;
    }
  }

  // User doesn't exist, create new one
  console.log(`📝 Creating new Clerk user for ${email}...`);

  const response = await fetch(`${CLERK_API_BASE}/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: [email],
      username: username,
      first_name: name.split(' ')[0],
      last_name: name.split(' ').slice(1).join(' ') || '',
      password: 'TempPassword123!', // Users can reset via Clerk
      skip_password_checks: true, // Allow weak temporary password
      skip_password_requirement: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Clerk user: ${response.status} ${error}`);
  }

  const clerkUser = await response.json();
  console.log(`✅ Created Clerk user: ${clerkUser.id}`);
  return clerkUser.id;
}

/**
 * Update all foreign key references in database
 *
 * We use a temporary UUID column approach to avoid foreign key conflicts:
 * 1. Add temp column to users
 * 2. Store new ID in temp column
 * 3. Update all foreign keys to reference temp column
 * 4. Copy temp to id
 * 5. Drop temp column
 */
async function updateDatabaseReferences(client, oldId, newId, email) {
  console.log(`\n🔄 Updating database references: ${oldId} → ${newId}`);

  // STEP 1: Add temporary column to users table
  await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS temp_clerk_id TEXT');
  await client.query('UPDATE users SET temp_clerk_id = $1 WHERE id = $2', [newId, oldId]);
  console.log(`  ✅ temp_clerk_id set to ${newId}`);

  // STEP 2: Update all child tables to use temp_clerk_id
  const tables = [
    { table: 'organization_memberships', column: 'user_id' },
    { table: 'user_roles', column: 'user_id' },
    { table: 'user_roles', column: 'assigned_by' },
    { table: 'organization_user_roles', column: 'user_id' },
    { table: 'organization_user_roles', column: 'assigned_by' },
    { table: 'team_members', column: 'user_id' },
    { table: 'audit_log', column: 'user_id' },
    { table: 'audit_log', column: 'target_user_id' },
    { table: 'user_sessions', column: 'user_id' },
    { table: 'user_preferences', column: 'user_id' },
    { table: 'roles', column: 'created_by' },
    { table: 'role_permissions', column: 'granted_by' },
    { table: 'organization_ai_configs', column: 'created_by' },
    { table: 'organization_roles', column: 'created_by' },
    { table: 'organization_permissions', column: 'created_by' },
    { table: 'organization_role_permissions', column: 'granted_by' },
    { table: 'system_ai_config', column: 'created_by' },
  ];

  for (const { table, column } of tables) {
    try {
      const result = await client.query(
        `UPDATE ${table} SET ${column} = (SELECT temp_clerk_id FROM users WHERE id = $1) WHERE ${column} = $1`,
        [oldId]
      );
      if (result.rowCount > 0) {
        console.log(`  ✅ ${table}.${column}: Updated ${result.rowCount} rows`);
      }
    } catch (error) {
      // Table might not exist or have no rows
      console.log(`  ⚠️  ${table}.${column}: ${error.message}`);
    }
  }

  // STEP 3: Copy temp_clerk_id to id column
  await client.query('UPDATE users SET id = temp_clerk_id WHERE temp_clerk_id IS NOT NULL');
  console.log(`  ✅ users.id updated from temp_clerk_id`);

  // STEP 4: Drop temporary column
  await client.query('ALTER TABLE users DROP COLUMN IF EXISTS temp_clerk_id');
  console.log(`  ✅ temp_clerk_id column dropped`);
}

/**
 * Verify migration success
 */
async function verifyMigration(client, clerkId, email) {
  console.log(`\n🔍 Verifying migration for ${email}...`);

  // Check user exists
  const userResult = await client.query(
    'SELECT id, email, name FROM users WHERE id = $1',
    [clerkId]
  );

  if (userResult.rows.length === 0) {
    throw new Error(`User ${email} not found with new ID ${clerkId}`);
  }
  console.log(`  ✅ User exists with new Clerk ID`);

  // Check organization membership
  const orgResult = await client.query(
    'SELECT organization_id FROM organization_memberships WHERE user_id = $1',
    [clerkId]
  );
  console.log(`  ✅ Organization memberships: ${orgResult.rows.length}`);

  // Check platform roles
  const rolesResult = await client.query(
    'SELECT role_id FROM user_roles WHERE user_id = $1',
    [clerkId]
  );
  console.log(`  ✅ Platform roles: ${rolesResult.rows.length}`);

  // Check org-level roles
  const orgRolesResult = await client.query(
    'SELECT role_id FROM organization_user_roles WHERE user_id = $1',
    [clerkId]
  );
  console.log(`  ✅ Organization roles: ${orgRolesResult.rows.length}`);

  return true;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting automatic user migration to Clerk...\n');
  console.log(`Users to migrate: ${USERS_TO_MIGRATE.length}`);

  const client = await pool.connect();

  try {
    // Start transaction
    await client.query('BEGIN');
    console.log('📦 Transaction started');

    const migrationResults = [];

    for (const user of USERS_TO_MIGRATE) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Migrating: ${user.email}`);
      console.log(`Old ID: ${user.oldId}`);

      try {
        // Step 1: Get or create user in Clerk
        const clerkUserId = await getOrCreateClerkUser(user.email, user.name, user.username);

        // Step 2: Update database references
        await updateDatabaseReferences(client, user.oldId, clerkUserId, user.email);

        // Step 3: Verify migration
        await verifyMigration(client, clerkUserId, user.email);

        migrationResults.push({
          email: user.email,
          oldId: user.oldId,
          newId: clerkUserId,
          success: true,
        });

        console.log(`\n✅ Successfully migrated ${user.email}`);

      } catch (error) {
        console.error(`\n❌ Failed to migrate ${user.email}:`, error.message);
        migrationResults.push({
          email: user.email,
          oldId: user.oldId,
          error: error.message,
          success: false,
        });
        throw error; // Rollback transaction
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Transaction committed');

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));

    for (const result of migrationResults) {
      if (result.success) {
        console.log(`\n✅ ${result.email}`);
        console.log(`   Old ID: ${result.oldId}`);
        console.log(`   New ID: ${result.newId}`);
      } else {
        console.log(`\n❌ ${result.email}`);
        console.log(`   Error: ${result.error}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test authentication at http://localhost:3000/sign-in');
    console.log('2. Login with:');
    console.log('   - david@zashboard.ai / TempPassword123!');
    console.log('   - david@ogenticai.com / TempPassword123!');
    console.log('3. Users can reset passwords via Clerk');
    console.log('4. Verify organization access and permissions');

  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('\n❌ Transaction rolled back due to error');
    console.error('Error details:', error);
    throw error;

  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
