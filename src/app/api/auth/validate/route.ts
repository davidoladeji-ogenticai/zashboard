import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'This endpoint is deprecated. Please use Clerk authentication at /sign-in or /sign-up'
  }, { status: 410 })
}

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'This endpoint is deprecated. Please use Clerk authentication at /sign-in or /sign-up'
  }, { status: 410 })
}
