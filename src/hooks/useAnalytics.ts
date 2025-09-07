'use client'

import { useQuery } from '@tanstack/react-query'
import { RealtimeMetrics, HistoricalData } from '@/types/analytics'

const API_BASE_URL = '/api'
const API_KEY = process.env.NEXT_PUBLIC_ZING_ANALYTICS_KEY || 'demo-key'

const apiHeaders = {
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json'
}

// Fetch realtime metrics
export function useRealtimeMetrics() {
  return useQuery<RealtimeMetrics>({
    queryKey: ['realtime-metrics'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard/metrics/realtime`, {
        headers: apiHeaders
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch realtime metrics: ${response.statusText}`)
      }
      
      return response.json()
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000, // Consider data stale after 25 seconds
  })
}

// Fetch historical data
export function useHistoricalData(period: string = '30d', metric: string = 'dau') {
  return useQuery<HistoricalData>({
    queryKey: ['historical-data', period, metric],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/dashboard/metrics/historical?period=${period}&metric=${metric}`,
        { headers: apiHeaders }
      )
      
      if (!response.ok) {
        throw new Error(`Failed to fetch historical data: ${response.statusText}`)
      }
      
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  })
}

// Fetch geographic data
export function useGeographicData() {
  return useQuery({
    queryKey: ['geographic-data'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/dashboard/metrics/geographic`, {
        headers: apiHeaders
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch geographic data: ${response.statusText}`)
      }
      
      return response.json()
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  })
}

// Check analytics API health
export function useAnalyticsHealth() {
  return useQuery({
    queryKey: ['analytics-health'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/analytics/health`)
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`)
      }
      
      return response.json()
    },
    refetchInterval: 60000, // Check every minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Send analytics event (mutation)
export async function sendAnalyticsEvent(eventData: {
  event: string
  properties: Record<string, any>
}) {
  const response = await fetch(`${API_BASE_URL}/analytics/events`, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify(eventData)
  })

  if (!response.ok) {
    throw new Error(`Failed to send analytics event: ${response.statusText}`)
  }

  return response.json()
}

// Fetch recent events for debugging (admin only)
export function useRecentEvents() {
  return useQuery({
    queryKey: ['recent-events'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/analytics/events`, {
        headers: apiHeaders
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch recent events: ${response.statusText}`)
      }
      
      return response.json()
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  })
}