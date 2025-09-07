'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import {
  Activity,
  Clock,
  Cpu,
  HardDrive,
  Zap,
  AlertCircle,
  CheckCircle,
  TrendingUp
} from 'lucide-react'

export default function PerformancePage() {
  const performanceMetrics = [
    { name: 'Startup Time', value: '2.3s', status: 'good', target: '< 3s' },
    { name: 'Memory Usage', value: '156MB', status: 'warning', target: '< 200MB' },
    { name: 'CPU Usage', value: '8.2%', status: 'good', target: '< 15%' },
    { name: 'Response Time', value: '127ms', status: 'excellent', target: '< 200ms' },
    { name: 'Crash Rate', value: '0.08%', status: 'excellent', target: '< 0.1%' },
    { name: 'Error Rate', value: '0.12%', status: 'good', target: '< 0.5%' }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 dark:text-green-400'
      case 'good': return 'text-blue-600 dark:text-blue-400'
      case 'warning': return 'text-yellow-600 dark:text-yellow-400'
      case 'critical': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      default:
        return <Activity className="h-4 w-4 text-gray-600 dark:text-gray-400" />
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
              Performance Metrics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Zing browser performance monitoring and optimization insights
            </p>
          </div>

          {/* Performance Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Avg Startup Time"
              value="2.3s"
              change={-15.2}
              changeLabel="improvement"
              icon={Zap}
              trend="up"
            />
            <MetricCard
              title="Memory Usage"
              value="156MB"
              change={8.4}
              changeLabel="vs last week"
              icon={Cpu}
              trend="down"
            />
            <MetricCard
              title="Response Time"
              value="127ms"
              change={-22.1}
              changeLabel="improvement"
              icon={Activity}
              trend="up"
            />
            <MetricCard
              title="Crash Rate"
              value="0.08%"
              change={-45.6}
              changeLabel="reduction"
              icon={CheckCircle}
              trend="up"
            />
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Performance Trends
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Performance trend analysis chart</p>
                  <p className="text-xs mt-1 opacity-70">24-hour rolling metrics</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Resource Utilization
              </h3>
              <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <HardDrive className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>System resource monitoring</p>
                  <p className="text-xs mt-1 opacity-70">CPU, Memory, Network usage</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Benchmarks Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Performance Benchmarks
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left py-3">Metric</th>
                    <th className="text-left py-3">Current Value</th>
                    <th className="text-left py-3">Target</th>
                    <th className="text-left py-3">Status</th>
                    <th className="text-left py-3">Trend</th>
                  </tr>
                </thead>
                <tbody className="text-gray-900 dark:text-gray-100">
                  {performanceMetrics.map((metric, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-4">
                        <span className="font-medium">{metric.name}</span>
                      </td>
                      <td className="py-4">
                        <span className="font-mono text-lg">{metric.value}</span>
                      </td>
                      <td className="py-4">
                        <span className="text-gray-500 dark:text-gray-400">{metric.target}</span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(metric.status)}
                          <span className={`font-medium capitalize ${getStatusColor(metric.status)}`}>
                            {metric.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center">
                          {metric.status === 'excellent' || metric.status === 'good' ? (
                            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400 transform rotate-180" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Health Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              System Health Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <h4 className="font-semibold text-green-800 dark:text-green-200">Excellent</h4>
                <p className="text-sm text-green-600 dark:text-green-400">Performance Optimized</p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Activity className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <h4 className="font-semibold text-blue-800 dark:text-blue-200">Monitoring</h4>
                <p className="text-sm text-blue-600 dark:text-blue-400">Real-time Analysis</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Clock className="h-12 w-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Optimizing</h4>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">Memory Usage</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}