#!/usr/bin/env node

/**
 * Organizations System Migration Runner
 *
 * Runs the organizations system migration to add multi-organization
 * support to the Zashboard database.
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
  console.log('🚀 Starting Organizations system migration...\n')

  try {
    // Test connection
    const client = await pool.connect()
    console.log('✅ Database connection successful')

    // Read migration file
    const migrationPath = join(__dirname, '../src/lib/database/migrations/002_organizations_system.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    console.log('✅ Migration file loaded')

    // Execute migration
    console.log('\n📝 Executing migration...')
    await client.query(migrationSQL)
    console.log('✅ Migration executed successfully')

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'organizations',
          'organization_memberships',
          'teams',
          'team_members',
          'organization_spaces',
          'organization_ai_configs',
          'user_preferences'
        )
      ORDER BY table_name
    `)

    console.log('\n✅ Organization tables created:')
    result.rows.forEach(row => console.log(`   - ${row.table_name}`))

    // Check default organization
    const orgResult = await client.query('SELECT name, slug, size FROM organizations ORDER BY created_at LIMIT 1')
    if (orgResult.rows.length > 0) {
      console.log('\n✅ Default organization:')
      console.log(`   - ${orgResult.rows[0].name} (${orgResult.rows[0].slug})`)
    }

    // Check AI configs table
    const aiConfigCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'organization_ai_configs'
        AND column_name IN ('welcome_messages', 'welcome_title', 'enabled')
      ORDER BY column_name
    `)
    console.log('\n✅ AI config columns:')
    aiConfigCheck.rows.forEach(col => console.log(`   - ${col.column_name} (${col.data_type})`))

    // Check user preferences table
    const prefCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_preferences'
        AND column_name IN ('active_organization_id', 'org_space_preferences')
      ORDER BY column_name
    `)
    console.log('\n✅ User preferences columns:')
    prefCheck.rows.forEach(col => console.log(`   - ${col.column_name}`))

    client.release()
    console.log('\n🎉 Organizations migration completed successfully!\n')
    console.log('📋 Next steps:')
    console.log('   1. Users can now be added to organizations')
    console.log('   2. Super admins can configure AI welcome messages')
    console.log('   3. Organizations can be linked to Zing Browser spaces')
    console.log('')
    process.exit(0)

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run migration
runMigration()
