#!/usr/bin/env node

/**
 * Setup David as Super Admin with OgenticAI Organization
 */

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

// Database configuration from environment (matching run-organizations-migration.js)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'zashboard',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function setupDavid() {
  console.log('🚀 Setting up david@ogenticai.com with OgenticAI organization...\n');

  const client = await pool.connect();

  try {
    console.log('✅ Database connection successful');

    // Make david@ogenticai.com a platform super admin
    await client.query(`UPDATE users SET role = 'super_admin' WHERE email = 'david@ogenticai.com'`);
    console.log('✅ Updated david to platform super_admin');

    // Get organization and user IDs
    const orgResult = await client.query(`SELECT id FROM organizations WHERE slug = 'ogentic-ai' LIMIT 1`);
    const userResult = await client.query(`SELECT id FROM users WHERE email = 'david@ogenticai.com' LIMIT 1`);

    if (orgResult.rows.length === 0) {
      throw new Error('OgenticAI organization not found');
    }
    if (userResult.rows.length === 0) {
      throw new Error('User david@ogenticai.com not found');
    }

    const orgId = orgResult.rows[0].id;
    const userId = userResult.rows[0].id;

    console.log(`📋 Organization ID: ${orgId}`);
    console.log(`📋 User ID: ${userId}`);

    // Add david as super_admin member
    await client.query(`
      INSERT INTO organization_memberships (organization_id, user_id, role)
      VALUES ($1, $2, 'super_admin')
      ON CONFLICT DO NOTHING
    `, [orgId, userId]);
    console.log('✅ Added david as organization super_admin');

    // Create default AI config
    await client.query(`
      INSERT INTO organization_ai_configs (organization_id, welcome_messages, welcome_title, enabled)
      VALUES ($1, $2, $3, true)
      ON CONFLICT (organization_id) DO NOTHING
    `, [
      orgId,
      JSON.stringify([
        "What's the most urgent thing I should handle now?",
        "Summarize the last team Slack thread",
        "What's one task in my mail I can finish in 10 minutes?"
      ]),
      'Welcome to Zing! Your AI chat assistant'
    ]);
    console.log('✅ Created default AI config');

    // Set active organization
    await client.query(`
      INSERT INTO user_preferences (user_id, active_organization_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id) DO UPDATE SET active_organization_id = $2
    `, [userId, orgId]);
    console.log('✅ Set active organization');

    // Verify setup
    const verifyResult = await client.query(`
      SELECT
        u.email,
        u.role as user_role,
        o.name as org_name,
        om.role as org_role
      FROM users u
      LEFT JOIN organization_memberships om ON u.id = om.user_id
      LEFT JOIN organizations o ON om.organization_id = o.id
      WHERE u.email = 'david@ogenticai.com'
    `);

    console.log('\n📊 Verification:');
    console.table(verifyResult.rows);
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Log out and log back in to Zing Browser');
    console.log('   2. Navigate to Settings > AI Assistant');
    console.log('   3. You should now see the AI configuration form');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDavid();
