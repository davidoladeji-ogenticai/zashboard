import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader } from '@/lib/auth'
import { generateToken } from '@/lib/auth'

// In-memory API key storage (should be replaced with database)
const apiKeys: Array<{
  id: string
  key: string
  name: string
  createdAt: Date
  lastUsed?: Date
  isActive: boolean
}> = [
  {
    id: 'demo-key-1',
    key: 'demo-key',
    name: 'Demo Analytics Key',
    createdAt: new Date('2025-01-01'),
    lastUsed: new Date(),
    isActive: true
  }
]

// GET - List all API keys
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const authHeader = request.headers.get('authorization')
    const user = validateAuthHeader(authHeader)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    // Return API keys - show demo keys in full, mask real keys for security
    const sanitizedKeys = apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      key: key.id === 'demo-key-1' || key.key.startsWith('demo-key') ? 
        key.key : 
        key.key.substring(0, 8) + '...' + key.key.slice(-4),
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      isActive: key.isActive
    }))

    return NextResponse.json({
      success: true,
      data: sanitizedKeys,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('API Keys GET error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch API keys',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// POST - Create new API key
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const authHeader = request.headers.get('authorization')
    const user = validateAuthHeader(authHeader)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json(
        { error: 'API key name is required' },
        { status: 400 }
      )
    }

    // Generate new API key
    const newKey = {
      id: `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key: `zash_${Math.random().toString(36).substr(2, 32)}`,
      name: name.trim(),
      createdAt: new Date(),
      isActive: true
    }

    apiKeys.push(newKey)

    return NextResponse.json({
      success: true,
      data: {
        id: newKey.id,
        name: newKey.name,
        key: newKey.key, // Return full key only on creation
        createdAt: newKey.createdAt,
        isActive: newKey.isActive
      },
      message: 'API key created successfully',
      timestamp: new Date().toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('API Key creation error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create API key',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete API key
export async function DELETE(request: NextRequest) {
  try {
    // Validate authentication
    const authHeader = request.headers.get('authorization')
    const user = validateAuthHeader(authHeader)
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized access' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json(
        { error: 'API key ID is required' },
        { status: 400 }
      )
    }

    const keyIndex = apiKeys.findIndex(key => key.id === keyId)
    if (keyIndex === -1) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      )
    }

    // Don't allow deletion of demo key
    if (apiKeys[keyIndex].id === 'demo-key-1') {
      return NextResponse.json(
        { error: 'Cannot delete demo API key' },
        { status: 403 }
      )
    }

    apiKeys.splice(keyIndex, 1)

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('API Key deletion error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete API key',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}