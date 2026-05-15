import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { sendPasswordResetEmail } from '@/lib/email'

// Auto-ensure passwordResetToken and passwordResetExpires columns exist
let columnsEnsured = false

async function ensureResetColumns() {
  if (columnsEnsured) return
  try {
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT`)
    await db.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpires" TIMESTAMP(3)`)
    columnsEnsured = true
    console.log('[Forgot Password] Reset columns ensured')
  } catch (err: any) {
    // Columns might already exist, that's fine
    if (err?.message?.includes('already exists') || err?.code === '42701') {
      columnsEnsured = true
      console.log('[Forgot Password] Reset columns already exist')
    } else {
      console.error('[Forgot Password] Column ensure error:', err?.message)
      throw err
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

    // Find user by email using raw SQL (to avoid Prisma Client field issues)
    const users: any[] = await db.$queryRaw`
      SELECT id, "passwordHash", "isBanned", "passwordResetExpires"
      FROM "User"
      WHERE email = ${email}
      LIMIT 1
    `

    // Always return success to prevent email enumeration attacks
    if (!users.length || !users[0].passwordHash) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.',
      })
    }

    const user = users[0]

    // Check if user is banned
    if (user.isBanned) {
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.',
      })
    }

    // Rate limit: check if a reset token was created in the last 60 seconds
    if (user.passwordResetExpires) {
      const lastResetSent = new Date(new Date(user.passwordResetExpires).getTime() - 60 * 60 * 1000)
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

    // Save token to user record using raw SQL
    await db.$executeRaw`
      UPDATE "User"
      SET "passwordResetToken" = ${resetToken},
          "passwordResetExpires" = ${resetExpires}
      WHERE id = ${user.id}
    `

    // Build the reset URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xoxosurveys.com'
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

    // Send the reset email (blocking — so we can see if it actually fails)
    const emailSent = await sendPasswordResetEmail(email, resetUrl)
    if (!emailSent) {
      console.error(`[Forgot Password] Email delivery failed for ${email}`)
      return NextResponse.json(
        { error: 'Failed to send reset email. Please check your email address and try again.' },
        { status: 500 }
      )
    }

    console.log(`[Forgot Password] Reset email sent successfully to ${email}`)

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
