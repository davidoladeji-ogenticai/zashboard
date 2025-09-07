import { LucideIcon } from 'lucide-react'
import { cn, formatNumber, formatPercentage } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  trend = 'neutral',
  className
}: MetricCardProps) {
  const trendColor = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-600 dark:text-gray-400'
  }

  const trendBg = {
    up: 'bg-green-50 dark:bg-green-900/20',
    down: 'bg-red-50 dark:bg-red-900/20',
    neutral: 'bg-gray-50 dark:bg-gray-900/20'
  }

  return (
    <div className={cn(
      "bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm",
      className
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
        </div>
        <div className={cn(
          "p-3 rounded-lg",
          trendBg[trend]
        )}>
          <Icon className={cn("h-6 w-6", trendColor[trend])} />
        </div>
      </div>

      {change !== undefined && (
        <div className="flex items-center mt-4 text-sm">
          <span className={cn("font-medium", trendColor[trend])}>
            {change > 0 ? '+' : ''}{formatPercentage(change)}
          </span>
          {changeLabel && (
            <span className="text-gray-500 dark:text-gray-400 ml-1">
              {changeLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}