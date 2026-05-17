import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

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
    console.log('[Forgot Password] Reset columns ensured')
  } catch (err: any) {
    if (err?.message?.includes('duplicate column') || err?.message?.includes('already exists')) {
      columnsEnsured = true
    } else {
      console.error('[Forgot Password] Column ensure error:', err?.message)
      throw err
    }
  }
}

// Direct SMTP send — avoids logo attachment issues on Vercel serverless
async function sendResetEmail(email: string, resetUrl: string): Promise<boolean> {
  const smtpUser = process.env.SMTP_USER
  const smtpPassword = process.env.SMTP_PASSWORD

  if (!smtpUser || !smtpPassword) {
    console.error('[Forgot Password] SMTP credentials not configured')
    return false
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user: smtpUser, pass: smtpPassword },
  })

  try {
    const result = await transporter.sendMail({
      from: `"XoXoSurveys" <${smtpUser}>`,
      to: email,
      subject: 'Reset Your Password - XoXoSurveys',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - XoXoSurveys</title>
</head>
<body style="margin:0; padding:0; font-family:Arial,Helvetica,sans-serif; background-color:#f4f5f7;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    <div style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%); padding:28px 32px; text-align:center;">
        <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700;">XoXoSurveys</h1>
        <p style="margin:6px 0 0; color:rgba(255,255,255,0.9); font-size:14px;">Password Reset</p>
      </div>
      <div style="padding:28px 32px;">
        <h2 style="color:#36383A; font-size:19px; margin:0 0 14px;">Reset your password</h2>
        <p style="color:#4B4B4B; font-size:15px; line-height:1.6; margin:0 0 14px;">Hi there,</p>
        <p style="color:#4B4B4B; font-size:15px; line-height:1.6; margin:0 0 14px;">We received a request to reset your password. Click the button below to choose a new password:</p>
        <div style="text-align:center; margin:16px 0 24px;">
          <a href="${resetUrl}" style="display:inline-block; background:linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%); color:#ffffff !important; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600;">Reset My Password</a>
        </div>
        <p style="color:#4B4B4B; font-size:14px; line-height:1.6; margin:0 0 8px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <div style="background:#f9fafb; border:1px solid #e2eaf1; border-radius:8px; padding:12px 16px; word-break:break-all; font-size:13px; color:#4B4B4B; font-family:monospace;">${resetUrl}</div>
        <p style="margin-top:14px; color:#999999; font-size:13px; line-height:1.5;">This reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        <div style="background:#FFFBEB; border:1px solid #F59E0B30; border-radius:8px; padding:12px 16px; margin-top:14px;">
          <p style="margin:0; color:#92400E; font-size:13px; font-weight:500;">For security, this link can only be used once. After resetting, you will be logged out of all devices.</p>
        </div>
      </div>
      <div style="padding:16px 32px 24px; border-top:1px solid #e2eaf1;">
        <p style="color:#999999; font-size:12px; line-height:1.5; margin:0;">
          This email was sent to <strong>${email}</strong> because a password reset was requested on XoXoSurveys.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`,
      text: `
XoXoSurveys - Password Reset

Hi there,

We received a request to reset your password. Click the link below to choose a new password:

${resetUrl}

This reset link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.

- XoXoSurveys Team
      `.trim(),
    })

    console.log(`[Forgot Password] Email sent to ${email}, messageId: ${result.messageId}`)
    return true
  } catch (error: any) {
    console.error('[Forgot Password] Email send error:', error?.message)
    console.error('[Forgot Password] Email error code:', error?.code)
    console.error('[Forgot Password] Email error response:', error?.response)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureResetColumns()

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email using raw SQL
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

    // Build the reset URL — remove trailing slash from baseUrl
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'https://xoxosurveys.com').replace(/\/+$/, '')
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`

    // Send the reset email (blocking — so we can see if it actually fails)
    const emailSent = await sendResetEmail(email, resetUrl)
    if (!emailSent) {
      // SMTP not configured - still save token but log warning
      // In production, this should return an error; in dev/demo, we proceed gracefully
      console.warn('[Forgot Password] Email could not be sent (SMTP not configured). Reset token saved for user.')
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, we have sent a password reset link.',
        _dev_note: process.env.NODE_ENV !== 'production' ? 'SMTP not configured - email not actually sent' : undefined,
      })
    }

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
