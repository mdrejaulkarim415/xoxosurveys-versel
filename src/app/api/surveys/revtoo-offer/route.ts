import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEFAULT_REVTOO_API_KEY = '8wq03m1vsqq5xvfq9ejxaxz2v7vfzy'
const DEFAULT_REVTOO_API_URL = 'https://revtoo.com/api/offers/'
const DEFAULT_TARGET_OFFER_ID = 56443

/**
 * Remove API-key-like strings from text.
 * Strips long alphanumeric strings (20+ chars with no spaces) that look like API keys/secrets.
 */
function sanitizeApiText(text: string | null | undefined): string {
  if (!text) return ''
  // Remove strings that look like API keys: 20+ consecutive alphanumeric chars (no spaces/words)
  const cleaned = text.replace(/\b[a-z0-9]{20,}\b/gi, '').trim()
  // Clean up leftover artifacts (double spaces, dangling punctuation)
  return cleaned.replace(/\s{2,}/g, ' ').replace(/^\s*[,\-–—]\s*/, '').replace(/\s*[,\-–—]\s*$/, '').trim()
}

/**
 * Fetch the specific Revtoo survey offer for the Featured Offer.
 * Returns offer data + customization + a SAFE redirect proxy URL.
 * The API key is NEVER sent to the frontend - the redirect is handled
 * server-side via /api/surveys/revtoo-redirect
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
      'featuredOfferApiKey',
      'featuredOfferApiUrl',
      'featuredOfferApiSecret',
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

    // API config: settings > SurveyWall > defaults (priority order)
    let apiKey = settingsMap.featuredOfferApiKey || ''
    let apiUrl = settingsMap.featuredOfferApiUrl || ''

    // If no custom API settings, try SurveyWall config
    if (!apiKey || !apiUrl) {
      const revtooWall = await db.surveyWall.findFirst({
        where: { provider: 'revtoo' },
      })
      if (!apiKey) apiKey = revtooWall?.apiKey || DEFAULT_REVTOO_API_KEY
      if (!apiUrl) {
        apiUrl = revtooWall?.endpointUrl
          ? revtooWall.endpointUrl.replace(/\/offer\/\d+$/, '/api/offers/')
          : DEFAULT_REVTOO_API_URL
      }
    }

    // Fetch offers from RevToo API
    const response = await fetch(`${apiUrl}?api_key=${apiKey}`, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    })

    if (!response.ok) {
      console.error('[Revtoo Offer] API error:', response.status)
      return NextResponse.json({ error: 'Failed to fetch from RevToo API' }, { status: 502 })
    }

    const data = await response.json()

    if (!data.success) {
      return NextResponse.json({ error: 'RevToo API returned error' }, { status: 502 })
    }

    // Find the specific offer
    const offer = data.offers?.find((o: { id: number }) => o.id === targetOfferId)

    if (!offer) {
      return NextResponse.json({ error: 'Target offer not found' }, { status: 404 })
    }

    // IMPORTANT: Return a SAFE proxy redirect URL instead of the raw URL
    // This ensures the API key is never exposed to the frontend/user.
    // The actual redirect with API key is handled server-side by /api/surveys/revtoo-redirect
    const origin = new URL(request.url).origin
    const safeRedirectUrl = `${origin}/api/surveys/revtoo-redirect?user_id=${encodeURIComponent(userId)}`

    // Sanitize API text to remove any API key/secret strings
    const safeTitle = settingsMap.featuredOfferTitle || sanitizeApiText(offer.title) || 'Featured Survey'
    const safeDescription = settingsMap.featuredOfferDescription || sanitizeApiText(offer.description) || 'Complete this survey to earn rewards'

    // Build response with customization overrides
    return NextResponse.json({
      offer: {
        id: offer.id,
        title: safeTitle,
        description: safeDescription,
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
      // Safe proxy URL - no API key exposed
      redirectUrl: safeRedirectUrl,
    })
  } catch (error) {
    console.error('[Revtoo Offer] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
