import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, message, userId } = body

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    // Message length check
    if (message.trim().length < 10) {
      return NextResponse.json({ error: 'Message must be at least 10 characters' }, { status: 400 })
    }
    if (message.trim().length > 5000) {
      return NextResponse.json({ error: 'Message must be less than 5000 characters' }, { status: 400 })
    }

    // Rate limiting: check if same email sent more than 3 messages in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const recentMessages = await db.supportMessage.count({
      where: {
        email: email.trim().toLowerCase(),
        createdAt: { gte: oneHourAgo },
      },
    })

    if (recentMessages >= 3) {
      return NextResponse.json(
        { error: 'Too many messages. Please wait before sending another.' },
        { status: 429 }
      )
    }

    // Create the support message
    const supportMessage = await db.supportMessage.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        message: message.trim(),
        userId: userId || null,
        status: 'open',
        priority: 'normal',
      },
    })

    console.log(`[Support] New message from ${email}: "${message.substring(0, 50)}..." (ID: ${supportMessage.id})`)

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully!',
      id: supportMessage.id,
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Support] Error creating message:', error)
    return NextResponse.json(
      { error: 'Failed to send message. Please try again.' },
      { status: 500 }
    )
  }
}
