import { useQuery } from '@tanstack/react-query'

interface PrivacyMetric {
  category: string
  status: 'compliant' | 'secure' | 'warning' | 'violation'
  details: string
  score: number
}

interface DataCollection {
  types_collected: {
    anonymous_user_id: number
    app_version: number
    platform_type: number
    usage_metrics: number
    session_data: number
  }
  total_data_points: number
  anonymization_method: string
  pii_collected: boolean
}

interface RegulatoryCompliance {
  name: string
  full_name: string
  status: 'compliant' | 'warning' | 'violation'
  last_audit: string
  next_review: string
  score: number
}

interface DataGovernance {
  retention_policy: string
  encryption_at_rest: string
  encryption_in_transit: string
  access_controls: string
  audit_logging: string
  data_minimization: string
}

interface UserRights {
  right_to_access: boolean
  right_to_deletion: boolean
  right_to_portability: boolean
  right_to_opt_out: boolean
  contact_method: string
}

export interface PrivacyMetrics {
  anonymous_users_percent: number
  data_retention_days: number
  opt_out_rate_percent: number
  compliance_score_percent: number
  privacy_metrics: PrivacyMetric[]
  data_collection: DataCollection
  regulatory_compliance: RegulatoryCompliance[]
  data_governance: DataGovernance
  user_rights: UserRights
  last_updated: string
}

const PRIVACY_BASE_URL = '/api/privacy'

export function usePrivacyMetrics() {
  return useQuery({
    queryKey: ['privacy', 'metrics'],
    queryFn: async (): Promise<PrivacyMetrics> => {
      const response = await fetch(`${PRIVACY_BASE_URL}/metrics`, {
        credentials: 'include',
        headers: {
          'Authorization': 'Bearer demo-key',
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch privacy metrics: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch privacy metrics')
      }

      return result.data
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
    retry: 2
  })
}