'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import { useEnhancedGeographicData } from '@/hooks/useAnalytics'
import {
  Globe,
  MapPin,
  TrendingUp,
  Flag,
  Navigation,
  AlertCircle
} from 'lucide-react'

export default function GeographicPage() {
  const { data: geoData, isLoading, error } = useEnhancedGeographicData()

  if (error) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Failed to Load Geographic Data
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error.message}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Use real data or empty array if no data available
  const topCountries = geoData?.countries_data ?? []

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Geographic Distribution
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Global Zing browser usage by country and region
            </p>
          </div>

          {/* Geographic Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                  <div className="animate-pulse">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                      <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 mb-2"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </div>
                </div>
              ))
            ) : (
              <>
                <MetricCard
                  title="Countries"
                  value={geoData?.summary?.total_countries ?? 0}
                  change={geoData?.metrics?.countries_with_users ?? 0}
                  changeLabel="with users"
                  icon={Globe}
                  trend="up"
                />
                <MetricCard
                  title="Cities"
                  value={geoData?.summary?.total_cities ?? 0}
                  change={geoData?.metrics?.estimated_cities ?? 0}
                  changeLabel="estimated"
                  icon={MapPin}
                  trend="up"
                />
                <MetricCard
                  title="Top Country"
                  value={geoData?.summary?.top_country ?? "N/A"}
                  change={geoData?.summary?.top_country_growth ?? 0}
                  changeLabel="growth rate"
                  icon={Flag}
                  trend="up"
                />
                <MetricCard
                  title="Growing Regions"
                  value={geoData?.summary?.growing_regions ?? 0}
                  change={geoData?.metrics?.growth_acceleration ?? 0}
                  changeLabel="accelerating"
                  icon={TrendingUp}
                  trend="up"
                />
              </>
            )}
          </div>

          {/* World Map and Regional Data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Global User Distribution
              </h3>
              <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Globe className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h4 className="font-semibold mb-2">Interactive World Map</h4>
                  <p className="text-sm">World map with user density heat zones</p>
                  <p className="text-xs mt-2 opacity-70">Integration with mapping library coming soon</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Regional Growth Trends
              </h3>
              <div className="h-80 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Navigation className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h4 className="font-semibold mb-2">Growth Analytics</h4>
                  <p className="text-sm">Regional expansion and adoption rates</p>
                  <p className="text-xs mt-2 opacity-70">Time series chart integration planned</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Countries Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Top Countries by Users
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left py-3">Rank</th>
                    <th className="text-left py-3">Country</th>
                    <th className="text-left py-3">Users</th>
                    <th className="text-left py-3">Percentage</th>
                    <th className="text-left py-3">Growth</th>
                    <th className="text-left py-3">Trend</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900 dark:text-gray-100">
                  {isLoading ? (
                    // Loading skeleton rows
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8 animate-pulse"></div></td>
                        <td className="py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div></td>
                        <td className="py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div></td>
                        <td className="py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse"></div></td>
                        <td className="py-4"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div></td>
                        <td className="py-4"><div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div></td>
                      </tr>
                    ))
                  ) : topCountries.length > 0 ? (
                    topCountries.map((country, index) => (
                      <tr key={country.country} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-4">
                          <span className="font-medium">#{index + 1}</span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{country.flag}</span>
                            <span className="font-medium">{country.country}</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="font-mono">{country.users.toLocaleString()}</span>
                        </td>
                        <td className="py-4">
                          <span className="font-medium">{country.percentage}%</span>
                        </td>
                        <td className="py-4">
                          <span className={`font-medium ${
                            country.growth > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {country.growth > 0 ? '+' : ''}{country.growth}%
                          </span>
                        </td>
                        <td className="py-4">
                          {country.growth > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-red-600 dark:text-red-400 transform rotate-180" />
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                        No geographic data available yet. Data will appear once analytics events are received from different regions.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}