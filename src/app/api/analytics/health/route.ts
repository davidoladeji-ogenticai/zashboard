import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Basic health check
    const healthStatus = {
      status: 'healthy',
      database: 'connected', // In production, actually check database connection
      timestamp: Date.now(),
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }

    return NextResponse.json(healthStatus)
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: Date.now()
      },
      { status: 500 }
    )
  }
}