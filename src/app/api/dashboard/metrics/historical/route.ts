import { NextRequest, NextResponse } from 'next/server'
import { HistoricalData } from '@/types/analytics'
import { subDays, format } from 'date-fns'
import { analyticsStore } from '@/lib/analytics-store'

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.ZING_ANALYTICS_KEY || 'demo-key'
    
    if (!authHeader || authHeader.replace('Bearer ', '') !== expectedToken) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_ERROR' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const period = searchParams.get('period') || '30d'
    const metric = searchParams.get('metric') || 'dau'

    // Get real historical data from stored events
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const historicalMetrics = analyticsStore.getHistoricalMetrics(days)
    
    // Convert to expected format
    const dataPoints = historicalMetrics.daily_metrics.map(dayMetric => {
      let value = 0
      
      switch (metric) {
        case 'dau':
          value = dayMetric.active_users
          break
        case 'mau':
          value = dayMetric.active_users * 7 // Estimate MAU from DAU
          break
        case 'sessions':
          value = dayMetric.new_sessions
          break
        default:
          value = dayMetric.active_users
      }

      const date = new Date(dayMetric.date)
      return {
        date: format(date, 'yyyy-MM-dd'),
        value: Math.max(0, value),
        metadata: {
          day_of_week: format(date, 'EEEE'),
          is_weekend: [0, 6].includes(date.getDay()),
          avg_session_duration: dayMetric.avg_session_duration
        }
      }
    })

    // Fill in missing days with zero values if no real data
    if (dataPoints.length < days) {
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i)
        const dateStr = format(date, 'yyyy-MM-dd')
        
        if (!dataPoints.find(dp => dp.date === dateStr)) {
          dataPoints.push({
            date: dateStr,
            value: 0,
            metadata: {
              day_of_week: format(date, 'EEEE'),
              is_weekend: [0, 6].includes(date.getDay())
            }
          })
        }
      }
      
      // Sort by date
      dataPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }

    const totalValue = dataPoints.reduce((sum, point) => sum + point.value, 0)
    const averageValue = totalValue / dataPoints.length
    const firstValue = dataPoints[0]?.value || 0
    const lastValue = dataPoints[dataPoints.length - 1]?.value || 0
    const growthRate = firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : 0

    const historicalData: HistoricalData = {
      period,
      metric,
      data_points: dataPoints,
      summary: {
        total: totalValue,
        average: Math.round(averageValue),
        growth_rate: Math.round(growthRate * 10) / 10
      }
    }

    return NextResponse.json(historicalData)

  } catch (error) {
    console.error('Historical metrics error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch historical metrics',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}