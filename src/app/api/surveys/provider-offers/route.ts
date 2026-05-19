import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Force dynamic — no caching so admin toggle changes are reflected immediately
export const dynamic = 'force-dynamic'

/**
 * Fetch offers from ALL active provider APIs and return them as
 * normalized Individual Survey items.
 *
 * This is the core of the auto-sync system:
 *   - When a Survey Provider (RevToo, CPX, BitLabs, Inbrain, Custom)
 *     is added and active, its offers automatically appear in
 *     Individual Surveys.
 *   - No manual sync needed — offers are fetched in real-time with
 *     short caching (5 min).
 *   - API keys are NEVER sent to the frontend; redirect URLs go
 *     through a server-side proxy.
 */

// ─── Helpers ──────────────────────────────────────────────────────────

/** Remove API-key-like strings (20+ consecutive alphanumeric chars) from text */
function sanitizeApiText(text: string | null | undefined): string {
  if (!text) return ''
  const cleaned = text.replace(/\b[a-z0-9]{20,}\b/gi, '').trim()
  return cleaned.replace(/\s{2,}/g, ' ').replace(/^\s*[,\-–—]\s*/, '').replace(/\s*[,\-–—]\s*$/, '').trim()
}

/** Get user revenue percent from wall config, falling back to global setting, then 70% */
function getUserRevenuePercent(wallConfig: string, globalDefault?: number): number {
  try {
    const parsed = JSON.parse(wallConfig || '{}')
    if (parsed.userRevenuePercent && Number(parsed.userRevenuePercent) > 0) {
      return Number(parsed.userRevenuePercent)
    }
  } catch { /* ignore */ }
  return globalDefault || 70
}

interface NormalizedOffer {
  id: string            // composite: provider-externalId
  externalId: string
  title: string
  description: string
  timeMinutes: number
  reward: number
  rating: number
  category: string
  country: string
  provider: string
  providerName: string
  wallId: string
  redirectUrl: string   // always a SAFE proxy URL — never contains API key
}

// ─── Provider Fetchers ────────────────────────────────────────────────

/**
 * Fetch offers from RevToo API.
 * Uses the same pattern as revtoo-offer/route.ts but fetches ALL offers.
 */
async function fetchRevTooOffers(
  wall: { id: string; name: string; apiKey: string | null; endpointUrl: string | null; config?: string },
  userId: string,
  origin: string,
  globalRevenuePercent?: number,
): Promise<NormalizedOffer[]> {
  const DEFAULT_API_KEY = '8wq03m1vsqq5xvfq9ejxaxz2v7vfzy'
  const DEFAULT_API_URL = 'https://revtoo.com/api/offers/'

  // Check admin settings for custom API config
  let apiKey = ''
  let apiUrl = ''
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

  // Validate API key - must look like a real API key (not a password like "admin123")
  if (apiKey && (apiKey.trim().length < 20 || !/^[a-zA-Z0-9]+$/.test(apiKey.trim()))) {
    apiKey = DEFAULT_API_KEY
  }

  // Validate URL
  try { new URL(apiUrl) } catch { apiUrl = DEFAULT_API_URL; apiKey = DEFAULT_API_KEY }

  try {
    const response = await fetch(`${apiUrl}?api_key=${apiKey}`, {
      next: { revalidate: 300 }, // cache 5 min
    })
    if (!response.ok) return []

    const data = await response.json()
    if (!data.success || !Array.isArray(data.offers)) return []

    return data.offers
      .filter((offer: { status?: string }) => !offer.status || offer.status === 'active' || offer.status === '1')
      .map((offer: {
        id: number | string
        name?: string
        title?: string
        description?: string
        payout?: string | number
        reward?: string | number
        category?: string
        countries?: string[]
        time?: string | number
        duration?: string | number
        loa?: string | number
      }) => {
        const payoutValue = parseFloat(String(offer.payout || offer.reward || '0')) || 0
        const userPercent = getUserRevenuePercent(wall.config || '{}', globalRevenuePercent) / 100
        const rewardValue = payoutValue * userPercent
        const timeMin = parseInt(String(offer.time || offer.duration || offer.loa || '10')) || 10

        return {
          id: `revtoo-${offer.id}`,
          externalId: String(offer.id),
          title: sanitizeApiText(offer.name || offer.title) || 'RevToo Survey',
          description: sanitizeApiText(offer.description) || 'Complete this survey to earn rewards',
          timeMinutes: timeMin,
          reward: Math.round(rewardValue * 100) / 100,
          rating: 4.5,
          category: offer.category || 'General',
          country: Array.isArray(offer.countries) ? offer.countries.join(', ') : 'All',
          provider: 'revtoo',
          providerName: wall.name,
          wallId: wall.id,
          redirectUrl: `${origin}/api/surveys/revtoo-redirect?user_id=${encodeURIComponent(userId)}`,
        }
      })
  } catch (error) {
    console.error('[Provider Offers] RevToo fetch error:', error)
    return []
  }
}

