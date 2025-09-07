'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import {
  Users,
  Activity,
  Globe,
  TrendingUp,
  Download,
  Clock,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export default function Home() {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Analytics Overview
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Global Zing browser usage metrics and insights
            </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Active Users"
              value={12543}
              change={8.2}
              changeLabel="vs last week"
              icon={Users}
              trend="up"
            />
            <MetricCard
              title="Sessions Today"
              value={3421}
              change={-2.1}
              changeLabel="vs yesterday"
              icon={Activity}
              trend="down"
            />
            <MetricCard
              title="Global Reach"
              value="89 countries"
              change={3}
              changeLabel="new this month"
              icon={Globe}
              trend="up"
            />
            <MetricCard
              title="Version 1.3.5"
              value="84%"
              change={12.5}
              changeLabel="adoption rate"
              icon={TrendingUp}
              trend="up"
            />
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Downloads"
              value={2156}
              change={15.3}
              changeLabel="this week"
              icon={Download}
              trend="up"
            />
            <MetricCard
              title="Avg Session"
              value="24m"
              change={-5.2}
              changeLabel="vs last week"
              icon={Clock}
              trend="down"
            />
            <MetricCard
              title="Update Success"
              value="96.8%"
              change={2.1}
              changeLabel="success rate"
              icon={CheckCircle}
              trend="up"
            />
            <MetricCard
              title="Error Rate"
              value="0.12%"
              change={-18.5}
              changeLabel="vs last month"
              icon={AlertCircle}
              trend="up"
            />
          </div>

          {/* Charts and Additional Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usage Chart Placeholder */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Daily Active Users
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Chart integration coming soon</p>
                </div>
              </div>
            </div>

            {/* Geographic Distribution Placeholder */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Global Distribution
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Globe className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>World map visualization coming soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              System Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Analytics API: Operational
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Database: Healthy
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Data Processing: Minor delays
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
