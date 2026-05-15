import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(
        new URL('/?verify=missing-token', request.url)
      )
    }

    // Find user by verification token
    const user = await db.user.findFirst({
      where: { emailVerificationToken: token },
    })

    if (!user) {
      return NextResponse.redirect(
        new URL('/?verify=invalid-token', request.url)
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
        new URL('/?verify=already-verified', request.url)
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
          new URL('/?verify=token-expired', request.url)
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
      new URL('/?verify=success', request.url)
    )
  } catch (error) {
    console.error('[Verify Email] Error:', error)
    return NextResponse.redirect(
      new URL('/?verify=error', request.url)
    )
  }
}
