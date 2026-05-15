import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const fraudMin = searchParams.get('fraudMin')
    const fraudMax = searchParams.get('fraudMax')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
      ]
    }
    if (role && role !== 'all') {
      where.role = role
    }
    if (status === 'active') {
      where.isActive = true
      where.isBanned = false
    } else if (status === 'banned') {
      where.isBanned = true
    } else if (status === 'flagged') {
      where.isFlagged = true
    }
    if (fraudMin !== null) {
      where.fraudScore = { gte: parseFloat(fraudMin) }
    }
    if (fraudMax !== null) {
      where.fraudScore = { ...(where.fraudScore as object || {}), lte: parseFloat(fraudMax) }
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          firstname: true,
          lastname: true,
          role: true,
          balance: true,
          totalEarned: true,
          surveysCompleted: true,
          fraudScore: true,
          isFlagged: true,
          isBanned: true,
          emailVerified: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          lastLoginIp: true,
          loginCount: true,
        },
      }),
      db.user.count({ where }),
    ])

    return NextResponse.json({ users, total, page, limit })
  } catch (error) {
    console.error('Users list error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name, role, passwordHash } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = await db.user.create({
      data: {
        email,
        name: name || null,
        passwordHash: passwordHash || null,
        role: role || 'user',
        inviteCode: 'XOXO-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
