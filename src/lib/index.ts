import { Pool, PoolClient, PoolConfig } from 'pg'
import fs from 'fs'
import path from 'path'

// Database configuration
const dbConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'zashboard',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // Maximum number of connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Return error after 2s if no connection available
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
}

// Global connection pool
let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(dbConfig)
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err)
      process.exit(-1)
    })

    // Log pool events in development
    if (process.env.NODE_ENV === 'development') {
      pool.on('connect', () => {
        console.log('Connected to PostgreSQL database')
      })
      
      pool.on('acquire', () => {
        console.log('Client acquired from pool')
      })
      
      pool.on('release', () => {
        console.log('Client released back to pool')
      })
    }
  }
  
  return pool
}

// Execute a single query
export async function query(text: string, params?: any[]): Promise<any> {
  const pool = getPool()
  const start = Date.now()
  
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text, duration, rows: result.rowCount })
    }
    
    return result
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

// Execute multiple queries in a transaction
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  try {
    // Read schema file
    const schemaPath = path.join(process.cwd(), 'src/lib/database/schema.sql')
    const schemaSql = fs.readFileSync(schemaPath, 'utf8')
    
    console.log('Initializing database schema...')
    
    // Execute schema creation
    await query(schemaSql)
    
    console.log('Database schema initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database:', error)
    throw error
  }
}

// Check database connection and health
export async function checkDatabaseHealth(): Promise<{
  connected: boolean
  latency?: number
  error?: string
}> {
  try {
    const start = Date.now()
    await query('SELECT 1')
    const latency = Date.now() - start
    
    return {
      connected: true,
      latency
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Get database statistics
export async function getDatabaseStats(): Promise<{
  total_events: number
  total_users: number
  total_sessions: number
  database_size: string
}> {
  try {
    const [eventsResult, usersResult, sessionsResult, sizeResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM analytics_events'),
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM user_sessions WHERE expires_at > NOW()'),
      query(`
        SELECT 
          pg_size_pretty(pg_total_relation_size('analytics_events')) as events_size,
          pg_size_pretty(pg_database_size(current_database())) as total_size
      `)
    ])

    return {
      total_events: parseInt(eventsResult.rows[0].count),
      total_users: parseInt(usersResult.rows[0].count),
      total_sessions: parseInt(sessionsResult.rows[0].count),
      database_size: sizeResult.rows[0].total_size
    }
  } catch (error) {
    console.error('Failed to get database stats:', error)
    return {
      total_events: 0,
      total_users: 0,
      total_sessions: 0,
      database_size: 'Unknown'
    }
  }
}

// Cleanup functions
export async function cleanupOldData(retentionDays: number = 90): Promise<void> {
  try {
    await Promise.all([
      query('SELECT cleanup_old_analytics_events($1)', [retentionDays]),
      query('SELECT cleanup_expired_sessions()')
    ])
    
    console.log('Database cleanup completed successfully')
  } catch (error) {
    console.error('Database cleanup failed:', error)
    throw error
  }
}

// Close all database connections
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    console.log('Database connections closed')
  }
}

// Helper function to convert BigInt timestamp to Date
export function timestampToDate(timestamp: bigint | string | number): Date {
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : 
            typeof timestamp === 'string' ? parseInt(timestamp) : timestamp
  return new Date(ts)
}

// Helper function to safely parse JSON properties
export function safeJsonParse(json: any): any {
  if (typeof json === 'string') {
    try {
      return JSON.parse(json)
    } catch {
      return {}
    }
  }
  return json || {}
}