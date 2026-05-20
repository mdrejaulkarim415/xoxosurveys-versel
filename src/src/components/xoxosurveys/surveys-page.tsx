'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/app/page'

// Type definitions
interface SurveyWall {
  id: string
  name: string
  provider: string
  description: string | null
  minPayout: number
  maxPayout: number
  surveyCount: number
  redirectUrl: string
  postbackUrl: string
}

interface SurveyListing {
  id: string
  title: string
  description: string | null
  timeMinutes: number
  reward: number
  rating: number
  reviews?: number
  available?: number
  category: string | null
  country: string | null
  language?: string | null
  provider: string
  providerName: string
  wallId?: string
  isDbSurvey?: boolean
  redirectUrl: string
}

// Provider gradient colors for card headers
const PROVIDER_GRADIENTS: Record<string, string> = {
  revtoo: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)',
  'cpx-research': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  bitlabs: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  inbrain: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  custom: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
}

const PROVIDER_ICONS: Record<string, React.ReactElement> = {
  revtoo: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  ),
  'cpx-research': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  bitlabs: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  inbrain: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2z" />
    </svg>
  ),
  custom: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  ),
}

function getProviderGradient(provider: string): string {
  return PROVIDER_GRADIENTS[provider] || PROVIDER_GRADIENTS.custom
}

function getProviderIcon(provider: string): React.ReactElement {
  return PROVIDER_ICONS[provider] || PROVIDER_ICONS.custom
}