/**
 * Fetch offers from CPX Research API.
 * CPX Research API: https://api.cpx-research.com/v1/surveys?api_key=XXX&user_id=XXX
 */
async function fetchCpxOffers(
  wall: { id: string; name: string; apiKey: string | null; endpointUrl: string | null; config?: string },
  userId: string,
  origin: string,
  globalRevenuePercent?: number,
): Promise<NormalizedOffer[]> {
  if (!wall.apiKey || !wall.endpointUrl) return []

  try {
    const url = `${wall.endpointUrl}${wall.endpointUrl.includes('?') ? '&' : '?'}api_key=${wall.apiKey}&user_id=${userId}`
    const response = await fetch(url, {
      next: { revalidate: 300 },
    })
    if (!response.ok) return []

    const data = await response.json()
    const surveys = data.surveys || data.data || data.offers || []
    if (!Array.isArray(surveys)) return []

    return surveys.map((survey: {
      id?: number | string
      survey_id?: number | string
      name?: string
      title?: string
      description?: string
      payout?: string | number
      cpi?: string | number
      value?: string | number
      category?: string
      country?: string
      country_code?: string
      time?: string | number
      duration?: string | number
      loa?: string | number
      rating?: number
    }) => {
      const payoutValue = parseFloat(String(survey.payout || survey.cpi || survey.value || '0')) || 0
      const userPercent = getUserRevenuePercent(wall.config || '{}', globalRevenuePercent) / 100
      const rewardValue = payoutValue * userPercent
      const timeMin = parseInt(String(survey.time || survey.duration || survey.loa || '10')) || 10
      const externalId = String(survey.id || survey.survey_id || Math.random().toString(36).slice(2))

      // Generate a safe proxy redirect URL for CPX
      const safeRedirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${wall.id}&user_id=${encodeURIComponent(userId)}&external_id=${encodeURIComponent(externalId)}`

      return {
        id: `cpx-${externalId}`,
        externalId,
        title: sanitizeApiText(survey.name || survey.title) || 'CPX Research Survey',
        description: sanitizeApiText(survey.description) || 'Complete this survey to earn rewards',
        timeMinutes: timeMin,
        reward: Math.round(rewardValue * 100) / 100,
        rating: survey.rating || 4.0,
        category: survey.category || 'General',
        country: survey.country || survey.country_code || 'All',
        provider: 'cpx-research',
        providerName: wall.name,
        wallId: wall.id,
        redirectUrl: safeRedirectUrl,
      }
    })
  } catch (error) {
    console.error('[Provider Offers] CPX fetch error:', error)
    return []
  }
}

/**
 * Fetch offers from BitLabs API.
 * BitLabs API: https://api.bitlabs.com/v1/surveys?api_key=XXX&uid=XXX
 */
async function fetchBitlabsOffers(
  wall: { id: string; name: string; apiKey: string | null; endpointUrl: string | null; config?: string },
  userId: string,
  origin: string,
  globalRevenuePercent?: number,
): Promise<NormalizedOffer[]> {
  if (!wall.apiKey || !wall.endpointUrl) return []

  try {
    const url = `${wall.endpointUrl}${wall.endpointUrl.includes('?') ? '&' : '?'}api_key=${wall.apiKey}&uid=${userId}`
    const response = await fetch(url, {
      next: { revalidate: 300 },
    })
    if (!response.ok) return []

    const data = await response.json()
    const surveys = data.surveys || data.data || data.offers || []
    if (!Array.isArray(surveys)) return []

    return surveys.map((survey: {
      id?: number | string
      survey_id?: number | string
      name?: string
      title?: string
      description?: string
      payout?: string | number
      cpi?: string | number
      value?: string | number
      category?: string
      country?: string
      country_code?: string
      time?: string | number
      duration?: string | number
      loa?: string | number
      rating?: number
    }) => {
      const payoutValue = parseFloat(String(survey.payout || survey.cpi || survey.value || '0')) || 0
      const userPercent = getUserRevenuePercent(wall.config || '{}', globalRevenuePercent) / 100
      const rewardValue = payoutValue * userPercent
      const timeMin = parseInt(String(survey.time || survey.duration || survey.loa || '10')) || 10
      const externalId = String(survey.id || survey.survey_id || Math.random().toString(36).slice(2))

      const safeRedirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${wall.id}&user_id=${encodeURIComponent(userId)}&external_id=${encodeURIComponent(externalId)}`

      return {
        id: `bitlabs-${externalId}`,
        externalId,
        title: sanitizeApiText(survey.name || survey.title) || 'BitLabs Survey',
        description: sanitizeApiText(survey.description) || 'Complete this survey to earn rewards',
        timeMinutes: timeMin,
        reward: Math.round(rewardValue * 100) / 100,
        rating: survey.rating || 4.2,
        category: survey.category || 'General',
        country: survey.country || survey.country_code || 'All',
        provider: 'bitlabs',
        providerName: wall.name,
        wallId: wall.id,
        redirectUrl: safeRedirectUrl,
      }
    })
  } catch (error) {
    console.error('[Provider Offers] BitLabs fetch error:', error)
    return []
  }
}

