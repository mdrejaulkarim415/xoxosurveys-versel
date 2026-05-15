import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Fetch individual survey offers from all active provider APIs.
 * When admin adds a provider (e.g. BitLabs, CPX Research), their surveys
 * automatically appear in the "Individual Surveys" section.
 * Each wall's config can have showIndividualOffers=true/false.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await db.user.findUnique({ where: { userId: parseInt(userId) } })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isBanned) {
      return NextResponse.json({ error: 'User is banned' }, { status: 403 })
    }

    // Get all active walls that have showIndividualOffers enabled
    const walls = await db.surveyWall.findMany({
      where: {
        isActive: true,
        minFraudScore: { gte: user.fraudScore },
      },
      orderBy: { priority: 'desc' },
    })

    const allOffers: Array<{
      id: string
      title: string
      description: string | null
      timeMinutes: number
      reward: number
      rating: number
      reviews: number
      available: number
      category: string | null
      country: string | null
      language: string | null
      wall: { id: string; name: string; provider: string }
      redirectUrl: string
    }> = []

    const origin = new URL(request.url).origin

    // Fetch offers from each provider
    await Promise.allSettled(
      walls.map(async (wall) => {
        // Check if this wall should show individual offers (default: true for non-revtoo)
        try {
          const config = JSON.parse(wall.config || '{}')
          if (config.showIndividualOffers === false) return
        } catch {
          // If config parse fails, show offers by default
        }

        try {
          switch (wall.provider) {
            case 'revtoo': {
              // RevToo: fetch offers from their API
              const apiKey = wall.apiKey || '8wq03m1vsqq5xvfq9ejxaxz2v7vfzy'
              const apiUrl = wall.endpointUrl
                ? wall.endpointUrl.replace(/\/offer\/\d+$/, '/api/offers/')
                : 'https://revtoo.com/api/offers/'

              const response = await fetch(`${apiUrl}?api_key=${apiKey}`, {
                next: { revalidate: 300 },
              })

              if (response.ok) {
                const data = await response.json()
                if (data.success && data.offers) {
                  const offers = data.offers.slice(0, 20) // Limit to 20 offers
                  for (const offer of offers) {
                    // Skip the featured offer (handled separately)
                    const redirectUrl = offer.url ? offer.url.replace('[USER_ID]', userId) : ''
                    allOffers.push({
                      id: `revtoo-${offer.id}`,
                      title: offer.title || 'RevToo Survey',
                      description: offer.description || null,
                      timeMinutes: 10,
                      reward: parseFloat(offer.payout || '0') * 0.7,
                      rating: 4.0,
                      reviews: offer.score || 0,
                      available: 1,
                      category: offer.category || null,
                      country: offer.countries?.[0] || null,
                      language: null,
                      wall: { id: wall.id, name: wall.name, provider: wall.provider },
                      redirectUrl,
                    })
                  }
                }
              }
              break
            }

            case 'cpx-research': {
              // CPX Research: construct entry URL as the redirect
              if (wall.endpointUrl && wall.apiKey) {
                const redirectUrl = `${wall.endpointUrl}?api_key=${wall.apiKey}&user_id=${userId}`
                allOffers.push({
                  id: `cpx-${wall.id}`,
                  title: `${wall.name} Surveys`,
                  description: wall.description || 'Complete surveys from CPX Research to earn rewards',
                  timeMinutes: 15,
                  reward: wall.maxPayout * 0.7,
                  rating: 4.2,
                  reviews: 150,
                  available: 5,
                  category: 'General',
                  country: null,
                  language: null,
                  wall: { id: wall.id, name: wall.name, provider: wall.provider },
                  redirectUrl,
                })
              }
              break
            }

            case 'bitlabs': {
              // BitLabs: construct entry URL
              if (wall.endpointUrl && wall.apiKey) {
                const redirectUrl = `${wall.endpointUrl}?api_key=${wall.apiKey}&uid=${userId}`
                allOffers.push({
                  id: `bitlabs-${wall.id}`,
                  title: `${wall.name} Surveys`,
                  description: wall.description || 'Complete surveys from BitLabs to earn rewards',
                  timeMinutes: 12,
                  reward: wall.maxPayout * 0.7,
                  rating: 4.1,
                  reviews: 120,
                  available: 4,
                  category: 'General',
                  country: null,
                  language: null,
                  wall: { id: wall.id, name: wall.name, provider: wall.provider },
                  redirectUrl,
                })
              }
              break
            }

            case 'inbrain': {
              // Inbrain: construct entry URL
              if (wall.endpointUrl && wall.apiKey) {
                const redirectUrl = `${wall.endpointUrl}?appId=${wall.apiKey}&userId=${userId}`
                allOffers.push({
                  id: `inbrain-${wall.id}`,
                  title: `${wall.name} Surveys`,
                  description: wall.description || 'Complete surveys from Inbrain to earn rewards',
                  timeMinutes: 10,
                  reward: wall.maxPayout * 0.7,
                  rating: 3.9,
                  reviews: 80,
                  available: 3,
                  category: 'General',
                  country: null,
                  language: null,
                  wall: { id: wall.id, name: wall.name, provider: wall.provider },
                  redirectUrl,
                })
              }
              break
            }

            case 'custom':
            default: {
              // Custom: just link to endpoint
              if (wall.endpointUrl) {
                const sep = wall.endpointUrl.includes('?') ? '&' : '?'
                const redirectUrl = `${wall.endpointUrl}${sep}user_id=${userId}`
                allOffers.push({
                  id: `custom-${wall.id}`,
                  title: `${wall.name} Surveys`,
                  description: wall.description || 'Complete surveys to earn rewards',
                  timeMinutes: 10,
                  reward: wall.maxPayout * 0.7,
                  rating: 4.0,
                  reviews: 50,
                  available: 2,
                  category: 'General',
                  country: null,
                  language: null,
                  wall: { id: wall.id, name: wall.name, provider: wall.provider },
                  redirectUrl,
                })
              }
              break
            }
          }
        } catch (err) {
          console.error(`[Provider Offers] Error fetching from ${wall.provider}:`, err)
        }
      })
    )

    // Sort by reward descending
    allOffers.sort((a, b) => b.reward - a.reward)

    return NextResponse.json(allOffers)
  } catch (error) {
    console.error('[Provider Offers] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
