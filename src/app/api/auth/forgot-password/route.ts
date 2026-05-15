import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'

// Auto-ensure passwordResetToken and passwordResetExpires columns exist
let columnsEnsured = false

async function ensureResetColumns() {
  if (columnsEnsured) return
  try {
    // Try a lightweight query that touches both columns
    await db.$queryRaw`SELECT "passwordResetToken", "passwordResetExpires" FROM "User" LIMIT 0`
    columnsEnsured = true
    console.log('[Forgot Password] Reset columns verified')
  } catch (err: any) {
    console.log('[Forgot Password] Reset columns missing, adding them...')
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT`)
      await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3)`)
      columnsEnsured = true
      console.log('[Forgot Password] Reset columns added successfully')
    } catch (alterErr: any) {
      console.error('[Forgot Password] Failed to add columns:', alterErr?.message)
      throw alterErr
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Ensure the database columns exist before doing anything
    await ensureResetColumns()

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await db.user.findUnique({
      where: { email },
    })

    // Always return success to prevent email enumeration attacks
    if (!user || !user.passwordHash) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.',
      })
    }

    // Check if user is banned
    if (user.isBanned) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.',
      })
    }

    // Rate limit: check if a reset token was created in the last 60 seconds
    if (user.passwordResetExpires) {
      const lastResetSent = new Date(user.passwordResetExpires.getTime() - 60 * 60 * 1000)
      const secondsSinceLastReset = (Date.now() - lastResetSent.getTime()) / 1000
      if (secondsSinceLastReset < 60) {
        return NextResponse.json({
          success: true,
          message: 'If an account with that email exists, we have sent a password reset link.',
        })
      }
    }

    // Generate a secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

    // Save token to user record
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    })

    // Build the reset URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xoxosurveys.com'
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

    // Send the reset email (non-blocking — don't wait for email to succeed)
    sendPasswordResetEmail(email, resetUrl).then((sent) => {
      if (!sent) {
        console.error(`[Forgot Password] Failed to send reset email to ${email}`)
      }
    }).catch((err) => {
      console.error('[Forgot Password] Email send error:', err)
    })

    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.',
    })
  } catch (error: any) {
    console.error('[Forgot Password] Error:', error?.message || error)
    console.error('[Forgot Password] Stack:', error?.stack)
    return NextResponse.json(
      { error: `Failed to process password reset request: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    )
  }
}
