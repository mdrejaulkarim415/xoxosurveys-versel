import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const blockedDevices = await db.blockedDevice.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(blockedDevices)
  } catch (error) {
    console.error('Blocked devices list error:', error)
    return NextResponse.json({ error: 'Failed to fetch blocked devices' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fingerprint, reason, blockedBy } = body

    if (!fingerprint || !reason) {
      return NextResponse.json({ error: 'Fingerprint and reason are required' }, { status: 400 })
    }

    const blockedDevice = await db.blockedDevice.create({
      data: {
        fingerprint,
        reason,
        blockedBy: blockedBy || null,
        isAutoBlocked: false,
      },
    })

    return NextResponse.json(blockedDevice, { status: 201 })
  } catch (error) {
    console.error('Create blocked device error:', error)
    return NextResponse.json({ error: 'Failed to create blocked device' }, { status: 500 })
  }
}
