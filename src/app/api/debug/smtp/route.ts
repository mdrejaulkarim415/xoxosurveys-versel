import { NextResponse } from 'next/server'

export async function GET() {
  const smtpUser = process.env.SMTP_USER
  const smtpPassword = process.env.SMTP_PASSWORD
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  return NextResponse.json({
    smtpConfigured: !!(smtpUser && smtpPassword),
    smtpHost: smtpHost || 'NOT SET',
    smtpPort: smtpPort || 'NOT SET',
    smtpUser: smtpUser ? `${smtpUser.substring(0, 3)}***@${smtpUser.split('@')[1] || '?'}` : 'NOT SET',
    smtpPasswordSet: !!smtpPassword,
    baseUrl: baseUrl || 'NOT SET',
  })
}
