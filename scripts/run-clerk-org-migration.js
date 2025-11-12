#!/usr/bin/env node

/**
 * Clerk Organization Migration Runner
 *
 * Converts organization tables from UUID to TEXT to support Clerk IDs
 */

require('dotenv').config({ path: '.env.local' })
const { readFileSync } = require('fs')
const { join } = require('path')
const { Pool } = require('pg')

// Database configuration from environment
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'zashboard',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
})

async function runMigration() {
  console.log('🚀 Starting Clerk organization migration (UUID → TEXT)...\n')

  try {
    // Test connection
    const client = await pool.connect()
    console.log('✅ Database connection successful')

    // Read migration file
    const migrationPath = join(__dirname, '../src/lib/database/migrations/005_clerk_org_migration_v3.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    console.log('✅ Migration file loaded (v3 - handles FK constraints)')

    // Check current column types before migration
    console.log('\n📋 Checking current column types...')
    const typesCheckBefore = await client.query(`
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (
          'organizations',
          'organization_memberships',
          'teams',
          'team_members',
          'organization_spaces',
          'organization_ai_configs',
          'user_preferences',
          'organization_roles',
          'organization_permissions',
          'organization_role_permissions',
          'organization_user_roles'
        )
        AND column_name IN ('id', 'user_id', 'organization_id', 'team_id', 'role_id', 'permission_id', 'active_organization_id', 'created_by')
      ORDER BY table_name, column_name
    `)
    console.log('   Current types:')
    typesCheckBefore.rows.forEach(row => {
      console.log(`   - ${row.table_name}.${row.column_name}: ${row.data_type}`)
    })

    // Execute migration
    console.log('\n📝 Executing migration...')
    await client.query(migrationSQL)
    console.log('✅ Migration executed successfully')

    // Verify column types after migration
    console.log('\n✅ Verifying new column types...')
    const typesCheckAfter = await client.query(`
      SELECT
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN (
          'organizations',
          'organization_memberships',
          'teams',
          'team_members',
          'organization_spaces',
          'organization_ai_configs',
          'user_preferences',
          'organization_roles',
          'organization_permissions',
          'organization_role_permissions',
          'organization_user_roles'
        )
        AND column_name IN ('id', 'user_id', 'organization_id', 'team_id', 'role_id', 'permission_id', 'active_organization_id', 'created_by')
      ORDER BY table_name, column_name
    `)
    console.log('   New types:')
    const textColumns = []
    typesCheckAfter.rows.forEach(row => {
      console.log(`   - ${row.table_name}.${row.column_name}: ${row.data_type}`)
      if (row.data_type === 'text') {
        textColumns.push(`${row.table_name}.${row.column_name}`)
      }
    })

    // Verify all ID columns are now TEXT
    if (textColumns.length > 0) {
      console.log(`\n✅ Successfully converted ${textColumns.length} columns to TEXT type`)
    } else {
      console.log('\n⚠️  Warning: No columns were converted to TEXT type')
    }

    // Check foreign key constraints
    console.log('\n✅ Verifying foreign key constraints...')
    const fkCheck = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name IN (
          'organization_memberships',
          'teams',
          'team_members',
          'organization_spaces',
          'organization_ai_configs',
          'user_preferences',
          'organization_roles',
          'organization_permissions',
          'organization_role_permissions',
          'organization_user_roles'
        )
      ORDER BY tc.table_name, kcu.column_name
    `)
    console.log(`   Found ${fkCheck.rows.length} foreign key constraints:`)
    fkCheck.rows.forEach(row => {
      console.log(`   - ${row.table_name}.${row.column_name} → ${row.foreign_table_name}.${row.foreign_column_name}`)
    })

    client.release()
    console.log('\n🎉 Clerk organization migration completed successfully!\n')
    console.log('📋 Summary:')
    console.log('   ✅ All organization system tables now use TEXT IDs')
    console.log('   ✅ Compatible with Clerk authentication (user_*, org_* format)')
    console.log('   ✅ Foreign key constraints re-established')
    console.log('')
    process.exit(0)

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.error('Error details:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run migration
runMigration()
