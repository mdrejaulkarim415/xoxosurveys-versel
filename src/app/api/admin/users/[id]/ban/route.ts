import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { reason } = body

    const user = await db.user.update({
      where: { id },
      data: {
        isBanned: true,
        isActive: false,
        banReason: reason || 'Banned by admin',
      },
    })

    // Create audit log
    await db.auditLog.create({
      data: {
        adminId: 'admin',
        action: 'ban_user',
        target: id,
        details: JSON.stringify({ reason: reason || 'Banned by admin' }),
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Ban user error:', error)
    return NextResponse.json({ error: 'Failed to ban user' }, { status: 500 })
  }
}
