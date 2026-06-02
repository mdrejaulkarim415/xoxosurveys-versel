import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Server-side redirect proxy for ALL survey providers (CPX, BitLabs, Inbrain, Custom).
 * This endpoint constructs the actual survey URL server-side,
 * so the API key is NEVER exposed to the frontend/user.
 *
 * Query params:
 *   wallId      - ID of the SurveyWall (provider)
 *   user_id     - The user's numeric ID
 *   external_id - The external survey/offer ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const wallId = searchParams.get('wallId')
    const userId = searchParams.get('user_id')
    const externalId = searchParams.get('external_id')

    if (!wallId || !userId) {
      return NextResponse.json({ error: 'wallId and user_id are required' }, { status: 400 })
    }

    // Fetch the wall config (server-side only — API key never goes to frontend)
    const wall = await db.surveyWall.findUnique({
      where: { id: wallId },
      select: {
        id: true,
        name: true,
        provider: true,
        apiKey: true,
        apiSecret: true,
        endpointUrl: true,
        isActive: true,
      },
    })

    if (!wall || !wall.isActive) {
      return NextResponse.json({ error: 'Survey provider not found or inactive' }, { status: 404 })
    }

    let redirectUrl = ''

    switch (wall.provider) {
      case 'revtoo': {
        // For RevToo, use the revtoo-redirect logic
        const DEFAULT_API_KEY = '8wq03m1vsqq5xvfq9ejxaxz2v7vfzy'
        const DEFAULT_API_URL = 'https://revtoo.com/api/offers/'

        let apiKey = ''
        let apiUrl = ''

        // Check admin settings
        try {
          const settingKeys = ['featuredOfferApiKey', 'featuredOfferApiUrl']
          const settingsRows = await db.adminSettings.findMany({
            where: { key: { in: settingKeys } },
          })
          const settingsMap: Record<string, string> = {}
          settingsRows.forEach((s) => { settingsMap[s.key] = s.value })
          apiKey = settingsMap.featuredOfferApiKey || ''
          apiUrl = settingsMap.featuredOfferApiUrl || ''
        } catch { /* ignore */ }

        if (!apiKey) apiKey = wall.apiKey || DEFAULT_API_KEY
        if (!apiUrl) {
          apiUrl = wall.endpointUrl
            ? wall.endpointUrl.replace(/\/offer\/\d+$/, '/api/offers/')
            : DEFAULT_API_URL
        }

        // If externalId is a numeric RevToo offer ID, build the RevToo URL
        if (externalId) {
          // RevToo offer URL format: https://revtoo.com/offer/{offerId}?user_id={userId}
          // But we need to get the actual redirect URL from the API
          const offerId = parseInt(externalId)
          if (!isNaN(offerId)) {
            const response = await fetch(`${apiUrl}?api_key=${apiKey}`, {
              next: { revalidate: 300 },
            })
            if (response.ok) {
              const data = await response.json()
              const offer = data.offers?.find((o: { id: number }) => o.id === offerId)
              if (offer?.url) {
                redirectUrl = offer.url.replace('[USER_ID]', userId)
              }
            }
          }
        }

        // Fallback: direct RevToo offer link
        if (!redirectUrl) {
          redirectUrl = `https://revtoo.com/offer/56443?user_id=${userId}`
        }
        break
      }

      case 'cpx-research': {
        // CPX Research: redirect to their offer wall with user ID
        // URL format: https://offers.cpx-research.com/index.php?app_id={app_id}&ext_user_id={user_id}
        if (wall.endpointUrl) {
          redirectUrl = wall.endpointUrl.replace('{user_id}', userId)
          // If endpointUrl doesn't have {user_id} placeholder, append ext_user_id
          if (!wall.endpointUrl.includes('{user_id}')) {
            const sep = wall.endpointUrl.includes('?') ? '&' : '?'
            redirectUrl = `${wall.endpointUrl}${sep}ext_user_id=${userId}`
          }
        }
        break
      }

      case 'bitlabs': {
        // BitLabs: redirect to their survey wall with user ID
        if (wall.endpointUrl) {
          const sep = wall.endpointUrl.includes('?') ? '&' : '?'
          redirectUrl = `${wall.endpointUrl}${sep}api_key=${wall.apiKey || ''}&uid=${userId}`
        }
        break
      }

      case 'inbrain': {
        // Inbrain: redirect to their survey wall with user ID
        if (wall.endpointUrl) {
          const sep = wall.endpointUrl.includes('?') ? '&' : '?'
          redirectUrl = `${wall.endpointUrl}${sep}appId=${wall.apiKey || ''}&userId=${userId}`
        }
        break
      }

      case 'custom':
      default: {
        // Custom: just append user_id
        if (wall.endpointUrl) {
          const sep = wall.endpointUrl.includes('?') ? '&' : '?'
          redirectUrl = `${wall.endpointUrl}${sep}user_id=${userId}`
        }
        break
      }
    }

    if (!redirectUrl) {
      return NextResponse.json({ error: 'No redirect URL available for this provider' }, { status: 404 })
    }

    // 302 redirect to the actual provider URL (API key is in the URL but only on server-side)
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('[Provider Redirect] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
