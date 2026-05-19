import nodemailer from 'nodemailer'
import { readFileSync } from 'fs'
import { join } from 'path'

// ==================== SMTP Transport Configuration ====================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false', // default true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
})

// ==================== Logo Base64 (loaded once) ====================

let logoBase64: string | null = null

function getLogoBase64(): string {
  if (logoBase64) return logoBase64
  try {
    const logoPath = join(process.cwd(), 'public', 'logo.png')
    const logoBuffer = readFileSync(logoPath)
    logoBase64 = logoBuffer.toString('base64')
    return logoBase64
  } catch {
    console.warn('[Email] Could not load logo.png for email embedding')
    return ''
  }
}

// Shared header HTML with logo - used by all email templates
function getEmailHeader(title: string, subtitle?: string): string {
  const logoData = getLogoBase64()
  const logoImg = logoData
    ? `<img src="cid:xoxosurveys-logo" alt="XoXoSurveys" style="width:48px; height:48px; border-radius:50%; margin-bottom:12px; display:block; margin-left:auto; margin-right:auto;" />`
    : ''

  return `
  <div style="background: linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%); padding: 32px 40px; text-align: center;">
    ${logoImg}
    <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">${title}</h1>
    ${subtitle ? `<p style="margin:8px 0 0; color:rgba(255,255,255,0.9); font-size:14px; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">${subtitle}</p>` : ''}
  </div>`
}

// Shared footer HTML
function getEmailFooter(content: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xoxosurveys.com'
  return `
  <div style="padding:20px 40px 32px; border-top:1px solid #e2eaf1;">
    <p style="color:#999999; font-size:12px; line-height:1.5; margin:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      ${content}
    </p>
    <p style="color:#999999; font-size:11px; line-height:1.5; margin:8px 0 0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
      <a href="${baseUrl}" style="color:#0FBCC0; text-decoration:none;">XoXoSurveys</a> &mdash; #1 Survey Platform
    </p>
  </div>`
}

// ==================== Email Templates ====================

function getVerificationEmailHtml(verificationUrl: string, email: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email - XoXoSurveys</title>
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background-color:#f4f5f7;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    <div style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      ${getEmailHeader('XoXoSurveys', 'Email Verification')}
      <div style="padding:32px 40px;">
        <h2 style="color:#36383A; font-size:20px; margin:0 0 16px; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">Verify your email address</h2>
        <p style="color:#4B4B4B; font-size:15px; line-height:1.6; margin:0 0 16px;">Hi there,</p>
        <p style="color:#4B4B4B; font-size:15px; line-height:1.6; margin:0 0 16px;">Thanks for signing up with XoXoSurveys! To start cashing out your earnings, please verify your email address by clicking the button below:</p>
        <div style="text-align:center; margin:8px 0 24px;">
          <a href="${verificationUrl}" style="display:inline-block; background:linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%); color:#ffffff !important; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600; text-align:center; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">Verify My Email</a>
        </div>
        <p style="color:#4B4B4B; font-size:15px; line-height:1.6; margin:0 0 8px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <div style="background:#f9fafb; border:1px solid #e2eaf1; border-radius:8px; padding:12px 16px; word-break:break-all; font-size:13px; color:#4B4B4B; font-family:monospace;">${verificationUrl}</div>
        <p style="margin-top:16px; color:#999999; font-size:13px; line-height:1.5;">This verification link will expire in 24 hours. If you didn't create an account with this email, you can safely ignore this message.</p>
      </div>
      ${getEmailFooter(`This email was sent to <strong>${email}</strong> because an account was registered on XoXoSurveys.`)}
    </div>
  </div>
</body>
</html>`
}

function getVerificationEmailText(verificationUrl: string, email: string): string {
  return `
XoXoSurveys - Email Verification

Hi there,

Thanks for signing up with XoXoSurveys! Please verify your email address by clicking the link below:

${verificationUrl}

This verification link will expire in 24 hours.

If you didn't create an account with this email (${email}), you can safely ignore this message.

- XoXoSurveys Team
  `.trim()
}

function getWelcomeEmailHtml(name: string | null, email: string): string {
  const displayName = name || email.split('@')[0]
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xoxosurveys.com'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to XoXoSurveys!</title>
</head>
<body style="margin:0; padding:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background-color:#f4f5f7;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    <div style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      ${getEmailHeader('Welcome to XoXoSurveys!')}
      <div style="padding:32px 40px;">
        <h2 style="color:#36383A; font-size:20px; margin:0 0 16px; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">Hey ${displayName}, thanks for joining!</h2>
        <p style="color:#4B4B4B; font-size:15px; line-height:1.6; margin:0 0 16px;">You're all set to start earning money by completing surveys. Here's what you can do:</p>

        <table style="width:100%; border-collapse:collapse; margin:16px 0 24px;">
          <tr>
            <td style="padding:10px 0; color:#4B4B4B; font-size:14px; border-bottom:1px solid #f0f0f0;">
              <span style="color:#0FBCC0; font-weight:bold; margin-right:8px;">&#10003;</span> Earn up to $5 per completed survey
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#4B4B4B; font-size:14px; border-bottom:1px solid #f0f0f0;">
              <span style="color:#0FBCC0; font-weight:bold; margin-right:8px;">&#10003;</span> Cash out via Binance Pay, Litecoin, PayPal, Amazon, and more
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#4B4B4B; font-size:14px; border-bottom:1px solid #f0f0f0;">
              <span style="color:#0FBCC0; font-weight:bold; margin-right:8px;">&#10003;</span> Get 10% referral bonus forever when you invite friends
            </td>
          </tr>
          <tr>
            <td style="padding:10px 0; color:#4B4B4B; font-size:14px;">
              <span style="color:#0FBCC0; font-weight:bold; margin-right:8px;">&#10003;</span> Track your earnings and progress in real-time
            </td>
          </tr>
        </table>

        <div style="background:#FFFBEB; border:1px solid #F59E0B30; border-radius:8px; padding:14px 16px; margin:0 0 16px;">
          <p style="margin:0; color:#92400E; font-size:14px; font-weight:600;">Don't forget to verify your email address to unlock cashout!</p>
        </div>

        <div style="text-align:center; margin-top:8px;">
          <a href="${baseUrl}" style="display:inline-block; background:linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%); color:#ffffff !important; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600; text-align:center; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">Start Earning Now</a>
        </div>
      </div>
      ${getEmailFooter(`This email was sent to <strong>${email}</strong>.`)}
    </div>
  </div>
</body>
</html>`
}

