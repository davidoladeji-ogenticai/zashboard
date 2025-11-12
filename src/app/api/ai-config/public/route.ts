/**
 * Public System AI Configuration API Route
 *
 * GET /api/ai-config/public - Get system-wide AI config (no authentication required)
 *
 * This endpoint allows unauthenticated users (e.g., logged-out Zing users)
 * to fetch the global AI assistant configuration set by platform admins.
 */

import { NextRequest, NextResponse } from 'next/server';
import { OrganizationService } from '@/lib/database/organization';

/**
 * Public AI Config Response Interface
 * Only includes public fields, no sensitive data
 */
interface PublicAIConfig {
  welcome_title: string | null;
  welcome_description: string | null;
  welcome_messages: [string, string, string];
  enabled: boolean;
}

/**
 * GET /api/ai-config/public
 * Get system-wide AI assistant configuration (public endpoint)
 * No authentication required - accessible to anyone
 */
export async function GET(request: NextRequest) {
  try {
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

    // Return only public fields, excluding sensitive data
    const publicConfig: PublicAIConfig = {
      welcome_title: systemConfig.welcome_title,
      welcome_description: systemConfig.welcome_description,
      welcome_messages: systemConfig.welcome_messages,
      enabled: systemConfig.enabled
    };

    return NextResponse.json({
      success: true,
      data: publicConfig
    });
  } catch (error) {
    console.error('Get public system AI config error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve system AI configuration'
      },
      { status: 500 }
    );
  }
}
