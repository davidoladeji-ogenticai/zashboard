'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUser, useClerk } from '@clerk/nextjs'
import { cn } from '@/lib/utils'
import {
  BarChart3,
  Users,
  Globe,
  Settings,
  Activity,
  TrendingUp,
  Shield,
  Database,
  UserCog,
  LineChart,
  ChevronDown,
  ChevronRight,
  Lock,
  LogOut,
  User as UserIcon,
  Building2,
  Sparkles
} from 'lucide-react'
import { useOrgPermissions } from '@/hooks/useOrgPermissions'

interface NavItem {
  name: string
  href?: string
  icon: any
  submenu?: { name: string; href: string; icon: any }[]
  requirePlatformAdmin?: boolean
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)

  // Get permissions
  const { isPlatformAdmin, manageableOrgs, user: fullUser, loading: permissionsLoading } = useOrgPermissions()

  // Build navigation dynamically based on permissions
  const navigation: NavItem[] = [
    // Overview - visible to all users
    {
      name: 'Overview',
      href: '/overview',
      icon: BarChart3
    },
    // Analytics - only for platform admins
    ...(isPlatformAdmin ? [{
      name: 'Analytics',
      icon: LineChart,
      submenu: [
        { name: 'Users', href: '/analytics/users', icon: Users },
        { name: 'Geographic', href: '/analytics/geographic', icon: Globe },
        { name: 'Performance', href: '/analytics/performance', icon: Activity },
        { name: 'Versions', href: '/analytics/versions', icon: TrendingUp },
      ]
    }] : []),
    // Organizations menu - visible to all authenticated users
    {
      name: 'Organizations',
      icon: Building2,
      submenu: [
        { name: 'My Organizations', href: '/organizations', icon: Building2 },
        ...(isPlatformAdmin ? [
          { name: 'All Organizations', href: '/admin/organizations', icon: Users, requirePlatformAdmin: true },
        ] : []),
      ]
    },
    // Admin menu - platform admin only
    ...(isPlatformAdmin ? [{
      name: 'Admin',
      icon: UserCog,
      submenu: [
        { name: 'Users', href: '/admin/users', icon: Users },
        { name: 'Roles', href: '/admin/roles', icon: Shield },
        { name: 'Permissions', href: '/admin/permissions', icon: Lock },
      ]
    }] : []),
    // Platform management pages - only for platform admins
    ...(isPlatformAdmin ? [
      { name: 'Privacy', href: '/privacy', icon: Shield },
      { name: 'System', href: '/system', icon: Database },
      { name: 'AI Configuration', href: '/system-ai-config', icon: Sparkles },
      { name: 'Platform Settings', href: '/settings', icon: Settings },
    ] : []),
    // User settings - visible to all authenticated users
    { name: 'Profile', href: '/profile', icon: UserIcon },
  ]

  // Get user display info from Clerk
  const userName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'User'
  const userEmail = user?.primaryEmailAddress?.emailAddress || 'No email'
  const userInitial = userName.charAt(0).toUpperCase()

  // Auto-expand submenu if user is on one of its pages
  useEffect(() => {
    const itemsWithSubmenus = navigation.filter(item => item.submenu)
    for (const item of itemsWithSubmenus) {
      const isOnPage = item.submenu?.some(sub => pathname === sub.href)
      if (isOnPage) {
        setOpenSubmenu(item.name)
        break
      }
    }
  }, [pathname])

  const toggleSubmenu = (name: string) => {
    setOpenSubmenu(openSubmenu === name ? null : name)
  }

  const handleLogout = async () => {
    try {
      await signOut()
      router.push('/sign-in')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 sidebar-dark">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold text-white">Zashboard</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const hasSubmenu = item.submenu && item.submenu.length > 0
          const isSubmenuOpen = openSubmenu === item.name
          const isActive = pathname === item.href
          const isParentActive = hasSubmenu && item.submenu?.some(sub => pathname === sub.href)

          if (hasSubmenu) {
            return (
              <div key={item.name}>
                {/* Parent menu item with submenu */}
                <button
                  onClick={() => toggleSubmenu(item.name)}
                  className={cn(
                    'w-full group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isParentActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  )}
                >
                  <div className="flex items-center">
                    <item.icon
                      className={cn(
                        'mr-3 h-5 w-5',
                        isParentActive ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-300'
                      )}
                    />
                    {item.name}
                  </div>
                  {isSubmenuOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {/* Submenu items */}
                {isSubmenuOpen && (
                  <div className="mt-1 space-y-1">
                    {item.submenu?.map((subItem) => {
                      const isSubActive = pathname === subItem.href
                      return (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className={cn(
                            'group flex items-center pl-11 pr-2 py-2 text-sm font-medium rounded-md transition-colors',
                            isSubActive
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                          )}
                        >
                          <subItem.icon
                            className={cn(
                              'mr-3 h-4 w-4',
                              isSubActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                            )}
                          />
                          {subItem.name}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          // Regular menu item without submenu
          return (
            <Link
              key={item.name}
              href={item.href!}
              className={cn(
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5',
                  isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-300'
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Footer - User Profile */}
      <div className="border-t border-gray-800 p-4">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center space-x-3 hover:bg-gray-800 rounded-lg p-2 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-white">
                {userInitial}
              </span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {userName}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {userEmail}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-gray-400 transition-transform',
                showUserMenu && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
              <Link
                href="/profile"
                className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <UserIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-white">Profile & Settings</span>
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-700 transition-colors text-left border-t border-gray-700"
              >
                <LogOut className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
