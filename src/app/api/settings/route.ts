import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Public endpoint — returns only settings safe for the frontend
export async function GET() {
  try {
    const keysToFetch = ['telegramSupportUsername']

    const settings = await db.adminSettings.findMany({
      where: {
        key: { in: keysToFetch },
      },
    })

    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    // Provide defaults if not set
    return NextResponse.json({
      telegramSupportUsername: settingsMap.telegramSupportUsername || 'XoXoSurveysSupport',
    })
  } catch (error) {
    console.error('Get public settings error:', error)
    return NextResponse.json({
      telegramSupportUsername: 'XoXoSurveysSupport',
    })
  }
}
