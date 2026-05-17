import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * Change password for a logged-in user.
 * Requires: userId (cuid), currentPassword, newPassword
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, currentPassword, newPassword } = body

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'User ID, current password, and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    // Find user by cuid
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
        isBanned: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: 'Account is suspended' },
        { status: 403 }
      )
    }

    // Verify current password
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'No password set for this account' },
        { status: 400 }
      )
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Hash new password and update
    const newPasswordHash = await bcrypt.hash(newPassword, 12)
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    })

    // Log activity (non-blocking)
    try {
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: 'password_change',
          details: JSON.stringify({ method: 'settings_page' }),
        },
      })
    } catch {
      // Non-critical - don't fail the request
    }

    return NextResponse.json({ success: true, message: 'Password changed successfully' })
  } catch (error: any) {
    console.error('[Change Password] Error:', error)
    return NextResponse.json(
      { error: 'Failed to change password. Please try again.' },
      { status: 500 }
    )
  }
}
