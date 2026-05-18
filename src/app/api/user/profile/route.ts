import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Update user profile fields: firstname, lastname, language, newsletter
 * Requires: userId (cuid)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, firstname, lastname, language, newsletter } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Find user first
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, isBanned: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: 'Account is suspended' },
        { status: 403 }
      )
    }

    // Build update data - only include fields that were provided
    const updateData: Record<string, any> = {}
    if (firstname !== undefined) updateData.firstname = firstname
    if (lastname !== undefined) updateData.lastname = lastname
    if (language !== undefined) updateData.language = language
    if (newsletter !== undefined) updateData.newsletter = newsletter

    // Also update the combined "name" field if firstname or lastname changed
    if (firstname !== undefined || lastname !== undefined) {
      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: { firstname: true, lastname: true },
      })
      const fn = firstname !== undefined ? firstname : (currentUser?.firstname || '')
      const ln = lastname !== undefined ? lastname : (currentUser?.lastname || '')
      updateData.name = [fn, ln].filter(Boolean).join(' ')
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        firstname: true,
        lastname: true,
        name: true,
        language: true,
        newsletter: true,
      },
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('[Update Profile] Error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * Delete user account and all associated data
 * Requires: userId (cuid)
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent admin from deleting their own account
    if (user.role === 'admin') {
      return NextResponse.json(
        { error: 'Admin accounts cannot be deleted' },
        { status: 403 }
      )
    }

    // Delete user (cascading deletes will handle sessions, survey attempts, etc.)
    await db.user.delete({
      where: { id: userId },
    })

    console.log(`[Delete Account] User ${userId} deleted their account`)

    return NextResponse.json({ success: true, message: 'Account deleted successfully' })
  } catch (error: any) {
    console.error('[Delete Account] Error:', error)
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again.' },
      { status: 500 }
    )
  }
}
