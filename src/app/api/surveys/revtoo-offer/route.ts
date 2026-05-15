import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEFAULT_REVTOO_API_KEY = '8wq03m1vsqq5xvfq9ejxaxz2v7vfzy'
const DEFAULT_REVTOO_API_URL = 'https://revtoo.com/api/offers/'
const DEFAULT_TARGET_OFFER_ID = 56443

/**
 * Fetch the specific Revtoo survey offer and generate redirect URL for the user
 * Checks featuredOfferEnabled setting + reads API key from wall config or defaults
 * Returns customization overrides from admin settings
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Fetch all Featured Offer settings at once
    const settingKeys = [
      'featuredOfferEnabled',
      'featuredOfferTitle',
      'featuredOfferDescription',
      'featuredOfferBadge',
      'featuredOfferId',
      'featuredOfferTime',
      'featuredOfferPayout',
    ]
    const settingsRows = await db.adminSettings.findMany({
      where: { key: { in: settingKeys } },
    })
    const settingsMap: Record<string, string> = {}
    settingsRows.forEach((s) => { settingsMap[s.key] = s.value })

    // Check if Featured Offer is enabled
    const featuredEnabled = settingsMap.featuredOfferEnabled !== 'false' // default true

    if (!featuredEnabled) {
      return NextResponse.json({ error: 'Featured offer is currently disabled', disabled: true }, { status: 403 })
    }

    // Get custom offer ID or default
    const targetOfferId = settingsMap.featuredOfferId
      ? parseInt(settingsMap.featuredOfferId, 10)
      : DEFAULT_TARGET_OFFER_ID

    // Try to get RevToo wall config for API key/URL (optional, falls back to defaults)
    const revtooWall = await db.surveyWall.findFirst({
      where: { provider: 'revtoo' },
    })

    // Use API key from wall config or fallback to default
    const apiKey = revtooWall?.apiKey || DEFAULT_REVTOO_API_KEY
    const apiUrl = revtooWall?.endpointUrl
      ? revtooWall.endpointUrl.replace(/\/offer\/\d+$/, '/api/offers/')
      : DEFAULT_REVTOO_API_URL

    // Fetch offers from Revtoo API
    const response = await fetch(`${apiUrl}?api_key=${apiKey}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      console.error('[Revtoo Offer] API error:', response.status)
      return NextResponse.json({ error: 'Failed to fetch from Revtoo API' }, { status: 502 })
    }

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json({ error: 'Revtoo API returned error' }, { status: 502 })
    }

    // Find the specific offer
    const offer = data.offers?.find((o: { id: number }) => o.id === targetOfferId)

    if (!offer) {
      return NextResponse.json({ error: 'Target offer not found' }, { status: 404 })
    }

    // Generate the redirect URL with user's ID
    const redirectUrl = offer.url.replace('[USER_ID]', userId)

    // Build response with customization overrides
    return NextResponse.json({
      offer: {
        id: offer.id,
        title: settingsMap.featuredOfferTitle || offer.title,
        description: settingsMap.featuredOfferDescription || offer.description,
        image: offer.image,
        category: offer.category,
        countries: offer.countries,
        os: offer.os,
        payout: offer.payout,
        reward: offer.reward,
        hasEvents: offer.hasEvents,
        featured: offer.featured,
        score: offer.score,
      },
      // Customization fields for the frontend
      customization: {
        badge: settingsMap.featuredOfferBadge || 'Featured',
        time: settingsMap.featuredOfferTime || '5-20 Min',
        payout: settingsMap.featuredOfferPayout || '',
      },
      redirectUrl,
      postbackUrl: `${new URL(request.url).origin}/api/surveys/revtoo-postback`,
    })
  } catch (error) {
    console.error('[Revtoo Offer] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
