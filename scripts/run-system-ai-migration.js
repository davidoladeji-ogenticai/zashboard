#!/usr/bin/env node

/**
 * Migration Script: System AI Configuration
 *
 * Creates system-wide AI configuration table that platform admins can manage.
 * Organization configs override system config when present.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgres://localhost/zashboard'
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();

    console.log('📋 Reading migration file...');
    const migrationPath = path.join(__dirname, '../src/lib/database/migrations/004_system_ai_config.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running migration 004: System AI Config...');
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Summary:');
    console.log('  ✓ Created system_ai_config table');
    console.log('  ✓ Inserted default system configuration');
    console.log('  ✓ Platform admins can now set system-wide AI config');
    console.log('  ✓ Org configs override system config when present');
    console.log('');
    console.log('New API Endpoints:');
    console.log('  GET  /api/ai-config          - View system config');
    console.log('  PUT  /api/ai-config          - Update system config (platform admin)');
    console.log('  GET  /api/ai/config          - Unified config for Zing (org → system)');
    console.log('');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
