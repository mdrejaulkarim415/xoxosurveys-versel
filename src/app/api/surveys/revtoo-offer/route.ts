import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEFAULT_REVTOO_API_KEY = '8wq03m1vsqq5xvfq9ejxaxz2v7vfzy'
const DEFAULT_REVTOO_API_URL = 'https://revtoo.com/api/offers/'
const DEFAULT_TARGET_OFFER_ID = 56443

/**
 * Fetch the specific Revtoo survey offer and generate redirect URL for the user
 * Checks featuredOfferEnabled setting + reads API key from wall config or defaults
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Check if Featured Offer is enabled in admin settings
    const featuredSetting = await db.adminSettings.findUnique({
      where: { key: 'featuredOfferEnabled' },
    })
    const featuredEnabled = featuredSetting ? featuredSetting.value === 'true' : true // default true

    if (!featuredEnabled) {
      return NextResponse.json({ error: 'Featured offer is currently disabled', disabled: true }, { status: 403 })
    }

    // Try to get RevToo wall config for API key/URL (optional, falls back to defaults)
    const revtooWall = await db.surveyWall.findFirst({
      where: { provider: 'revtoo' },
    })

    // Use API key from wall config or fallback to default
    const apiKey = revtooWall?.apiKey || DEFAULT_REVTOO_API_KEY
    const apiUrl = revtooWall?.endpointUrl
      ? revtooWall.endpointUrl.replace(/\/offer\/\d+$/, '/api/offers/')
      : DEFAULT_REVTOO_API_URL

    // Parse config for target offer ID
    let targetOfferId = DEFAULT_TARGET_OFFER_ID
    try {
      const config = JSON.parse(revtooWall?.config || '{}')
      if (config.targetOfferId) targetOfferId = config.targetOfferId
    } catch {}

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

    return NextResponse.json({
      offer: {
        id: offer.id,
        title: offer.title,
        description: offer.description,
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
      redirectUrl,
      postbackUrl: `${new URL(request.url).origin}/api/surveys/revtoo-postback`,
    })
  } catch (error) {
    console.error('[Revtoo Offer] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
