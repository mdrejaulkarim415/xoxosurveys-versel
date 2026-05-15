import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    const testEmail = email || process.env.SMTP_USER

    const smtpUser = process.env.SMTP_USER
    const smtpPassword = process.env.SMTP_PASSWORD

    if (!smtpUser || !smtpPassword) {
      return NextResponse.json({ error: 'SMTP not configured' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: { user: smtpUser, pass: smtpPassword },
    })

    // Verify connection first
    try {
      await transporter.verify()
      console.log('[Test Email] SMTP connection verified')
    } catch (verifyErr: any) {
      return NextResponse.json({
        step: 'verify',
        error: verifyErr?.message,
        code: verifyErr?.code,
        command: verifyErr?.command,
      }, { status: 500 })
    }

    // Send test email
    try {
      const result = await transporter.sendMail({
        from: `"XoXoSurveys" <${smtpUser}>`,
        to: testEmail,
        subject: 'Test Email - XoXoSurveys Password Reset',
        html: '<h2>Test Email</h2><p>This is a test email from XoXoSurveys. If you received this, SMTP is working!</p>',
        text: 'Test Email - If you see this, SMTP is working!',
      })

      return NextResponse.json({
        success: true,
        messageId: result.messageId,
        response: result.response,
        sentTo: testEmail,
      })
    } catch (sendErr: any) {
      return NextResponse.json({
        step: 'send',
        error: sendErr?.message,
        code: sendErr?.code,
        command: sendErr?.command,
        response: sendErr?.response,
      }, { status: 500 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 })
  }
}
