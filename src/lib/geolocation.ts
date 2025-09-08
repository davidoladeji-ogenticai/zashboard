import { NextRequest } from 'next/server'

// Optional geoip import with fallback
let geoip: any = null
try {
  geoip = require('geoip-lite')
} catch (error) {
  console.warn('geoip-lite not available, using fallback geolocation')
}

export interface LocationData {
  country_code: string
  country_name: string
  region?: string
  city?: string
  timezone?: string
  source: 'geoip' | 'development' | 'unknown'
}

/**
 * Extract the real client IP address from the request
 * Handles various proxy headers and development environments
 */
export function getClientIP(request: NextRequest): string | null {
  // Check various headers that might contain the real IP
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  const xClientIP = request.headers.get('x-client-ip')
  
  // If behind a proxy, use forwarded IP (take the first one if multiple)
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim())
    return ips[0]
  }
  
  // Try other common headers
  if (cfConnectingIP) return cfConnectingIP
  if (realIP) return realIP
  if (xClientIP) return xClientIP
  
  // Fallback to connection IP (may be localhost in development)
  const url = new URL(request.url)
  return request.ip || url.hostname
}

/**
 * Get location data from IP address using geoip-lite
 */
export function getLocationFromIP(ip: string | null): LocationData {
  if (!ip) {
    return {
      country_code: 'XX',
      country_name: 'Unknown',
      source: 'unknown'
    }
  }
  
  // Handle localhost and development IPs
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return {
      country_code: 'DEV',
      country_name: 'Development',
      source: 'development'
    }
  }
  
  // Try geoip lookup if available
  if (geoip) {
    try {
      const geo = geoip.lookup(ip)
      
      if (geo) {
        return {
          country_code: geo.country,
          country_name: getCountryName(geo.country),
          region: geo.region,
          city: geo.city,
          timezone: geo.timezone,
          source: 'geoip'
        }
      }
    } catch (error) {
      console.error('Geolocation lookup error:', error)
    }
  }
  
  // Fallback: Try to guess based on IP patterns (very basic)
  const countryGuess = guessCountryFromIP(ip)
  if (countryGuess) {
    return countryGuess
  }
  
  return {
    country_code: 'XX',
    country_name: 'Unknown',
    source: 'unknown'
  }
}

/**
 * Convert ISO country code to full country name
 */
export function getCountryName(countryCode: string): string {
  const countryNames: Record<string, string> = {
    'NG': 'Nigeria',
    'US': 'United States',
    'GB': 'United Kingdom',
    'CA': 'Canada',
    'DE': 'Germany',
    'FR': 'France',
    'JP': 'Japan',
    'AU': 'Australia',
    'BR': 'Brazil',
    'IN': 'India',
    'CN': 'China',
    'RU': 'Russia',
    'ZA': 'South Africa',
    'KE': 'Kenya',
    'GH': 'Ghana',
    'EG': 'Egypt',
    'MA': 'Morocco',
    'TN': 'Tunisia',
    'DZ': 'Algeria',
    'ET': 'Ethiopia',
    'UG': 'Uganda',
    'TZ': 'Tanzania',
    'MX': 'Mexico',
    'AR': 'Argentina',
    'CL': 'Chile',
    'CO': 'Colombia',
    'PE': 'Peru',
    'VE': 'Venezuela',
    'IT': 'Italy',
    'ES': 'Spain',
    'PT': 'Portugal',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'AT': 'Austria',
    'CH': 'Switzerland',
    'IE': 'Ireland',
    'KR': 'South Korea',
    'TH': 'Thailand',
    'MY': 'Malaysia',
    'SG': 'Singapore',
    'PH': 'Philippines',
    'ID': 'Indonesia',
    'VN': 'Vietnam',
    'NZ': 'New Zealand',
    'IL': 'Israel',
    'AE': 'United Arab Emirates',
    'SA': 'Saudi Arabia',
    'TR': 'Turkey',
    'IR': 'Iran',
    'IQ': 'Iraq',
    'PK': 'Pakistan',
    'BD': 'Bangladesh',
    'LK': 'Sri Lanka',
    'XX': 'Unknown',
    'DEV': 'Development'
  }
  
  return countryNames[countryCode] || countryCode
}

