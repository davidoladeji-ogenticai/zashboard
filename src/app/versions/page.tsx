'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import {
  TrendingUp,
  Download,
  CheckCircle,
  AlertCircle,
  Package,
  Clock
} from 'lucide-react'

export default function VersionsPage() {
  const versionData = [
    { version: '1.3.5', users: 37842, percentage: 84.2, released: '1 week ago', status: 'current' },
    { version: '1.3.4', users: 5123, percentage: 11.4, released: '3 weeks ago', status: 'outdated' },
    { version: '1.3.3', users: 1456, percentage: 3.2, released: '5 weeks ago', status: 'outdated' },
    { version: '1.3.2', users: 342, percentage: 0.8, released: '7 weeks ago', status: 'legacy' },
    { version: '1.3.1', users: 156, percentage: 0.3, released: '9 weeks ago', status: 'legacy' },
    { version: '1.3.0', users: 81, percentage: 0.1, released: '11 weeks ago', status: 'legacy' },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'outdated': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'legacy': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto p-6">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Version Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Zing browser version adoption rates and update analytics
            </p>
          </div>

          {/* Version Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Current Version"
              value="1.3.5"
              change={84.2}
              changeLabel="adoption rate"
              icon={Package}
              trend="up"
            />
            <MetricCard
              title="Update Success"
              value="96.8%"
              change={2.1}
              changeLabel="vs last month"
              icon={CheckCircle}
              trend="up"
            />
            <MetricCard
              title="Pending Updates"
              value={7842}
              change={-15.3}
              changeLabel="vs last week"
              icon={Download}
              trend="up"
            />
            <MetricCard
              title="Avg Update Time"
              value="4.2 days"
              change={-18.5}
              changeLabel="faster adoption"
              icon={Clock}
              trend="up"
            />
          </div>

          {/* Version Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Version Adoption Timeline
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Version adoption curve over time</p>
                  <p className="text-xs mt-1 opacity-70">Rolling 90-day adoption rates</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Update Success Funnel
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Update process success rates</p>
                  <p className="text-xs mt-1 opacity-70">Detection → Download → Install</p>
                </div>
              </div>
            </div>
          </div>

          {/* Version Distribution Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Version Distribution
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left py-3">Version</th>
                    <th className="text-left py-3">Users</th>
                    <th className="text-left py-3">Percentage</th>
                    <th className="text-left py-3">Released</th>
                    <th className="text-left py-3">Status</th>
                    <th className="text-left py-3">Usage Bar</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900 dark:text-gray-100">
                  {versionData.map((version, index) => (
                    <tr key={version.version} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-4">
                        <span className="font-mono font-semibold">{version.version}</span>
                      </td>
                      <td className="py-4">
                        <span className="font-medium">{version.users.toLocaleString()}</span>
                      </td>
                      <td className="py-4">
                        <span className="font-bold">{version.percentage}%</span>
                      </td>
                      <td className="py-4">
                        <span className="text-gray-500 dark:text-gray-400">{version.released}</span>
                      </td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(version.status)}`}>
                          {version.status}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full bg-blue-600 dark:bg-blue-400"
                            style={{ width: `${version.percentage}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Update Analytics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Update Process Analytics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">98.2%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Detection Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">94.7%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Download Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">96.8%</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Install Success</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">4.2d</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Avg Adoption</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}