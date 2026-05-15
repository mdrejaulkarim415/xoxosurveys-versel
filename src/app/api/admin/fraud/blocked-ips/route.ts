import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const blockedIps = await db.blockedIp.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(blockedIps)
  } catch (error) {
    console.error('Blocked IPs list error:', error)
    return NextResponse.json({ error: 'Failed to fetch blocked IPs' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ipAddress, reason, blockedBy } = body

    if (!ipAddress || !reason) {
      return NextResponse.json({ error: 'IP address and reason are required' }, { status: 400 })
    }

    const blockedIp = await db.blockedIp.create({
      data: {
        ipAddress,
        reason,
        blockedBy: blockedBy || null,
        isAutoBlocked: false,
      },
    })

    return NextResponse.json(blockedIp, { status: 201 })
  } catch (error) {
    console.error('Create blocked IP error:', error)
    return NextResponse.json({ error: 'Failed to create blocked IP' }, { status: 500 })
  }
}