/**
 * Get country flag emoji from country code
 */
export function getCountryFlag(countryCode: string): string {
  const flagMap: Record<string, string> = {
    'NG': '🇳🇬',
    'US': '🇺🇸',
    'GB': '🇬🇧',
    'CA': '🇨🇦',
    'DE': '🇩🇪',
    'FR': '🇫🇷',
    'JP': '🇯🇵',
    'AU': '🇦🇺',
    'BR': '🇧🇷',
    'IN': '🇮🇳',
    'CN': '🇨🇳',
    'RU': '🇷🇺',
    'ZA': '🇿🇦',
    'KE': '🇰🇪',
    'GH': '🇬🇭',
    'EG': '🇪🇬',
    'MA': '🇲🇦',
    'TN': '🇹🇳',
    'DZ': '🇩🇿',
    'ET': '🇪🇹',
    'UG': '🇺🇬',
    'TZ': '🇹🇿',
    'MX': '🇲🇽',
    'AR': '🇦🇷',
    'CL': '🇨🇱',
    'CO': '🇨🇴',
    'PE': '🇵🇪',
    'VE': '🇻🇪',
    'IT': '🇮🇹',
    'ES': '🇪🇸',
    'PT': '🇵🇹',
    'NL': '🇳🇱',
    'BE': '🇧🇪',
    'SE': '🇸🇪',
    'NO': '🇳🇴',
    'DK': '🇩🇰',
    'FI': '🇫🇮',
    'PL': '🇵🇱',
    'CZ': '🇨🇿',
    'AT': '🇦🇹',
    'CH': '🇨🇭',
    'IE': '🇮🇪',
    'KR': '🇰🇷',
    'TH': '🇹🇭',
    'MY': '🇲🇾',
    'SG': '🇸🇬',
    'PH': '🇵🇭',
    'ID': '🇮🇩',
    'VN': '🇻🇳',
    'NZ': '🇳🇿',
    'IL': '🇮🇱',
    'AE': '🇦🇪',
    'SA': '🇸🇦',
    'TR': '🇹🇷',
    'IR': '🇮🇷',
    'IQ': '🇮🇶',
    'PK': '🇵🇰',
    'BD': '🇧🇩',
    'LK': '🇱🇰',
    'XX': '❓',
    'DEV': '🛠️'
  }
  
  return flagMap[countryCode] || '🌍'
}

/**
 * Simple fallback country guessing based on IP patterns
 * This is very basic and only works for some IP ranges
 */
function guessCountryFromIP(ip: string): LocationData | null {
  // Very basic IP to country mapping for common ranges
  // This is not comprehensive and should be replaced with proper geolocation
  const ipPatterns = [
    { pattern: /^41\.[0-9]+\.[0-9]+\.[0-9]+$/, country: 'NG', name: 'Nigeria' }, // Some Nigerian IP ranges
    { pattern: /^196\.[0-9]+\.[0-9]+\.[0-9]+$/, country: 'ZA', name: 'South Africa' },
    { pattern: /^8\.8\.[0-9]+\.[0-9]+$/, country: 'US', name: 'United States' }, // Google DNS
    { pattern: /^1\.1\.[0-9]+\.[0-9]+$/, country: 'US', name: 'United States' }, // Cloudflare DNS
  ]
  
  for (const item of ipPatterns) {
    if (item.pattern.test(ip)) {
      return {
        country_code: item.country,
        country_name: item.name,
        source: 'ip_pattern_guess'
      }
    }
  }
  
  return null
}

/**
 * Get comprehensive location data from request
 * This is the main function to use in API routes
 */
export function getLocationFromRequest(request: NextRequest): LocationData {
  const ip = getClientIP(request)
  return getLocationFromIP(ip)
}