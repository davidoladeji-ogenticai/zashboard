#!/usr/bin/env node

/**
 * RBAC Migration Runner
 *
 * Runs the RBAC system migration to add roles and permissions
 * to the Zashboard database.
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
  console.log('🚀 Starting RBAC system migration...\n')

  try {
    // Test connection
    const client = await pool.connect()
    console.log('✅ Database connection successful')

    // Read migration file
    const migrationPath = join(__dirname, '../src/lib/database/migrations/001_rbac_system.sql')
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
        AND table_name IN ('roles', 'permissions', 'role_permissions', 'user_roles', 'audit_log')
      ORDER BY table_name
    `)

    console.log('\n✅ RBAC tables created:')
    result.rows.forEach(row => console.log(`   - ${row.table_name}`))

    // Check predefined roles
    const rolesResult = await client.query('SELECT name, display_name, level FROM roles ORDER BY level DESC')
    console.log('\n✅ Predefined roles:')
    rolesResult.rows.forEach(role => console.log(`   - ${role.display_name} (${role.name}) - Level ${role.level}`))

    // Check permissions count
    const permCount = await client.query('SELECT COUNT(*) as count FROM permissions')
    console.log(`\n✅ Permissions created: ${permCount.rows[0].count}`)

    // Check users table updates
    const usersCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('registration_source', 'source_metadata', 'registration_ip')
    `)
    console.log('\n✅ Users table updates:')
    usersCheck.rows.forEach(col => console.log(`   - ${col.column_name} column added`))

    client.release()
    console.log('\n🎉 RBAC migration completed successfully!\n')
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
