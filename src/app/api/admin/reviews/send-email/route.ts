import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'

/**
 * POST /api/admin/reviews/send-email
 * Send an email to a user whose account is under review
 * Body: { reviewId, adminId, subject, message }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { reviewId, adminId, subject, message } = body

    if (!reviewId || !adminId || !subject || !message) {
      return NextResponse.json(
        { error: 'reviewId, adminId, subject, and message are required' },
        { status: 400 }
      )
    }

    const review = await db.accountReview.findUnique({
      where: { id: reviewId },
      include: { user: { select: { email: true, firstname: true, lastname: true } } },
    })

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Send email
    const emailSent = await sendEmail({
      to: review.user.email,
      subject,
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background-color:#f4f5f7;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    <div style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%); padding:24px 32px; text-align:center;">
        <h1 style="color:#ffffff; margin:0; font-size:20px; font-weight:700;">Message from XoXoSurveys</h1>
      </div>
      <div style="padding:24px 32px;">
        <p style="color:#36383A; font-size:15px; line-height:1.6; margin:0 0 16px;">Dear ${review.user.firstname || review.user.email.split('@')[0]},</p>
        <div style="background:#f9fafb; border:1px solid #e2eaf1; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="color:#4B4B4B; font-size:14px; line-height:1.7; margin:0; white-space:pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
        <p style="color:#999999; font-size:13px; margin-top:16px;">This message was sent by the XoXoSurveys admin team regarding your account review.</p>
        <div style="background:#FFFBEB; border:1px solid #F59E0B30; border-radius:8px; padding:12px 16px; margin-top:16px;">
          <p style="margin:0; color:#92400E; font-size:13px; font-weight:500;">If you wish to respond, please contact our support team through the Help section on the platform.</p>
        </div>
      </div>
      <div style="padding:20px 32px; border-top:1px solid #e2eaf1;">
        <p style="color:#999999; font-size:11px; margin:0;">This email was sent to <strong>${review.user.email}</strong>.</p>
        <p style="color:#999999; font-size:11px; margin:8px 0 0;"><a href="https://xoxosurveys.com" style="color:#0FBCC0; text-decoration:none;">XoXoSurveys</a> &mdash; #1 Survey Platform</p>
      </div>
    </div>
  </div>
</body>
</html>`,
      text: `Message from XoXoSurveys:\n\n${message}\n\nIf you wish to respond, please contact our support team through the Help section.`,
    })

    // Update review record
    await db.accountReview.update({
      where: { id: reviewId },
      data: {
        adminEmailSent: true,
        adminEmailContent: message,
      },
    })

    // Log audit
    await db.auditLog.create({
      data: {
        adminId,
        action: 'review_email_sent',
        target: review.userId,
        details: JSON.stringify({
          reviewId,
          subject,
          messageLength: message.length,
        }),
      },
    })

    return NextResponse.json({ success: true, emailSent })
  } catch (error) {
    console.error('[Admin Reviews Send Email] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
