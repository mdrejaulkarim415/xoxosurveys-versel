import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEFAULT_REVTOO_API_KEY = '8wq03m1vsqq5xvfq9ejxaxz2v7vfzy'
const DEFAULT_REVTOO_API_URL = 'https://revtoo.com/api/offers/'
const DEFAULT_TARGET_OFFER_ID = 56443

/**
 * Server-side redirect proxy for RevToo Featured Offer.
 * This endpoint constructs the actual survey URL server-side,
 * so the API key is NEVER exposed to the frontend/user.
 * The frontend only navigates to this proxy URL, and the server
 * does a 302 redirect to the actual RevToo survey URL.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    // Fetch all Featured Offer settings
    const settingKeys = [
      'featuredOfferEnabled',
      'featuredOfferId',
      'featuredOfferApiKey',
      'featuredOfferApiUrl',
    ]
    const settingsRows = await db.adminSettings.findMany({
      where: { key: { in: settingKeys } },
    })
    const settingsMap: Record<string, string> = {}
    settingsRows.forEach((s) => { settingsMap[s.key] = s.value })

    // Check if Featured Offer is enabled
    const featuredEnabled = settingsMap.featuredOfferEnabled !== 'false'
    if (!featuredEnabled) {
      return NextResponse.json({ error: 'Featured offer is disabled' }, { status: 403 })
    }

    // Get custom offer ID or default
    const targetOfferId = settingsMap.featuredOfferId
      ? parseInt(settingsMap.featuredOfferId, 10)
      : DEFAULT_TARGET_OFFER_ID

    // API config: settings > SurveyWall > defaults
    let apiKey = settingsMap.featuredOfferApiKey || ''
    let apiUrl = settingsMap.featuredOfferApiUrl || ''

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

    // Fetch offers from RevToo API (server-side only)
    const response = await fetch(`${apiUrl}?api_key=${apiKey}`, {
      next: { revalidate: 300 },
    })

    if (!response.ok) {
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

    // Generate the redirect URL with user's ID and do 302 redirect
    const redirectUrl = offer.url.replace('[USER_ID]', userId)

    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('[Revtoo Redirect] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
