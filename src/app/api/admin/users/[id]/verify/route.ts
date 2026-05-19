import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const user = await db.user.update({
      where: { id },
      data: { emailVerified: true },
    })

    await db.auditLog.create({
      data: {
        adminId: 'admin',
        action: 'verify_user_email',
        target: id,
        details: JSON.stringify({ verified: true }),
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Verify user error:', error)
    return NextResponse.json({ error: 'Failed to verify user' }, { status: 500 })
  }
}
