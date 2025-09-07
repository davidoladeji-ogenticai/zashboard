'use client'

import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { MetricCard } from '@/components/metric-card'
import {
  Shield,
  Lock,
  Eye,
  Database,
  UserCheck,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

export default function PrivacyPage() {
  const privacyMetrics = [
    { category: 'Data Collection', status: 'compliant', details: 'Anonymous UUID tracking only' },
    { category: 'User Consent', status: 'compliant', details: 'Opt-out available in settings' },
    { category: 'Data Retention', status: 'compliant', details: '90-day automatic deletion' },
    { category: 'Geographic Compliance', status: 'compliant', details: 'GDPR, CCPA compliant' },
    { category: 'Data Encryption', status: 'secure', details: 'AES-256 at rest, TLS 1.3 in transit' },
    { category: 'Access Controls', status: 'secure', details: 'Admin-only dashboard access' },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'secure':
        return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
      case 'violation':
        return <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
      default:
        return <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'secure':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      case 'violation':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
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
              Privacy & Compliance
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Data protection, user privacy, and regulatory compliance status
            </p>
          </div>

          {/* Privacy Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="Anonymous Users"
              value="100%"
              change={0}
              changeLabel="privacy compliant"
              icon={UserCheck}
              trend="neutral"
            />
            <MetricCard
              title="Data Retention"
              value="90 days"
              change={0}
              changeLabel="auto-deletion"
              icon={Clock}
              trend="neutral"
            />
            <MetricCard
              title="Opt-out Rate"
              value="2.3%"
              change={-0.5}
              changeLabel="vs last month"
              icon={Eye}
              trend="up"
            />
            <MetricCard
              title="Compliance Score"
              value="98.7%"
              change={1.2}
              changeLabel="improvement"
              icon={Shield}
              trend="up"
            />
          </div>

          {/* Privacy Compliance Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Privacy Compliance Status
            </h3>
            <div className="space-y-4">
              {privacyMetrics.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(item.status)}
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">{item.category}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.details}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Collection Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Data We Collect
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Anonymous User ID</span>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">App Version</span>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Platform Type</span>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Country Code (IP-derived)</span>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Usage Metrics</span>
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Data We DON'T Collect
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Personal Identifiers</span>
                  <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">IP Addresses (stored)</span>
                  <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">URLs Visited</span>
                  <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Search Queries</span>
                  <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Browsing History</span>
                  <Lock className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Regulatory Compliance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Regulatory Compliance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Shield className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-1">GDPR</h4>
                <p className="text-sm text-green-600 dark:text-green-400">EU General Data Protection Regulation</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 text-xs rounded">
                  Compliant
                </span>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Database className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-1">CCPA</h4>
                <p className="text-sm text-green-600 dark:text-green-400">California Consumer Privacy Act</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 text-xs rounded">
                  Compliant
                </span>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Lock className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <h4 className="font-semibold text-green-800 dark:text-green-200 mb-1">SOC 2</h4>
                <p className="text-sm text-green-600 dark:text-green-400">Security & Privacy Controls</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 text-xs rounded">
                  Compliant
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}