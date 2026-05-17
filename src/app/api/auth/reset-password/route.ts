import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Auto-ensure passwordResetToken and passwordResetExpires columns exist (SQLite compatible)
let columnsEnsured = false

async function ensureResetColumns() {
  if (columnsEnsured) return
  try {
    // Check if columns already exist by querying PRAGMA table_info
    const columns: any[] = await db.$queryRaw`PRAGMA table_info("User")`
    const columnNames = columns.map((c: any) => c.name)
    
    if (!columnNames.includes('passwordResetToken')) {
      await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "passwordResetToken" TEXT`)
    }
    if (!columnNames.includes('passwordResetExpires')) {
      await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "passwordResetExpires" DATETIME`)
    }
    columnsEnsured = true
    console.log('[Reset Password] Reset columns ensured')
  } catch (err: any) {
    if (err?.message?.includes('duplicate column') || err?.message?.includes('already exists')) {
      columnsEnsured = true
      console.log('[Reset Password] Reset columns already exist')
    } else {
      console.error('[Reset Password] Column ensure error:', err?.message)
      throw err
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

    // Find user by reset token using raw SQL (SQLite compatible)
    const users: any[] = await db.$queryRaw`
      SELECT id, "passwordResetToken", "passwordResetExpires"
      FROM "User"
      WHERE "passwordResetToken" = ${token}
        AND "passwordResetExpires" > datetime('now')
      LIMIT 1
    `

    if (!users.length) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token. Please request a new password reset link.' },
        { status: 400 }
      )
    }

    const user = users[0]

    // Hash the new password
    const salt = await bcrypt.genSalt(12)
    const passwordHash = await bcrypt.hash(password, salt)

    // Update user: set new password, clear reset token using raw SQL
    await db.$executeRaw`
      UPDATE "User"
      SET "passwordHash" = ${passwordHash},
          "passwordResetToken" = NULL,
          "passwordResetExpires" = NULL
      WHERE id = ${user.id}
    `

    // Delete all existing sessions (force re-login on all devices)
    try {
      await db.$executeRaw`
        DELETE FROM "Session" WHERE "userId" = ${user.id}
      `
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