/**
 * Fetch offers from Inbrain API.
 * Inbrain API: https://api.inbrain.ai/v1/surveys?appId=XXX&userId=XXX
 */
async function fetchInbrainOffers(
  wall: { id: string; name: string; apiKey: string | null; endpointUrl: string | null; config?: string },
  userId: string,
  origin: string,
  globalRevenuePercent?: number,
): Promise<NormalizedOffer[]> {
  if (!wall.apiKey || !wall.endpointUrl) return []

  try {
    const url = `${wall.endpointUrl}${wall.endpointUrl.includes('?') ? '&' : '?'}appId=${wall.apiKey}&userId=${userId}`
    const response = await fetch(url, {
      next: { revalidate: 300 },
    })
    if (!response.ok) return []

    const data = await response.json()
    const surveys = data.surveys || data.data || data.offers || []
    if (!Array.isArray(surveys)) return []

    return surveys.map((survey: {
      id?: number | string
      survey_id?: number | string
      name?: string
      title?: string
      description?: string
      payout?: string | number
      cpi?: string | number
      value?: string | number
      category?: string
      country?: string
      country_code?: string
      time?: string | number
      duration?: string | number
      loa?: string | number
      rating?: number
    }) => {
      const payoutValue = parseFloat(String(survey.payout || survey.cpi || survey.value || '0')) || 0
      const userPercent = getUserRevenuePercent(wall.config || '{}', globalRevenuePercent) / 100
      const rewardValue = payoutValue * userPercent
      const timeMin = parseInt(String(survey.time || survey.duration || survey.loa || '10')) || 10
      const externalId = String(survey.id || survey.survey_id || Math.random().toString(36).slice(2))

      const safeRedirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${wall.id}&user_id=${encodeURIComponent(userId)}&external_id=${encodeURIComponent(externalId)}`

      return {
        id: `inbrain-${externalId}`,
        externalId,
        title: sanitizeApiText(survey.name || survey.title) || 'Inbrain Survey',
        description: sanitizeApiText(survey.description) || 'Complete this survey to earn rewards',
        timeMinutes: timeMin,
        reward: Math.round(rewardValue * 100) / 100,
        rating: survey.rating || 4.3,
        category: survey.category || 'General',
        country: survey.country || survey.country_code || 'All',
        provider: 'inbrain',
        providerName: wall.name,
        wallId: wall.id,
        redirectUrl: safeRedirectUrl,
      }
    })
  } catch (error) {
    console.error('[Provider Offers] Inbrain fetch error:', error)
    return []
  }
}

/**
 * Fetch offers from Custom provider (generic).
 * Custom provider: just uses the endpointUrl + user_id
 */
async function fetchCustomOffers(
  wall: { id: string; name: string; apiKey: string | null; endpointUrl: string | null; config?: string },
  userId: string,
  origin: string,
  globalRevenuePercent?: number,
): Promise<NormalizedOffer[]> {
  if (!wall.endpointUrl) return []

  try {
    const sep = wall.endpointUrl.includes('?') ? '&' : '?'
    const url = `${wall.endpointUrl}${sep}user_id=${userId}`
    const response = await fetch(url, {
      next: { revalidate: 300 },
    })
    if (!response.ok) return []

    const data = await response.json()
    const surveys = data.surveys || data.data || data.offers || []
    if (!Array.isArray(surveys)) return []

    return surveys.map((survey: {
      id?: number | string
      survey_id?: number | string
      name?: string
      title?: string
      description?: string
      payout?: string | number
      cpi?: string | number
      value?: string | number
      category?: string
      country?: string
      time?: string | number
      duration?: string | number
      loa?: string | number
      rating?: number
    }) => {
      const payoutValue = parseFloat(String(survey.payout || survey.cpi || survey.value || '0')) || 0
      const userPercent = getUserRevenuePercent(wall.config || '{}', globalRevenuePercent) / 100
      const rewardValue = payoutValue * userPercent
      const timeMin = parseInt(String(survey.time || survey.duration || survey.loa || '10')) || 10
      const externalId = String(survey.id || survey.survey_id || Math.random().toString(36).slice(2))

      const safeRedirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${wall.id}&user_id=${encodeURIComponent(userId)}&external_id=${encodeURIComponent(externalId)}`

      return {
        id: `custom-${externalId}`,
        externalId,
        title: sanitizeApiText(survey.name || survey.title) || `${wall.name} Survey`,
        description: sanitizeApiText(survey.description) || 'Complete this survey to earn rewards',
        timeMinutes: timeMin,
        reward: Math.round(rewardValue * 100) / 100,
        rating: survey.rating || 4.0,
        category: survey.category || 'General',
        country: survey.country || 'All',
        provider: 'custom',
        providerName: wall.name,
        wallId: wall.id,
        redirectUrl: safeRedirectUrl,
      }
    })
  } catch (error) {
    console.error('[Provider Offers] Custom fetch error:', error)
    return []
  }
}

