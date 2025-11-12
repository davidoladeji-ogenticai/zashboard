/**
 * System AI Configuration API Routes
 *
 * GET /api/ai-config - Get system-wide AI config (authenticated users)
 * PUT /api/ai-config - Update system-wide AI config (platform admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuthHeader } from '@/lib/auth';
import { OrganizationService } from '@/lib/database/organization';

/**
 * GET /api/ai-config
 * Get system-wide AI assistant configuration
 * Any authenticated user can view
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    const user = await validateAuthHeader(authHeader);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Get system AI config
    const systemConfig = await OrganizationService.getSystemAIConfig();

    if (!systemConfig) {
      return NextResponse.json(
        {
          success: false,
          error: 'System AI configuration not found'
        },
        { status: 404 }
      );
    }

    // Check if user is platform admin (can configure)
    const isPlatformAdmin = user.role === 'admin' || user.role === 'super_admin';

    return NextResponse.json({
      success: true,
      data: systemConfig,
      can_configure: isPlatformAdmin
    });
  } catch (error) {
    console.error('Get system AI config error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve system AI configuration'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/ai-config
 * Update system-wide AI assistant configuration (platform admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    const user = await validateAuthHeader(authHeader);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized'
        },
        { status: 401 }
      );
    }

    // Check if user is platform admin
    const isPlatformAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isPlatformAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied. Platform admin role required.'
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { welcome_messages, welcome_title, welcome_description, enabled } = body;

    // Validate welcome_messages
    if (!Array.isArray(welcome_messages) || welcome_messages.length !== 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Must provide exactly 3 welcome messages'
        },
        { status: 400 }
      );
    }

    // Validate all messages are non-empty strings
    if (welcome_messages.some(msg => typeof msg !== 'string' || msg.trim().length === 0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'All welcome messages must be non-empty strings'
        },
        { status: 400 }
      );
    }

    // Validate enabled is boolean
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        {
          success: false,
          error: 'enabled must be a boolean'
        },
        { status: 400 }
      );
    }

    // Update system AI config
    const systemConfig = await OrganizationService.updateSystemAIConfig({
      welcome_messages,
      welcome_title,
      welcome_description,
      enabled,
      created_by: user.id
    });

    return NextResponse.json({
      success: true,
      message: 'System AI configuration updated successfully',
      data: systemConfig
    });
  } catch (error) {
    console.error('Update system AI config error:', error);

    if (error instanceof Error && error.message.includes('exactly 3 welcome messages')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Must provide exactly 3 welcome messages'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update system AI configuration'
      },
      { status: 500 }
    );
  }
}
