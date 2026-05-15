import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email } = body

    // Find user by id (cuid), userId (numeric), or email
    let user = null

    if (userId && typeof userId === 'string' && userId.startsWith('cl')) {
      // It's a cuid (database id)
      user = await db.user.findUnique({ where: { id: userId } })
    } else if (userId && typeof userId === 'number') {
      // It's a numeric userId
      user = await db.user.findUnique({ where: { userId } })
    } else if (email) {
      // Find by email
      user = await db.user.findUnique({ where: { email } })
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please register first.' },
        { status: 404 }
      )
    }

    // Already verified
    if (user.emailVerified) {
      return NextResponse.json(
        { message: 'Email is already verified' },
        { status: 200 }
      )
    }

    // Rate limit: don't send more than once per 60 seconds
    if (user.emailVerificationSentAt) {
      const timeSinceLastSent = Date.now() - new Date(user.emailVerificationSentAt).getTime()
      if (timeSinceLastSent < 60 * 1000) {
        const waitSeconds = Math.ceil((60 * 1000 - timeSinceLastSent) / 1000)
        return NextResponse.json(
          { error: `Please wait ${waitSeconds} seconds before requesting another verification email` },
          { status: 429 }
        )
      }
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex')

    // Update user with token and timestamp
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: token,
        emailVerificationSentAt: new Date(),
      },
    })

    // Build verification URL from request headers (works on Vercel)
    const host = request.headers.get('host')
    const protocol = request.headers.get('x-forwarded-proto') || 'https'
    const envBaseUrl = process.env.NEXT_PUBLIC_BASE_URL
    const baseUrl = (envBaseUrl && envBaseUrl !== 'http://localhost:3000')
      ? envBaseUrl
      : (host ? `${protocol}://${host}` : 'http://localhost:3000')
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`

    // Send verification email via Nodemailer
    const emailSent = await sendVerificationEmail(user.email, verificationUrl)

    if (!emailSent) {
      console.warn(`[Send Verification] Email failed to send for ${user.email}, but token is stored`)
    }

    return NextResponse.json({
      message: emailSent
        ? 'Verification email sent successfully! Check your inbox (and spam folder).'
        : 'Verification token generated. Email delivery may be delayed. Please check your spam folder.',
      // In development, return the URL for testing purposes
      ...(process.env.NODE_ENV === 'development' && { verificationUrl }),
    }, { status: 200 })
  } catch (error) {
    console.error('[Send Verification] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
