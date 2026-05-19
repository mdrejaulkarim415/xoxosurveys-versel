import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/settings/banner
 * Public API - returns the announcement banner settings for users
 * Only returns banner data if enabled
 */
export async function GET() {
  try {
    const bannerEnabled = await db.adminSettings.findUnique({ where: { key: 'bannerEnabled' } })
    const bannerMessage = await db.adminSettings.findUnique({ where: { key: 'bannerMessage' } })
    const bannerType = await db.adminSettings.findUnique({ where: { key: 'bannerType' } })

    const enabled = bannerEnabled?.value === 'true'

    if (!enabled) {
      return NextResponse.json({ enabled: false })
    }

    return NextResponse.json({
      enabled: true,
      message: bannerMessage?.value || '',
      type: bannerType?.value || 'info',
    })
  } catch (error) {
    console.error('[Banner Settings] Error:', error)
    return NextResponse.json({ enabled: false })
  }
}
