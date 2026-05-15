import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Auto-ensure passwordResetToken and passwordResetExpires columns exist
let columnsEnsured = false

async function ensureResetColumns() {
  if (columnsEnsured) return
  try {
    await db.$queryRaw`SELECT "passwordResetToken", "passwordResetExpires" FROM "User" LIMIT 0`
    columnsEnsured = true
  } catch (err: any) {
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3)`)
      columnsEnsured = true
      console.log('[Reset Password] Reset columns added successfully')
    } catch (alterErr: any) {
      console.error('[Reset Password] Failed to add columns:', alterErr?.message)
      throw alterErr
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure the database columns exist
    await ensureResetColumns()

    const body = await request.json()
    const { token, password } = body

    // Validate input
    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      )
    }

    // Password strength validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain at least one letter and one number' },
        { status: 400 }
      )
    }

    // Find user by reset token
    const user = await db.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset link.' },
        { status: 400 }
      )
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    // Update user: set new password, clear reset token
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    })

    // Delete all existing sessions (force re-login on all devices)
    try {
      await db.session.deleteMany({
        where: { userId: user.id },
      })
    } catch (e) {
      console.warn('[Reset Password] Failed to clear sessions:', e)
    }

    // Log activity
    try {
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: 'password_reset',
          details: JSON.stringify({ method: 'forgot_password' }),
        },
      })
    } catch (e) {
      console.warn('[Reset Password] Activity logging failed:', e)
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.',
    })
  } catch (error: any) {
    console.error('[Reset Password] Error:', error?.message || error)
    console.error('[Reset Password] Stack:', error?.stack)
    return NextResponse.json(
      { error: `Failed to reset password: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
