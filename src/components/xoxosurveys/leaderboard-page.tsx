'use client'

import { useApp } from '@/app/page'
import { useState, useEffect, useCallback } from 'react'

type Period = 'daily' | 'weekly' | 'monthly' | 'all'

interface RankedUser {
  rank: number
  userId: string
  numericUserId: number
  email: string
  firstname: string | null
  lastname: string | null
  earnings: number
  offers: number
  totalEarned: number
}

interface LeaderboardData {
  period: string
  rankings: RankedUser[]
  myRank: number | null
  myEarnings: number
  myOffers: number
  nextReset: {
    hours: number
    minutes: number
    seconds: number
    resetTime: string
  }
  totalParticipants: number
}

const periodLabels: Record<Period, { label: string; sub: string }> = {
  daily: { label: 'Daily', sub: 'Top earners today' },
  weekly: { label: 'Weekly', sub: 'Top earners this week' },
  monthly: { label: 'Monthly', sub: 'Top earners this month' },
  all: { label: 'All Time', sub: 'Top earners of all time' },
}

export function LeaderboardPage() {
  const { state } = useApp()
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('daily')
  const [countdown, setCountdown] = useState({ h: 0, m: 0, s: 0 })

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true)
      const userId = localStorage.getItem('userId')
      const res = await fetch(`/api/leaderboard?period=${period}&userId=${userId || ''}`)
      if (res.ok) {
        const lbData = await res.json()
        setData(lbData)
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard:', e)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Countdown timer - until 6 AM Bangladesh Time
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      // BD time = UTC + 6
      const bdOffset = 6 * 60 * 60 * 1000
      const nowBd = new Date(now.getTime() + bdOffset)
      const bdHour = nowBd.getUTCHours()

      // Next reset: today at 6 AM BD if not yet passed, otherwise tomorrow at 6 AM BD
      let nextResetBd: Date
      if (bdHour < 6) {
        nextResetBd = new Date(Date.UTC(nowBd.getUTCFullYear(), nowBd.getUTCMonth(), nowBd.getUTCDate(), 6, 0, 0))
      } else {
        const tomorrowBd = new Date(nowBd.getTime() + 24 * 60 * 60 * 1000)
        nextResetBd = new Date(Date.UTC(tomorrowBd.getUTCFullYear(), tomorrowBd.getUTCMonth(), tomorrowBd.getUTCDate(), 6, 0, 0))
      }
      const nextResetUtc = new Date(nextResetBd.getTime() - bdOffset)
      const diff = nextResetUtc.getTime() - now.getTime()
      const h = Math.max(0, Math.floor(diff / (1000 * 60 * 60)))
      const m = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)))
      const s = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000))
      setCountdown({ h, m, s })
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchLeaderboard, 60000)
    return () => clearInterval(interval)
  }, [fetchLeaderboard])

  const getDisplayName = (user: RankedUser) => {
    if (user.firstname) {
      return user.lastname ? `${user.firstname} ${user.lastname}` : user.firstname
    }
    const [name] = user.email.split('@')
    if (name.length <= 3) return user.email
    return name.slice(0, 2) + '***'
  }

  const getInitial = (user: RankedUser) => {
    if (user.firstname) return user.firstname[0].toUpperCase()
    return user.email[0].toUpperCase()
  }

  const top3 = data?.rankings?.slice(0, 3) || []
  const restRankings = data?.rankings?.slice(3) || []

  return (
    <div className="max-w-[960px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-[44px] h-[44px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-[26px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                {periodLabels[period].label} Leaderboard
              </h1>
              <p className="text-[14px] text-[#999999]">{periodLabels[period].sub}</p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[14px] font-semibold text-white transition-all disabled:opacity-50 hover:shadow-lg"
          style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-1.5 mb-5 bg-[#F5F5F5] rounded-[12px] p-1.5">
        {(['daily', 'weekly', 'monthly', 'all'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2.5 rounded-[10px] text-[14px] font-semibold transition-all ${
              period === p
                ? 'bg-white text-[#0FBCC0] shadow-sm'
                : 'text-[#999999] hover:text-[#4B4B4B]'
            }`}
          >
            {periodLabels[p].label}
          </button>
        ))}
      </div>

      {/* Reset Timer */}
      {(period === 'daily' || period === 'weekly') && (
        <div className="bg-[#F0FDFB] border border-[#0FBCC0]/20 rounded-[14px] p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-[40px] h-[40px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#36383A]">
                Next Reset: {period === 'daily' ? '6:00 AM' : 'Monday 6:00 AM'}
              </p>
              <p className="text-[13px] text-[#0FBCC0]">
                {period === 'daily' ? 'Resets daily at 6 AM' : 'Resets every Monday at 6 AM'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[22px] font-bold text-[#0FBCC0] font-mono">
              {String(countdown.h).padStart(2, '0')}h {String(countdown.m).padStart(2, '0')}m {String(countdown.s).padStart(2, '0')}s
            </p>
            <p className="text-[12px] text-[#0FBCC0]/70">until reset</p>
          </div>
        </div>
      )}

      {/* My Ranking */}
      <div className="bg-white border border-[#E2EAF1] rounded-[14px] p-5 mb-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3.5">
          <div
            className="w-[48px] h-[48px] rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>
          <div>
            <p className="text-[16px] font-semibold text-[#36383A]">Your Ranking</p>
            <p className="text-[13px] text-[#0FBCC0]">
              {data?.myRank ? `#${data.myRank} — Keep going!` : 'Not ranked yet — Complete offers to appear!'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[22px] font-bold text-[#0FBCC0]">${(data?.myEarnings ?? 0).toFixed(2)}</p>
          <p className="text-[13px] text-[#999999]">{data?.myOffers ?? 0} offers completed</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-3 border-[#2DD9B6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top 3 Podium - Full Width */}
          {top3.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              {/* 2nd Place */}
              {top3[1] && (
                <div className="bg-white border border-[#E2EAF1] rounded-[14px] p-5 flex flex-col items-center text-center shadow-sm sm:order-1 sm:mt-6">
                  <div className="relative mb-2.5">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="#C0C0C0" stroke="#A0A0A0" strokeWidth="1">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="absolute text-[11px] font-bold text-white" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>2</span>
                  </div>
                  <div
                    className="w-[56px] h-[56px] rounded-full flex items-center justify-center text-white text-[22px] font-bold mb-2.5"
                    style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                  >
                    {getInitial(top3[1])}
                  </div>
                  <p className="text-[16px] font-bold text-[#36383A]">{getDisplayName(top3[1])}</p>
                  <p className="text-[13px] text-[#999999] mb-2">{top3[1].offers} offers completed</p>
                  <div className="inline-flex items-center gap-1.5 bg-[#F5F5F5] px-4 py-1.5 rounded-full">
                    <p className="text-[20px] font-bold text-[#0FBCC0]">${top3[1].earnings.toFixed(2)}</p>
                  </div>
                  <p className="text-[12px] text-[#999999] mt-1.5">{top3[1].offers} offers</p>
                </div>
              )}

              {/* 1st Place - Bigger & Highlighted */}
              {top3[0] && (
                <div className="rounded-[14px] p-6 flex flex-col items-center text-center sm:order-2 shadow-md border-2 border-[#0FBCC0]/30" style={{ background: 'linear-gradient(135deg, #F0FDFB 0%, #E6FAF8 100%)' }}>
                  <div className="relative mb-2.5">
                    <svg width="52" height="52" viewBox="0 0 24 24" fill="#F9CC28" stroke="#E5B800" strokeWidth="1">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="absolute text-[14px] font-bold text-white" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>1</span>
                  </div>
                  <div
                    className="w-[68px] h-[68px] rounded-full flex items-center justify-center text-white text-[26px] font-bold mb-2.5 shadow-lg"
                    style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                  >
                    {getInitial(top3[0])}
                  </div>
                  <p className="text-[18px] font-bold text-[#36383A]">{getDisplayName(top3[0])}</p>
                  <p className="text-[13px] text-[#999999] mb-2">{top3[0].offers} offers completed</p>
                  <div className="inline-flex items-center gap-1.5 bg-[#0FBCC0]/10 px-4 py-2 rounded-full">
                    <p className="text-[26px] font-bold text-[#0FBCC0]">${top3[0].earnings.toFixed(2)}</p>
                  </div>
                  <p className="text-[13px] text-[#999999] mt-2">{top3[0].offers} offers completed</p>
                </div>
              )}

              {/* 3rd Place */}
              {top3[2] && (
                <div className="bg-white border border-[#E2EAF1] rounded-[14px] p-5 flex flex-col items-center text-center shadow-sm sm:order-3 sm:mt-6">
                  <div className="relative mb-2.5">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="#CD7F32" stroke="#A0522D" strokeWidth="1">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span className="absolute text-[10px] font-bold text-white" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>3</span>
                  </div>
                  <div
                    className="w-[56px] h-[56px] rounded-full flex items-center justify-center text-white text-[22px] font-bold mb-2.5"
                    style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                  >
                    {getInitial(top3[2])}
                  </div>
                  <p className="text-[16px] font-bold text-[#36383A]">{getDisplayName(top3[2])}</p>
                  <p className="text-[13px] text-[#999999] mb-2">{top3[2].offers} offers completed</p>
                  <div className="inline-flex items-center gap-1.5 bg-[#F5F5F5] px-4 py-1.5 rounded-full">
                    <p className="text-[20px] font-bold text-[#0FBCC0]">${top3[2].earnings.toFixed(2)}</p>
                  </div>
                  <p className="text-[12px] text-[#999999] mt-1.5">{top3[2].offers} offers</p>
                </div>
              )}
            </div>
          )}

          {/* Full Rankings Table - Full Width */}
          <div className="bg-white border border-[#E2EAF1] rounded-[14px] overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-[#E2EAF1] flex items-center justify-between">
              <div>
                <h3 className="text-[17px] font-semibold text-[#36383A]">Full Rankings</h3>
                <p className="text-[13px] text-[#999999]">{data?.totalParticipants ?? 0} participants</p>
              </div>
              {data?.myRank && data.myRank > 3 && (
                <span className="text-[12px] font-semibold px-3 py-1.5 rounded-full bg-[#0FBCC0]/10 text-[#0FBCC0] border border-[#0FBCC0]/20">
                  Your Rank: #{data.myRank}
                </span>
              )}
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[56px_44px_1fr_140px] sm:grid-cols-[60px_48px_1fr_180px] gap-3 px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E2EAF1] text-[12px] font-semibold text-[#999999] uppercase tracking-wide">
              <span>Rank</span>
              <span></span>
              <span>User</span>
              <span className="text-right">Earnings</span>
            </div>

            {data?.rankings && data.rankings.length > 0 ? (
              <div className="divide-y divide-[#F5F5F5]">
                {data.rankings.map((user) => {
                  const isMe = user.userId === localStorage.getItem('userId') ||
                    user.numericUserId === state.user.userId
                  return (
                    <div
                      key={user.userId}
                      className={`grid grid-cols-[56px_44px_1fr_140px] sm:grid-cols-[60px_48px_1fr_180px] gap-3 items-center px-5 py-3.5 transition-colors ${
                        isMe ? 'bg-[#F0FDFB]' : 'hover:bg-[#F9FAFB]'
                      }`}
                    >
                      {/* Rank */}
                      <div className="flex justify-center">
                        {user.rank === 1 ? (
                          <div className="relative flex items-center justify-center">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="#F9CC28" stroke="#E5B800" strokeWidth="1">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="absolute text-[10px] font-bold text-white" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>1</span>
                          </div>
                        ) : user.rank === 2 ? (
                          <div className="relative flex items-center justify-center">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="#C0C0C0" stroke="#A0A0A0" strokeWidth="1">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="absolute text-[10px] font-bold text-white" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>2</span>
                          </div>
                        ) : user.rank === 3 ? (
                          <div className="relative flex items-center justify-center">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="#CD7F32" stroke="#A0522D" strokeWidth="1">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="absolute text-[9px] font-bold text-white" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>3</span>
                          </div>
                        ) : (
                          <span className="text-[15px] font-bold text-[#999999]">#{user.rank}</span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div
                        className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-white text-[14px] font-bold"
                        style={{
                          background: user.rank <= 3
                            ? 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)'
                            : '#C4C4C4'
                        }}
                      >
                        {getInitial(user)}
                      </div>

                      {/* Name & ID */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[15px] font-semibold text-[#36383A] truncate">
                            {getDisplayName(user)}
                          </p>
                          {isMe && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0FBCC0]/10 text-[#0FBCC0] border border-[#0FBCC0]/20 flex-shrink-0">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#999999]">{user.offers} offers completed</p>
                      </div>

                      {/* Earnings */}
                      <div className="text-right">
                        <p className="text-[16px] font-bold text-[#0FBCC0]">${user.earnings.toFixed(2)}</p>
                        <p className="text-[12px] text-[#999999]">{user.offers} offers</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-16 text-center">
                <div
                  className="w-[64px] h-[64px] rounded-full flex items-center justify-center mx-auto mb-4 opacity-30"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                </div>
                <p className="text-[16px] text-[#999999]">No rankings yet</p>
                <p className="text-[14px] text-[#BFBFBF] mt-1">Complete surveys to appear on the leaderboard!</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
