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
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
