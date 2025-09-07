'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import {
  Users,
  UserPlus,
  UserCheck,
  Clock,
  TrendingUp,
  Globe
} from 'lucide-react'

export default function UsersPage() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              User Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Detailed insights into Zing browser user behavior and demographics
            </p>
          </div>

          {/* User Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Total Users"
              value={45128}
              change={12.3}
              changeLabel="vs last month"
              icon={Users}
              trend="up"
            />
            <MetricCard
              title="New Users"
              value={2347}
              change={8.7}
              changeLabel="this week"
              icon={UserPlus}
              trend="up"
            />
            <MetricCard
              title="Active Users"
              value={12543}
              change={-2.1}
              changeLabel="vs last week"
              icon={UserCheck}
              trend="down"
            />
            <MetricCard
              title="Avg Session Time"
              value="24m 32s"
              change={15.4}
              changeLabel="vs last month"
              icon={Clock}
              trend="up"
            />
          </div>

          {/* User Engagement Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                User Growth Trend
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>User growth chart will be implemented with real data</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                User Distribution
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Geographic distribution chart coming soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* User Activity Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent User Activity
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left py-3">User ID</th>
                    <th className="text-left py-3">First Seen</th>
                    <th className="text-left py-3">Last Active</th>
                    <th className="text-left py-3">Sessions</th>
                    <th className="text-left py-3">Platform</th>
                    <th className="text-left py-3">Version</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900 dark:text-gray-100">
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3">usr_7a8b9c...</td>
                    <td className="py-3">2 days ago</td>
                    <td className="py-3">5 minutes ago</td>
                    <td className="py-3">127</td>
                    <td className="py-3">macOS</td>
                    <td className="py-3">1.3.5</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3">usr_4e5f6g...</td>
                    <td className="py-3">1 week ago</td>
                    <td className="py-3">2 hours ago</td>
                    <td className="py-3">83</td>
                    <td className="py-3">Windows</td>
                    <td className="py-3">1.3.4</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3">usr_1d2e3f...</td>
                    <td className="py-3">3 days ago</td>
                    <td className="py-3">1 hour ago</td>
                    <td className="py-3">56</td>
                    <td className="py-3">Linux</td>
                    <td className="py-3">1.3.5</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}