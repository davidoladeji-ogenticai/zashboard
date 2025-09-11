import { query } from './index'

export interface ApiKey {
  id: string
  key_value: string
  name: string
  created_at: Date
  last_used?: Date
  is_active: boolean
}

export interface ApiKeyCreateData {
  key_value: string
  name: string
}

export interface ApiKeyInfo {
  id: string
  key: string
  name: string
  createdAt: Date
  lastUsed?: Date
  isActive: boolean
}

/**
 * Get all API keys from database
 */
export async function getApiKeys(): Promise<ApiKeyInfo[]> {
  try {
    const result = await query(`
      SELECT id, key_value, name, created_at, last_used, is_active 
      FROM api_keys 
      WHERE is_active = true
      ORDER BY created_at DESC
    `)

    return result.rows.map((row: any) => ({
      id: row.id,
      key: row.key_value,
      name: row.name,
      createdAt: new Date(row.created_at),
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      isActive: row.is_active
    }))
  } catch (error) {
    console.error('Failed to fetch API keys:', error)
    throw new Error('Failed to fetch API keys from database')
  }
}

/**
 * Create a new API key
 */
export async function createApiKey(data: ApiKeyCreateData): Promise<ApiKeyInfo> {
  try {
    const result = await query(`
      INSERT INTO api_keys (key_value, name, created_at, is_active)
      VALUES ($1, $2, NOW(), true)
      RETURNING id, key_value, name, created_at, last_used, is_active
    `, [data.key_value, data.name])

    const row = result.rows[0]
    return {
      id: row.id,
      key: row.key_value,
      name: row.name,
      createdAt: new Date(row.created_at),
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      isActive: row.is_active
    }
  } catch (error) {
    console.error('Failed to create API key:', error)
    
    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('duplicate key')) {
      throw new Error('API key already exists')
    }
    
    throw new Error('Failed to create API key')
  }
}

/**
 * Delete an API key (soft delete by setting is_active to false)
 */
export async function deleteApiKey(keyId: string): Promise<boolean> {
  try {
    const result = await query(`
      UPDATE api_keys 
      SET is_active = false 
      WHERE id = $1 AND is_active = true
    `, [keyId])

    return result.rowCount > 0
  } catch (error) {
    console.error('Failed to delete API key:', error)
    throw new Error('Failed to delete API key')
  }
}

/**
 * Regenerate an API key (create new key with same name, deactivate old one)
 */
export async function regenerateApiKey(keyId: string, newKeyValue: string): Promise<ApiKeyInfo> {
  try {
    // Start transaction to ensure consistency
    const result = await query(`
      WITH old_key AS (
        UPDATE api_keys 
        SET is_active = false 
        WHERE id = $1 AND is_active = true
        RETURNING name
      ),
      new_key AS (
        INSERT INTO api_keys (key_value, name, created_at, is_active)
        SELECT $2, old_key.name, NOW(), true
        FROM old_key
        RETURNING id, key_value, name, created_at, last_used, is_active
      )
      SELECT * FROM new_key
    `, [keyId, newKeyValue])

    if (result.rows.length === 0) {
      throw new Error('API key not found or already inactive')
    }

    const row = result.rows[0]
    return {
      id: row.id,
      key: row.key_value,
      name: row.name,
      createdAt: new Date(row.created_at),
      lastUsed: row.last_used ? new Date(row.last_used) : undefined,
      isActive: row.is_active
    }
  } catch (error) {
    console.error('Failed to regenerate API key:', error)
    
    if (error instanceof Error && error.message.includes('duplicate key')) {
      throw new Error('Generated API key already exists, try again')
    }
    
    throw new Error('Failed to regenerate API key')
  }
}

/**
 * Validate an API key (check if it exists and is active)
 */
export async function validateApiKey(keyValue: string): Promise<ApiKeyInfo | null> {
  try {
    const result = await query(`
      SELECT id, key_value, name, created_at, last_used, is_active 
      FROM api_keys 
      WHERE key_value = $1 AND is_active = true
    `, [keyValue])

    if (result.rows.length === 0) {
      return null
    }

    // Update last_used timestamp
    await query(`
      UPDATE api_keys 
      SET last_used = NOW() 
      WHERE key_value = $1 AND is_active = true
    `, [keyValue])

    const row = result.rows[0]
    return {
      id: row.id,
      key: row.key_value,
      name: row.name,
      createdAt: new Date(row.created_at),
      lastUsed: new Date(), // Use current time since we just updated it
      isActive: row.is_active
    }
  } catch (error) {
    console.error('Failed to validate API key:', error)
    return null
  }
}

/**
 * Get API key usage statistics
 */
export async function getApiKeyStats(): Promise<{
  total_keys: number
  active_keys: number
  recently_used: number
}> {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total_keys,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_keys,
        COUNT(CASE WHEN is_active = true AND last_used > NOW() - INTERVAL '7 days' THEN 1 END) as recently_used
      FROM api_keys
    `)

    return {
      total_keys: parseInt(result.rows[0].total_keys),
      active_keys: parseInt(result.rows[0].active_keys),
      recently_used: parseInt(result.rows[0].recently_used)
    }
  } catch (error) {
    console.error('Failed to get API key stats:', error)
    return {
      total_keys: 0,
      active_keys: 0,
      recently_used: 0
    }
  }
}