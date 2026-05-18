import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

function getBaseUrl(request: NextRequest): string {
  // 1. Check env variable first
  const envUrl = process.env.NEXT_PUBLIC_BASE_URL
  if (envUrl && envUrl !== 'http://localhost:3000') {
    return envUrl
  }

  // 2. Build from request headers (works on Vercel)
  const host = request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  if (host) {
    return `${protocol}://${host}`
  }

  // 3. Fallback
  return 'http://localhost:3000'
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    const baseUrl = getBaseUrl(request)

    if (!token) {
      return NextResponse.redirect(
        new URL('/?verify=missing-token', baseUrl)
      )
    }

    // Find user by verification token
    const user = await db.user.findFirst({
      where: { emailVerificationToken: token },
    })

    if (!user) {
      return NextResponse.redirect(
        new URL('/?verify=invalid-token', baseUrl)
      )
    }

    // Already verified
    if (user.emailVerified) {
      // Clear the token anyway
      await db.user.update({
        where: { id: user.id },
        data: { emailVerificationToken: null },
      })
      return NextResponse.redirect(
        new URL('/?verify=already-verified', baseUrl)
      )
    }

    // Check if token is expired (24 hours)
    if (user.emailVerificationSentAt) {
      const timeSinceSent = Date.now() - new Date(user.emailVerificationSentAt).getTime()
      if (timeSinceSent > 24 * 60 * 60 * 1000) {
        // Token expired, clear it
        await db.user.update({
          where: { id: user.id },
          data: { emailVerificationToken: null },
        })
        return NextResponse.redirect(
          new URL('/?verify=token-expired', baseUrl)
        )
      }
    }

    // Verify the email
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        verificationLevel: 1, // email verified
      },
    })

    // Log activity
    try {
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: 'email_verified',
          details: JSON.stringify({ verifiedAt: new Date().toISOString() }),
        },
      })
    } catch {
      // Activity log failure shouldn't block verification
    }

    return NextResponse.redirect(
      new URL('/?verify=success', baseUrl)
    )
  } catch (error) {
    console.error('[Verify Email] Error:', error)
    const baseUrl = getBaseUrl(request)
    return NextResponse.redirect(
      new URL('/?verify=error', baseUrl)
    )
  }
}
