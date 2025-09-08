#!/usr/bin/env node

/**
 * Database initialization script for Zashboard
 * 
 * This script creates the PostgreSQL database and initializes the schema.
 * 
 * Usage:
 *   node scripts/init-db.js
 * 
 * Environment variables:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */

const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  // Don't specify database initially to create it
}

const dbName = process.env.DB_NAME || 'zashboard'

async function createDatabase() {
  console.log('🔧 Initializing Zashboard Database...')
  
  // Connect to PostgreSQL without specifying database
  const pool = new Pool(config)
  
  try {
    // Check if database exists
    console.log(`📋 Checking if database "${dbName}" exists...`)
    const dbCheck = await pool.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    )
    
    if (dbCheck.rows.length === 0) {
      // Create database
      console.log(`📦 Creating database "${dbName}"...`)
      await pool.query(`CREATE DATABASE "${dbName}"`)
      console.log(`✅ Database "${dbName}" created successfully`)
    } else {
      console.log(`ℹ️  Database "${dbName}" already exists`)
    }
    
    await pool.end()
    
    // Now connect to the specific database to create schema
    const dbPool = new Pool({
      ...config,
      database: dbName
    })
    
    try {
      // Read schema file
      console.log('📖 Reading database schema...')
      const schemaPath = path.join(__dirname, '../src/lib/database/schema.sql')
      const schema = fs.readFileSync(schemaPath, 'utf8')
      
      // Execute schema
      console.log('🏗️  Executing database schema...')
      await dbPool.query(schema)
      console.log('✅ Database schema created successfully')
      
      // Check if tables were created
      const tableCheck = await dbPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `)
      
      console.log('📋 Created tables:')
      tableCheck.rows.forEach(row => {
        console.log(`  - ${row.table_name}`)
      })
      
      // Check if views were created
      const viewCheck = await dbPool.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `)
      
      if (viewCheck.rows.length > 0) {
        console.log('📊 Created views:')
        viewCheck.rows.forEach(row => {
          console.log(`  - ${row.table_name}`)
        })
      }
      
      console.log('')
      console.log('🎉 Database initialization completed successfully!')
      console.log('')
      console.log('📡 Connection details:')
      console.log(`  Host: ${config.host}`)
      console.log(`  Port: ${config.port}`)
      console.log(`  Database: ${dbName}`)
      console.log(`  User: ${config.user}`)
      console.log('')
      console.log('🚀 You can now start the application with: pnpm dev')
      
    } catch (error) {
      console.error('❌ Failed to create schema:', error.message)
      console.error('Stack:', error.stack)
      process.exit(1)
    } finally {
      await dbPool.end()
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message)
    console.error('Stack:', error.stack)
    console.log('')
    console.log('💡 Make sure PostgreSQL is running and the connection details are correct.')
    console.log('💡 Check your .env.local file for database configuration.')
    process.exit(1)
  }
}

async function testConnection() {
  console.log('🔍 Testing database connection...')
  
  const pool = new Pool({
    ...config,
    database: dbName
  })
  
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as postgres_version')
    console.log('✅ Database connection successful')
    console.log(`⏰ Server time: ${result.rows[0].current_time}`)
    console.log(`🐘 PostgreSQL version: ${result.rows[0].postgres_version}`)
    console.log('')
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--test') || args.includes('-t')) {
    await testConnection()
  } else {
    await createDatabase()
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})