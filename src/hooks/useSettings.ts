import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const SETTINGS_BASE_URL = '/api/settings'

// Types
export interface SettingsMetrics {
  admin_users: number
  api_keys: number
  notifications_enabled: number
  data_retention_days: number
  storage: {
    total_events: number
    storage_used: string
    storage_bytes: number
    oldest_data_days: number
  }
  notifications: {
    systemAlerts: boolean
    usageAlerts: boolean
    weeklyReports: boolean
    totalEnabled: number
  }
}

export interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed?: string
  isActive: boolean
}

// Fetch settings metrics
export function useSettingsMetrics() {
  return useQuery({
    queryKey: ['settings', 'metrics'],
    queryFn: async (): Promise<SettingsMetrics> => {
      const response = await fetch(`${SETTINGS_BASE_URL}/metrics`, {
        credentials: 'include', // Include cookies in request
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch settings metrics`)
      }
      
      const result = await response.json()
      return result.data
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  })
}

// Fetch API keys
export function useApiKeys() {
  return useQuery({
    queryKey: ['settings', 'apiKeys'],
    queryFn: async (): Promise<ApiKey[]> => {
      const response = await fetch(`${SETTINGS_BASE_URL}/api-keys`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch API keys`)
      }
      
      const result = await response.json()
      return result.data
    },
    staleTime: 60000 // API keys don't change often
  })
}

// Create new API key
export function useCreateApiKey() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (keyData: { name: string }) => {
      const response = await fetch(`${SETTINGS_BASE_URL}/api-keys`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(keyData)
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create API key')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch API keys
      queryClient.invalidateQueries({ queryKey: ['settings', 'apiKeys'] })
      queryClient.invalidateQueries({ queryKey: ['settings', 'metrics'] })
    }
  })
}

// Delete API key
export function useDeleteApiKey() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (keyId: string) => {
      const response = await fetch(`${SETTINGS_BASE_URL}/api-keys?id=${keyId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete API key')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch API keys
      queryClient.invalidateQueries({ queryKey: ['settings', 'apiKeys'] })
      queryClient.invalidateQueries({ queryKey: ['settings', 'metrics'] })
    }
  })
}

// Regenerate API key
export function useRegenerateApiKey() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (keyData: { id: string, name: string }) => {
      // Delete old key and create new one with same name
      
      // Delete old key
      await fetch(`${SETTINGS_BASE_URL}/api-keys?id=${keyData.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      // Create new key
      const response = await fetch(`${SETTINGS_BASE_URL}/api-keys`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: keyData.name })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to regenerate API key')
      }
      
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'apiKeys'] })
      queryClient.invalidateQueries({ queryKey: ['settings', 'metrics'] })
    }
  })
}