'use client'

import { Sidebar } from './sidebar'
import { usePathname } from 'next/navigation'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  // Pages that should not show sidebar (auth pages, landing, etc.)
  const noSidebarPages = ['/', '/login', '/register', '/forgot-password']
  const isAuthPage = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')
  const showSidebar = !noSidebarPages.includes(pathname) && !isAuthPage

  if (!showSidebar) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
