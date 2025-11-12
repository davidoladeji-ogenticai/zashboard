'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useOrgPermissions } from '@/hooks/useOrgPermissions'
import { Loader2 } from 'lucide-react'

interface PlatformAdminGuardProps {
  children: ReactNode
}

/**
 * Component that protects platform-level pages
 * Redirects non-platform-admins to /organizations
 */
export function PlatformAdminGuard({ children }: PlatformAdminGuardProps) {
  const router = useRouter()
  const { isPlatformAdmin, loading: permissionsLoading } = useOrgPermissions()

  // Redirect non-platform-admins to organizations page
  useEffect(() => {
    if (!permissionsLoading && !isPlatformAdmin) {
      router.push('/organizations')
    }
  }, [permissionsLoading, isPlatformAdmin, router])

  // Show loading while checking permissions
  if (permissionsLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600 dark:text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render content for non-admins (will redirect)
  if (!isPlatformAdmin) {
    return null
  }

  return <>{children}</>
}