// ==================== Email Sending Functions ====================

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  try {
    const smtpUser = process.env.SMTP_USER
    const smtpPassword = process.env.SMTP_PASSWORD

    if (!smtpUser || !smtpPassword) {
      console.error('[Email] SMTP credentials not configured. Set SMTP_USER and SMTP_PASSWORD in .env')
      return false
    }

    const fromName = process.env.SMTP_FROM_NAME || 'XoXoSurveys'
    // Use SMTP_USER as from email to avoid Gmail "Sender rejected" errors
    const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser

    console.log(`[Email] Attempting to send to ${to} from ${fromEmail} via ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`)

    // Load logo as attachment for CID embedding
    const logoPath = join(process.cwd(), 'public', 'logo.png')
    let attachments: any[] = []
    try {
      const { readFileSync: rf } = await import('fs')
      const logoBuffer = rf(logoPath)
      attachments = [{
        filename: 'logo.png',
        content: logoBuffer,
        cid: 'xoxosurveys-logo', // Same as in the HTML img src
      }]
    } catch {
      console.warn('[Email] Could not attach logo.png - emails will be sent without logo image')
    }

    const result = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text,
      attachments,
    })

    console.log(`[Email] Sent successfully to ${to}, messageId: ${result.messageId}`)
    return true
  } catch (error: any) {
    console.error(`[Email] Failed to send to ${to}:`, error?.message || error)
    console.error(`[Email] Full error:`, error?.code, error?.command, error?.response)
    return false
  }
}

// ==================== Public API ====================

export async function sendVerificationEmail(
  email: string,
  verificationUrl: string
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Verify Your Email - XoXoSurveys',
    html: getVerificationEmailHtml(verificationUrl, email),
    text: getVerificationEmailText(verificationUrl, email),
  })
}

export async function sendWelcomeEmail(
  email: string,
  name: string | null
): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Welcome to XoXoSurveys! Start Earning Now',
    html: getWelcomeEmailHtml(name, email),
    text: `Welcome to XoXoSurveys, ${name || email.split('@')[0]}! Start earning money by completing surveys. Don't forget to verify your email to unlock cashout.`,
  })
}

