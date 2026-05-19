import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { isResolved, resolution, resolvedBy } = body

    const event = await db.fraudEvent.update({
      where: { id },
      data: {
        ...(isResolved !== undefined && { isResolved }),
        ...(resolution && { resolution }),
        ...(resolvedBy && { resolvedBy }),
        ...(isResolved && { resolvedAt: new Date() }),
      },
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Update fraud event error:', error)
    return NextResponse.json({ error: 'Failed to update fraud event' }, { status: 500 })
  }
}