// ─── Main Handler ─────────────────────────────────────────────────────

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

    // Get all active survey walls that have showInIndividualSurveys enabled
    // (separate toggle from showProviderCard which controls Survey Providers section)
    const allWalls = await db.surveyWall.findMany({
      where: {
        isActive: true,
        minFraudScore: { gte: user.fraudScore },
      },
      orderBy: { priority: 'desc' },
      select: {
        id: true,
        name: true,
        provider: true,
        apiKey: true,
        apiSecret: true,
        endpointUrl: true,
        config: true,
      },
    })

    // Filter: only show in Individual Surveys if showInIndividualSurveys is true
    const walls = allWalls.filter(wall => {
      try {
        const config = JSON.parse(wall.config || '{}')
        return config.showInIndividualSurveys !== false // default: show
      } catch {
        return true
      }
    })

    // Get global revenue share setting
    let globalRevenuePercent = 70
    try {
      const revSetting = await db.adminSettings.findUnique({ where: { key: 'defaultUserRevenuePercent' } })
      if (revSetting) globalRevenuePercent = Number(revSetting.value) || 70
    } catch { /* ignore */ }

    const origin = new URL(request.url).origin

    // Fetch offers from each provider in parallel
    const fetchPromises = walls.map(async (wall) => {
      switch (wall.provider) {
        case 'revtoo':
          return fetchRevTooOffers(wall, userId, origin, globalRevenuePercent)
        case 'cpx-research':
          return fetchCpxOffers(wall, userId, origin, globalRevenuePercent)
        case 'bitlabs':
          return fetchBitlabsOffers(wall, userId, origin, globalRevenuePercent)
        case 'inbrain':
          return fetchInbrainOffers(wall, userId, origin, globalRevenuePercent)
        case 'custom':
        default:
          return fetchCustomOffers(wall, userId, origin, globalRevenuePercent)
      }
    })

    const results = await Promise.allSettled(fetchPromises)

    // Flatten all successful results into one array
    const allOffers: NormalizedOffer[] = []
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        allOffers.push(...result.value)
      }
    })

    // Sort by reward (highest first)
    allOffers.sort((a, b) => b.reward - a.reward)

    // Also fetch DB-based individual surveys (manually created)
    const dbSurveys = await db.survey.findMany({
      where: {
        isActive: true,
        wall: { isActive: true, minFraudScore: { gte: user.fraudScore } },
      },
      orderBy: { reward: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        timeMinutes: true,
        reward: true,
        rating: true,
        reviews: true,
        available: true,
        category: true,
        country: true,
        wall: {
          select: {
            id: true,
            name: true,
            provider: true,
            endpointUrl: true,
            apiKey: true,
          },
        },
      },
    })

    // Convert DB surveys to same normalized format
    const normalizedDbSurveys: NormalizedOffer[] = dbSurveys.map((survey) => {
      let redirectUrl = ''
      const w = survey.wall

      switch (w.provider) {
        case 'revtoo':
          redirectUrl = `${origin}/api/surveys/revtoo-redirect?user_id=${encodeURIComponent(userId)}`
          break
        case 'cpx-research':
          redirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${w.id}&user_id=${encodeURIComponent(userId)}&external_id=${encodeURIComponent(survey.id)}`
          break
        case 'bitlabs':
          redirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${w.id}&user_id=${encodeURIComponent(userId)}&external_id=${encodeURIComponent(survey.id)}`
          break
        case 'inbrain':
          redirectUrl = `${origin}/api/surveys/provider-redirect?wallId=${w.id}&user_id=${encodeURIComponent(userId)}&external_id=${encodeURIComponent(survey.id)}`
          break
        default:
          if (w.endpointUrl) {
            const sep = w.endpointUrl.includes('?') ? '&' : '?'
            redirectUrl = `${w.endpointUrl}${sep}user_id=${userId}`
          }
          break
      }

      return {
        id: survey.id,
        externalId: survey.id,
        title: survey.title,
        description: survey.description || '',
        timeMinutes: survey.timeMinutes,
        reward: survey.reward,
        rating: survey.rating,
        category: survey.category || 'General',
        country: survey.country || 'All',
        provider: w.provider,
        providerName: w.name,
        wallId: w.id,
        redirectUrl,
        isDbSurvey: true,
        reviews: survey.reviews,
        available: survey.available,
      } as NormalizedOffer & { isDbSurvey?: boolean; reviews?: number; available?: number }
    })

    // Merge API offers + DB surveys, deduplicate by id
    const seenIds = new Set<string>()
    const merged: (NormalizedOffer & { isDbSurvey?: boolean; reviews?: number; available?: number })[] = []

    // DB surveys first (manually curated, higher priority)
    for (const survey of normalizedDbSurveys) {
      if (!seenIds.has(survey.id)) {
        seenIds.add(survey.id)
        merged.push(survey)
      }
    }

    // Then API offers (auto-synced)
    for (const offer of allOffers) {
      if (!seenIds.has(offer.id)) {
        seenIds.add(offer.id)
        merged.push({ ...offer, isDbSurvey: false })
      }
    }

    return NextResponse.json(merged)
  } catch (error) {
    console.error('[Provider Offers] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch provider offers' }, { status: 500 })
  }
}
