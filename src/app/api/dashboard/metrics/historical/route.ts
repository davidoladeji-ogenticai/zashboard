import { NextRequest, NextResponse } from 'next/server'
import { HistoricalData } from '@/types/analytics'
import { subDays, format } from 'date-fns'

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

    // Generate mock historical data
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90
    const dataPoints = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i)
      let value = 0
      
      switch (metric) {
        case 'dau':
          value = Math.floor(Math.random() * 1000) + 500 + (Math.sin(i * 0.1) * 100)
          break
        case 'mau':
          value = Math.floor(Math.random() * 10000) + 5000
          break
        case 'sessions':
          value = Math.floor(Math.random() * 2000) + 1000
          break
        default:
          value = Math.floor(Math.random() * 100) + 50
      }

      dataPoints.push({
        date: format(date, 'yyyy-MM-dd'),
        value: Math.max(0, value),
        metadata: {
          day_of_week: format(date, 'EEEE'),
          is_weekend: [0, 6].includes(date.getDay())
        }
      })
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