export async function sendPasswordResetEmail(
  email: string,
  resetUrl: string
): Promise<boolean> {
  return sendEmail({
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
<body style="margin:0; padding:0; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif; background-color:#f4f5f7;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    <div style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      ${getEmailHeader('XoXoSurveys', 'Password Reset')}
      <div style="padding:32px 40px;">
        <h2 style="color:#36383A; font-size:20px; margin:0 0 16px; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">Reset your password</h2>
        <p style="color:#4B4B4B; font-size:15px; line-height:1.6; margin:0 0 16px;">Hi there,</p>
        <p style="color:#4B4B4B; font-size:15px; line-height:1.6; margin:0 0 16px;">We received a request to reset your password. Click the button below to choose a new password:</p>
        <div style="text-align:center; margin:8px 0 24px;">
          <a href="${resetUrl}" style="display:inline-block; background:linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%); color:#ffffff !important; text-decoration:none; padding:14px 32px; border-radius:8px; font-size:16px; font-weight:600; text-align:center; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">Reset My Password</a>
        </div>
        <p style="color:#4B4B4B; font-size:15px; line-height:1.6; margin:0 0 8px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <div style="background:#f9fafb; border:1px solid #e2eaf1; border-radius:8px; padding:12px 16px; word-break:break-all; font-size:13px; color:#4B4B4B; font-family:monospace;">${resetUrl}</div>
        <p style="margin-top:16px; color:#999999; font-size:13px; line-height:1.5;">This reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.</p>
        <div style="background:#FFFBEB; border:1px solid #F59E0B30; border-radius:8px; padding:12px 16px; margin-top:16px;">
          <p style="margin:0; color:#92400E; font-size:13px; font-weight:500;">For security, this link can only be used once. After resetting, you will be logged out of all devices.</p>
        </div>
      </div>
      ${getEmailFooter(`This email was sent to <strong>${email}</strong> because a password reset was requested on XoXoSurveys.`)}
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

If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.

For security, this link can only be used once. After resetting, you will be logged out of all devices.

- XoXoSurveys Team
    `.trim(),
  })
}

export async function sendCashoutApprovedEmail(
  email: string,
  amount: number,
  method: string
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xoxosurveys.com'
  return sendEmail({
    to: email,
    subject: `Cashout Approved - $${amount.toFixed(2)} - XoXoSurveys`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; font-family:'Segoe UI',sans-serif; background:#f4f5f7;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    <div style="background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      ${getEmailHeader('Cashout Approved!')}
      <div style="padding:24px 32px;">
        <p style="color:#36383A; font-size:15px; line-height:1.6; margin:0 0 16px;">Great news! Your cashout request has been approved.</p>
        <div style="background:#f9fafb; border:1px solid #e2eaf1; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0 0 8px; color:#999; font-size:13px;">Amount</p>
          <p style="margin:0; color:#0FBCC0; font-size:24px; font-weight:bold;">$${amount.toFixed(2)}</p>
          <p style="margin:8px 0 0; color:#4B4B4B; font-size:14px;">via ${method}</p>
        </div>
        <div style="text-align:center; margin-top:16px;">
          <a href="${baseUrl}" style="display:inline-block; background:linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%); color:#ffffff !important; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:15px; font-weight:600;">View Dashboard</a>
        </div>
        <p style="color:#999; font-size:13px; margin-top:16px;">Your payment will be processed within 24-48 hours.</p>
      </div>
      ${getEmailFooter(`This email was sent to <strong>${email}</strong>.`)}
    </div>
  </div>
</body>
</html>`,
    text: `Cashout Approved! Your cashout of $${amount.toFixed(2)} via ${method} has been approved and will be processed within 24-48 hours.`,
  })
}

export async function sendCashoutRejectedEmail(
  email: string,
  amount: number,
  method: string,
  reason?: string
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://xoxosurveys.com'
  return sendEmail({
    to: email,
    subject: `Cashout Update - XoXoSurveys`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; font-family:'Segoe UI',sans-serif; background:#f4f5f7;">
  <div style="max-width:600px; margin:0 auto; padding:20px;">
    <div style="background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08);">
      <div style="background:linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%); padding:24px 32px; text-align:center;">
        <img src="cid:xoxosurveys-logo" alt="XoXoSurveys" style="width:40px; height:40px; border-radius:50%; margin-bottom:8px;" />
        <h1 style="color:#fff; margin:0; font-size:20px;">Cashout Update</h1>
      </div>
      <div style="padding:24px 32px;">
        <p style="color:#36383A; font-size:15px; line-height:1.6; margin:0 0 16px;">Your cashout request could not be processed.</p>
        <div style="background:#f9fafb; border:1px solid #e2eaf1; border-radius:8px; padding:16px; margin:16px 0;">
          <p style="margin:0 0 8px; color:#999; font-size:13px;">Amount</p>
          <p style="margin:0; color:#36383A; font-size:24px; font-weight:bold;">$${amount.toFixed(2)}</p>
          <p style="margin:8px 0 0; color:#4B4B4B; font-size:14px;">via ${method}</p>
          ${reason ? `<p style="margin:8px 0 0; color:#EF4444; font-size:13px;">Reason: ${reason}</p>` : ''}
        </div>
        <div style="text-align:center; margin-top:16px;">
          <a href="${baseUrl}" style="display:inline-block; background:linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%); color:#ffffff !important; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:15px; font-weight:600;">Contact Support</a>
        </div>
        <p style="color:#999; font-size:13px; margin-top:16px;">If you believe this is an error, please contact our support team.</p>
      </div>
      ${getEmailFooter(`This email was sent to <strong>${email}</strong>.`)}
    </div>
  </div>
</body>
</html>`,
    text: `Cashout Update: Your cashout of $${amount.toFixed(2)} via ${method} could not be processed.${reason ? ` Reason: ${reason}` : ''} Please contact support if you believe this is an error.`,
  })
}
