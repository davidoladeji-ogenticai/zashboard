import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly set port 3000 and prevent fallback to other ports
  port: 3000,

  // Development server configuration
  devIndicators: {
    buildActivity: false,
  },

  // Prevent Next.js from automatically selecting alternative ports
  experimental: {
    // Force port 3000 - don't allow fallbacks
    strictPort: true,
  },

  // Environment variables that ensure port consistency
  env: {
    NEXT_PUBLIC_APP_PORT: '3000',
    PORT: '3000',
  },

  // Enable standalone output for Docker
  output: 'standalone',
};

export default nextConfig;
