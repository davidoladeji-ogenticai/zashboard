'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import {
  Globe,
  MapPin,
  Users,
  TrendingUp,
  Flag,
  Navigation
} from 'lucide-react'

export default function GeographicPage() {
  const topCountries = [
    { country: 'United States', users: 12543, percentage: 28.5, flag: '🇺🇸', growth: 12.3 },
    { country: 'United Kingdom', users: 8921, percentage: 20.3, flag: '🇬🇧', growth: 8.7 },
    { country: 'Germany', users: 6754, percentage: 15.4, flag: '🇩🇪', growth: 15.2 },
    { country: 'Canada', users: 4321, percentage: 9.8, flag: '🇨🇦', growth: 6.1 },
    { country: 'Australia', users: 3456, percentage: 7.9, flag: '🇦🇺', growth: 22.4 },
    { country: 'France', users: 2987, percentage: 6.8, flag: '🇫🇷', growth: -2.3 },
    { country: 'Japan', users: 2654, percentage: 6.0, flag: '🇯🇵', growth: 18.9 },
    { country: 'Netherlands', users: 2143, percentage: 4.9, flag: '🇳🇱', growth: 11.7 },
  ]

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
            <MetricCard
              title="Countries"
              value={89}
              change={3}
              changeLabel="new this month"
              icon={Globe}
              trend="up"
            />
            <MetricCard
              title="Cities"
              value={1247}
              change={28}
              changeLabel="new this week"
              icon={MapPin}
              trend="up"
            />
            <MetricCard
              title="Top Country"
              value="USA (28.5%)"
              change={2.1}
              changeLabel="vs last month"
              icon={Flag}
              trend="up"
            />
            <MetricCard
              title="Growth Regions"
              value={12}
              change={15.4}
              changeLabel="accelerating"
              icon={TrendingUp}
              trend="up"
            />
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
                  {topCountries.map((country, index) => (
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}