export function SurveysPage() {
  const { setState, state } = useApp()

  // Revtoo survey state
  const [revtooLoading, setRevtooLoading] = useState(true)
  const [revtooOffer, setRevtooOffer] = useState<{
    id: number
    title: string
    description: string
    image: string
    category: string
    countries: string[]
    os: string[]
    payout: string
    reward: string
  } | null>(null)
  const [revtooUrl, setRevtooUrl] = useState<string | null>(null)
  const [revtooCustom, setRevtooCustom] = useState<{
    badge: string
    time: string
    payout: string
  }>({ badge: 'Featured', time: '5-20 Min', payout: '' })

  // Walls and surveys state
  const [walls, setWalls] = useState<SurveyWall[]>([])
  const [wallsLoading, setWallsLoading] = useState(true)
  const [surveys, setSurveys] = useState<SurveyListing[]>([])
  const [surveysLoading, setSurveysLoading] = useState(true)

  // Survey sort state
  const [surveySort, setSurveySort] = useState<'best' | 'short' | 'highest'>('best')

  // Survey started state (tracks if user opened any survey link)
  const [surveyOpened, setSurveyOpened] = useState(false)
  const [lastBalance, setLastBalance] = useState(state.user.balance)

  // Sort surveys based on selected tab
  const getSortedSurveys = () => {
    const sorted = [...surveys]
    switch (surveySort) {
      case 'short':
        return sorted.sort((a, b) => a.timeMinutes - b.timeMinutes)
      case 'highest':
        return sorted.sort((a, b) => b.reward - a.reward)
      case 'best':
      default:
        // Best match: sort by rating * reward (balance of quality and payout)
        return sorted.sort((a, b) => (b.rating * b.reward) - (a.rating * a.reward))
    }
  }

  // Fetch Revtoo offer on mount
  useEffect(() => {
    async function fetchRevtooOffer() {
      try {
        const res = await fetch(`/api/surveys/revtoo-offer?user_id=${state.user.userId}`)
        if (res.ok) {
          const data = await res.json()
          setRevtooOffer(data.offer)
          setRevtooUrl(data.redirectUrl)
          if (data.customization) {
            setRevtooCustom(data.customization)
          }
        }
      } catch (err) {
        console.warn('[Featured Offer] Failed to fetch:', err)
      } finally {
        setRevtooLoading(false)
      }
    }
    if (state.user.userId) {
      fetchRevtooOffer()
    }
  }, [state.user.userId])

  // Fetch survey walls on mount
  useEffect(() => {
    async function fetchWalls() {
      try {
        const res = await fetch(`/api/surveys/walls?user_id=${state.user.userId}`)
        if (res.ok) {
          const data = await res.json()
          setWalls(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.warn('[Survey Walls] Failed to fetch:', err)
      } finally {
        setWallsLoading(false)
      }
    }
    if (state.user.userId) {
      fetchWalls()
    }
  }, [state.user.userId])

  // Fetch individual surveys from ALL providers (auto-synced)
  useEffect(() => {
    async function fetchSurveys() {
      try {
        const res = await fetch(`/api/surveys/provider-offers?user_id=${state.user.userId}`)
        if (res.ok) {
          const data = await res.json()
          setSurveys(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.warn('[Provider Offers] Failed to fetch:', err)
      } finally {
        setSurveysLoading(false)
      }
    }
    if (state.user.userId) {
      fetchSurveys()
    }
  }, [state.user.userId])

  // Poll for balance changes after survey is opened
  const checkBalanceUpdate = useCallback(async () => {
    if (!surveyOpened || !state.user.userId) return

    try {
      const res = await fetch(`/api/user/balance?user_id=${state.user.userId}`)
      if (res.ok) {
        const data = await res.json()
        const newBalance = data.balance

        // If balance increased, update the client state
        if (newBalance > lastBalance) {
          setState(prev => ({
            ...prev,
            user: {
              ...prev.user,
              balance: newBalance,
              totalEarned: data.totalEarned,
              surveysCompleted: data.surveysCompleted,
            },
          }))
          setLastBalance(newBalance)
          setSurveyOpened(false) // Stop polling after reward detected

          // Dispatch event to refresh notifications immediately
          window.dispatchEvent(new CustomEvent('xoxo-balance-changed', {
            detail: { newBalance, totalEarned: data.totalEarned }
          }))
        }
      }
    } catch {
      // Silently fail
    }
  }, [surveyOpened, state.user.userId, lastBalance, setState])

  // Poll every 10 seconds when survey is opened
  useEffect(() => {
    if (!surveyOpened) return

    const interval = setInterval(checkBalanceUpdate, 10000)

    // Also check when the window regains focus (user comes back from survey tab)
    const handleFocus = () => {
      checkBalanceUpdate()
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [surveyOpened, checkBalanceUpdate])

  // Open a survey/wall URL and start balance polling
  const handleOpenSurveyLink = (url: string) => {
    if (url) {
      setLastBalance(state.user.balance)
      setSurveyOpened(true)
      window.open(url, '_blank')
    }
  }

  // Handle clicking the featured Revtoo survey
  const handleStartFeaturedSurvey = () => {
    if (revtooUrl) {
      handleOpenSurveyLink(revtooUrl)
    }
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
          Available Surveys
        </h1>
        <p className="text-[14px] text-[#999999] mt-1">
          Complete surveys to earn rewards. Your earnings will be credited automatically after completion.
        </p>
      </div>

      {/* Survey Opened - Waiting for Completion Banner */}
      {surveyOpened && (
        <div
          className="mb-6 rounded-[12px] border border-[#0FBCC0]/30 p-5"
          style={{ background: '#F0FDFB', boxShadow: '0px 4px 20px 0px rgba(15,188,192,0.08)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-[40px] h-[40px] rounded-full bg-[#0FBCC0]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] font-bold text-[#065F46] mb-1">Survey In Progress</h3>
              <p className="text-[14px] text-[#047857]">
                Complete the survey in the other tab. Your reward will be credited automatically once you finish. This page will update when your reward is received.
              </p>
              <p className="text-[12px] text-[#6B7280] mt-2">
                Checking for updates every 10 seconds...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== SECTION 1: FEATURED SURVEY BANNER ===== */}
      {revtooOffer && !revtooLoading && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <h2 className="text-[16px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
              Featured Offer
            </h2>
          </div>
          <button
            onClick={handleStartFeaturedSurvey}
            className="w-full text-left bg-white rounded-[16px] border-2 border-[#0FBCC0]/30 overflow-hidden transition-all hover:shadow-[0px_8px_32px_0px_rgba(15,188,192,0.25)] hover:border-[#0FBCC0]/50 group"
            style={{ boxShadow: '0px 4px 20px 0px rgba(15,188,192,0.15)' }}
          >
            {/* Gradient Top Banner */}
            <div
              className="px-6 py-4 flex items-center gap-3"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              <div className="w-[48px] h-[48px] rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-[20px] font-bold text-white" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                    {revtooOffer.title}
                  </h2>
                  <span className="bg-white/20 text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    {revtooCustom.badge}
                  </span>
                </div>
                <p className="text-[13px] text-white/80 mt-0.5">
                  {revtooOffer.description}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white/20 rounded-full px-4 py-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                <span className="text-[13px] font-semibold text-white">Start Survey</span>
              </div>
            </div>

            {/* Info Section */}
            <div className="px-6 py-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="text-[13px] text-[#555555]">{revtooCustom.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <span className="text-[13px] text-[#10B981] font-bold">
                    {revtooCustom.payout || (() => {
                      const parsed = parseFloat(revtooOffer.payout)
                      return !isNaN(parsed) && parsed > 0 ? `Up to $${parsed.toFixed(2)}` : 'Variable'
                    })()}
                  </span>
                </div>
                {revtooOffer.countries && revtooOffer.countries.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22B9CF" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    <span className="text-[13px] text-[#555555]">{revtooOffer.countries.slice(0, 3).join(', ')}{revtooOffer.countries.length > 3 ? '+' : ''}</span>
                  </div>
                )}
                {revtooOffer.os && revtooOffer.os.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <span className="text-[13px] text-[#555555]">{revtooOffer.os.join(', ')}</span>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1 text-[#999999] group-hover:text-[#0FBCC0] transition-colors">
                  <span className="text-[13px] font-medium">Click to Start</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Featured Offer Loading Placeholder */}
      {revtooLoading && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <h2 className="text-[16px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
              Featured Offer
            </h2>
          </div>
          <div className="w-full bg-white rounded-[16px] border border-[#E2EAF1] overflow-hidden animate-pulse" style={{ boxShadow: '0px 4px 20px 0px rgba(191,197,209,0.20)' }}>
            <div className="px-6 py-4" style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}>
              <div className="flex items-center gap-3">
                <div className="w-[48px] h-[48px] rounded-full bg-white/20" />
                <div className="flex-1">
                  <div className="h-5 bg-white/30 rounded w-48 mb-2" />
                  <div className="h-3 bg-white/20 rounded w-72" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="flex gap-4">
                <div className="h-4 bg-[#F0F2F5] rounded w-16" />
                <div className="h-4 bg-[#F0F2F5] rounded w-24" />
                <div className="h-4 bg-[#F0F2F5] rounded w-20" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SECTION 2: SURVEY PROVIDERS / WALLS ===== */}
      {/* Per-wall showProviderCard filtering is done server-side in /api/surveys/walls */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          <h2 className="text-[16px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            Survey Providers
          </h2>
        </div>

        {/* Walls Loading */}
        {wallsLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-[12px] border border-[#E2EAF1] overflow-hidden animate-pulse" style={{ boxShadow: '0px 4px 20px 0px rgba(191,197,209,0.20)' }}>
                <div className="px-4 py-3" style={{ background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)' }}>
                  <div className="h-5 bg-white/30 rounded w-24 mb-2" />
                  <div className="h-3 bg-white/20 rounded w-36" />
                </div>
                <div className="p-4">
                  <div className="h-3 bg-[#F0F2F5] rounded w-full mb-2" />
                  <div className="h-3 bg-[#F0F2F5] rounded w-3/4 mb-3" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-[#F0F2F5] rounded-full w-20" />
                    <div className="h-6 bg-[#F0F2F5] rounded-full w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Walls Grid */}
        {!wallsLoading && walls.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {walls.map(wall => (
              <button
                key={wall.id}
                onClick={() => handleOpenSurveyLink(wall.redirectUrl)}
                disabled={!wall.redirectUrl}
                className="text-left bg-white rounded-[12px] border border-[#E2EAF1] overflow-hidden transition-all hover:shadow-[0px_8px_24px_0px_rgba(0,0,0,0.1)] hover:border-[#0FBCC0]/30 group disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ boxShadow: '0px 4px 20px 0px rgba(191,197,209,0.20)' }}
              >
                {/* Gradient Header */}
                <div
                  className="px-4 py-3 flex items-center gap-3"
                  style={{ background: getProviderGradient(wall.provider) }}
                >
                  <div className="w-[36px] h-[36px] rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    {getProviderIcon(wall.provider)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold text-white truncate">
                      {wall.name}
                    </h3>
                    <p className="text-[11px] text-white/80 truncate">
                      {wall.surveyCount} survey{wall.surveyCount !== 1 ? 's' : ''} available
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform flex-shrink-0">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <p className="text-[13px] text-[#666666] mb-3 line-clamp-2 min-h-[40px]">
                    {wall.description || `Complete surveys from ${wall.name} to earn rewards.`}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#10B981] bg-[#10B981]/10 rounded-full px-2.5 py-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                      ${wall.minPayout.toFixed(2)} - ${wall.maxPayout.toFixed(2)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#0FBCC0] bg-[#0FBCC0]/10 rounded-full px-2.5 py-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18" />
                        <path d="M9 21V9" />
                      </svg>
                      {wall.surveyCount} available
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Walls Available */}
        {!wallsLoading && walls.length === 0 && !revtooLoading && !revtooOffer && (
          <div className="text-center py-10">
            <div
              className="w-[64px] h-[64px] rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
            </div>
            <p className="text-[14px] text-[#999999]">No survey providers available right now. Check back soon!</p>
          </div>
        )}
      </div>

      {/* ===== SECTION 3: INDIVIDUAL SURVEY LISTINGS (GRID) ===== */}
      <div className="mb-8">
        {/* Section Title */}
        <div className="flex items-center gap-2 mb-4">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h2 className="text-[16px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            Individual Surveys
          </h2>
        </div>

        {/* Sorting Tabs */}
        <div className="flex items-center justify-center gap-6 mb-4 border-b border-[#E5E7EB]">
          {([
            { key: 'best', label: 'Best Match' },
            { key: 'short', label: 'Short Surveys' },
            { key: 'highest', label: 'Highest Payout' },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setSurveySort(tab.key)}
              className={`pb-2.5 text-[14px] font-medium transition-colors relative ${
                surveySort === tab.key
                  ? 'text-[#0FBCC0]'
                  : 'text-[#666666] hover:text-[#333333]'
              }`}
            >
              {tab.label}
              {surveySort === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0FBCC0] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Surveys Loading */}
        {surveysLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <div key={i} className="bg-white rounded-[10px] p-4 animate-pulse" style={{ boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center gap-1.5 mb-3">
                  <div className="w-[14px] h-[14px] rounded-full bg-[#E5E7EB]" />
                  <div className="h-3 bg-[#E5E7EB] rounded w-10" />
                </div>
                <div className="h-5 bg-[#E5E7EB] rounded w-16 mb-3" />
                <div className="flex items-center gap-1.5">
                  <div className="w-[12px] h-[12px] rounded-full bg-[#E5E7EB]" />
                  <div className="h-3 bg-[#E5E7EB] rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Survey Grid Listings */}
        {!surveysLoading && surveys.length > 0 && (
          <div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 overflow-y-auto pr-1"
            style={{ maxHeight: '500px', scrollbarWidth: 'thin', scrollbarColor: '#0FBCC0 transparent' }}
          >
            {getSortedSurveys().slice(0, 30).map(survey => (
              <button
                key={survey.id}
                onClick={() => handleOpenSurveyLink(survey.redirectUrl)}
                disabled={!survey.redirectUrl}
                className="bg-white rounded-[10px] p-4 text-left transition-all hover:shadow-[0px_4px_16px_0px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:translate-y-0 group disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:translate-y-0"
                style={{ boxShadow: '0px 2px 8px 0px rgba(0,0,0,0.06)' }}
              >
                {/* Top: Clock icon + Duration */}
                <div className="flex items-center gap-1.5 mb-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span className="text-[13px] text-[#666666] font-normal">
                    {survey.timeMinutes} min
                  </span>
                </div>

                {/* Middle: Payout Amount */}
                <div className="mb-3">
                  <span className="text-[20px] font-bold leading-none" style={{ color: '#0CCFC3' }}>
                    ${survey.reward.toFixed(2)}
                  </span>
                  <span className="text-[11px] text-[#999999] font-normal ml-1">USD</span>
                </div>

                {/* Bottom: Star Rating + Reviews */}
                <div className="flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" strokeWidth="1">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  <span className="text-[12px] text-[#666666] font-normal">
                    {survey.reviews && survey.reviews > 0
                      ? `${survey.rating.toFixed(survey.rating % 1 === 0 ? 0 : 1)} (${survey.reviews})`
                      : survey.rating > 0
                        ? survey.rating.toFixed(survey.rating % 1 === 0 ? 0 : 1)
                        : 'New'
                    }
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Surveys Available */}
        {!surveysLoading && surveys.length === 0 && (
          <div className="text-center py-10">
            <div
              className="w-[64px] h-[64px] rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <p className="text-[14px] text-[#999999]">No individual surveys available right now. Try one of the providers above!</p>
          </div>
        )}
      </div>

      {/* ===== HOW IT WORKS SECTION ===== */}
      <div
        className="bg-white rounded-[12px] border border-[#E2EAF1] p-6"
        style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
      >
        <h2 className="text-[16px] font-bold text-[#36383A] mb-4" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div
              className="w-[32px] h-[32px] rounded-full flex items-center justify-center flex-shrink-0 text-white text-[14px] font-bold"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              1
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#36383A]">Choose a Survey</p>
              <p className="text-[12px] text-[#999999]">Pick from featured offers, providers, or individual surveys</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div
              className="w-[32px] h-[32px] rounded-full flex items-center justify-center flex-shrink-0 text-white text-[14px] font-bold"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              2
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#36383A]">Complete Survey</p>
              <p className="text-[12px] text-[#999999]">Answer all questions honestly in the survey</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div
              className="w-[32px] h-[32px] rounded-full flex items-center justify-center flex-shrink-0 text-white text-[14px] font-bold"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              3
            </div>
            <div>
              <p className="text-[14px] font-medium text-[#36383A]">Get Rewarded</p>
              <p className="text-[12px] text-[#999999]">Your balance updates automatically after completion</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
