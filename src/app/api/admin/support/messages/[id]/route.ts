import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendSupportReplyEmail } from '@/lib/email'

// PATCH /api/admin/support/messages/[id] - Update message status or reply
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { status, adminReply, priority, repliedBy } = body

    const existing = await db.supportMessage.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, firstname: true, lastname: true },
        },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const updateData: any = {}

    if (status) {
      const validStatuses = ['open', 'read', 'replied', 'closed']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
      if (status === 'read' && !existing.readAt) {
        updateData.readAt = new Date()
      }
      if (status === 'closed') {
        updateData.readAt = existing.readAt || new Date()
      }
    }

    if (priority) {
      const validPriorities = ['low', 'normal', 'high', 'urgent']
      if (!validPriorities.includes(priority)) {
        return NextResponse.json({ error: 'Invalid priority' }, { status: 400 })
      }
      updateData.priority = priority
    }

    if (adminReply !== undefined) {
      updateData.adminReply = adminReply.trim()
      updateData.repliedBy = repliedBy || 'admin'
      updateData.repliedAt = new Date()
      updateData.status = 'replied'
    }

    const updated = await db.supportMessage.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: { id: true, email: true, firstname: true, lastname: true },
        },
      },
    })

    // Send email notification to the user when admin replies
    if (adminReply !== undefined && adminReply.trim()) {
      const userEmail = updated.email
      const userName = updated.name
      const repliedByName = repliedBy || 'admin'

      // Send email (non-blocking - don't wait for it to complete)
      sendSupportReplyEmail(
        userEmail,
        userName,
        updated.message,
        adminReply.trim(),
        repliedByName
      ).then((emailSent) => {
        if (emailSent) {
          console.log(`[Admin Support] Reply email sent to ${userEmail}`)
        } else {
          console.warn(`[Admin Support] Failed to send reply email to ${userEmail}`)
        }
      }).catch((err) => {
        console.error('[Admin Support] Email send error:', err)
      })

      // Create in-app notification if user is registered
      if (updated.user?.id) {
        try {
          await db.notification.create({
            data: {
              userId: updated.user.id,
              type: 'system',
              title: 'Support Reply Received',
              message: `Admin replied to your support message: "${adminReply.trim().substring(0, 80)}${adminReply.trim().length > 80 ? '...' : ''}"`,
              iconType: 'info',
            },
          })
          console.log(`[Admin Support] Notification created for user ${updated.user.id}`)
        } catch (notifError) {
          console.error('[Admin Support] Failed to create notification:', notifError)
          // Don't fail the whole request if notification fails
        }
      }
    }

    console.log(`[Admin Support] Updated message ${id}: status=${updated.status}`)

    return NextResponse.json({ success: true, message: updated })
  } catch (error: any) {
    console.error('[Admin Support] Error updating message:', error)
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}

// DELETE /api/admin/support/messages/[id] - Delete a message
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const existing = await db.supportMessage.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    await db.supportMessage.delete({ where: { id } })

    console.log(`[Admin Support] Deleted message ${id}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Admin Support] Error deleting message:', error)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}
