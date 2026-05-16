import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.blockedIp.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete blocked IP error:', error)
    return NextResponse.json({ error: 'Failed to delete blocked IP' }, { status: 500 })
  }
}
