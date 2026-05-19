import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const settings = await db.adminSettings.findMany({
      orderBy: { key: 'asc' },
    })

    // Convert to key-value object
    const settingsMap: Record<string, string> = {}
    settings.forEach((s) => {
      settingsMap[s.key] = s.value
    })

    return NextResponse.json(settingsMap)
  } catch (error) {
    console.error('Get settings error:', error)
    // Return default settings
    return NextResponse.json({
      siteName: 'XoXoSurveys',
      minCashout: '5.00',
      referralBonusPercent: '10',
      vpnBlockThreshold: '70',
      completionSpeedThreshold: '0.3',
      fraudScoreBlockThreshold: '50',
      autoBlockVpn: 'true',
      autoBlockProxy: 'true',
      autoBlockTor: 'true',
      autoFlagFastCompletion: 'true',
      defaultBlockVpn: 'true',
      defaultBlockProxy: 'true',
      defaultMinFraudScore: '50',
      defaultCooldown: '5',
    })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()

    // Validate API URL fields before saving
    if (body.featuredOfferApiUrl && body.featuredOfferApiUrl.trim() !== '') {
      try {
        new URL(body.featuredOfferApiUrl)
      } catch {
        return NextResponse.json({ error: 'Invalid API URL format. Must be a valid URL like https://revtoo.com/api/offers/' }, { status: 400 })
      }
    }

    // Validate API Key field before saving - must look like a real API key
    if (body.featuredOfferApiKey && body.featuredOfferApiKey.trim() !== '') {
      const key = body.featuredOfferApiKey.trim()
      // API keys must be at least 20 alphanumeric characters
      if (key.length < 20 || !/^[a-zA-Z0-9]+$/.test(key)) {
        return NextResponse.json({
          error: 'Invalid API Key format. API keys must be at least 20 alphanumeric characters (no spaces or special characters). If unsure, leave this field empty to use the default key.'
        }, { status: 400 })
      }
    }

    // Upsert each setting
    const operations = Object.entries(body).map(([key, value]) =>
      db.adminSettings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )

    await Promise.all(operations)

    // Create audit log
    await db.auditLog.create({
      data: {
        adminId: 'admin',
        action: 'update_settings',
        details: JSON.stringify(body),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update settings error:', error)
    const message = error instanceof Error ? error.message : 'Failed to update settings'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
