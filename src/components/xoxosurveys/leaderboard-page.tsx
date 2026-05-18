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

  // Countdown timer
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date()
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)
      const diff = tomorrow.getTime() - now.getTime()
      const h = Math.floor(diff / (1000 * 60 * 60))
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const s = Math.floor((diff % (1000 * 60)) / 1000)
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

  const getRankIcon = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="relative flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="#F9CC28" stroke="#E5B800" strokeWidth="1">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="absolute text-[9px] font-bold text-white" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>1</span>
        </div>
      )
    }
    if (rank === 2) {
      return (
        <div className="relative flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#C0C0C0" stroke="#A0A0A0" strokeWidth="1">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="absolute text-[9px] font-bold text-white" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>2</span>
        </div>
      )
    }
    if (rank === 3) {
      return (
        <div className="relative flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#CD7F32" stroke="#A0522D" strokeWidth="1">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          <span className="absolute text-[9px] font-bold text-white" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>3</span>
        </div>
      )
    }
    return (
      <span className="w-8 h-8 flex items-center justify-center text-[14px] font-bold text-[#999999]">
        #{rank}
      </span>
    )
  }

  const topUser = data?.rankings?.[0]

  return (
    <div className="max-w-[680px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div
              className="w-[36px] h-[36px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z" />
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z" />
                <path d="M4 22h16" />
                <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
              </svg>
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                {periodLabels[period].label} Leaderboard
              </h1>
              <p className="text-[12px] text-[#999999]">{periodLabels[period].sub}</p>
            </div>
          </div>
        </div>
        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold text-white transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-1 mb-4 bg-[#F5F5F5] rounded-[10px] p-1">
        {(['daily', 'weekly', 'monthly', 'all'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-[8px] text-[13px] font-semibold transition-all ${
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
      {period === 'daily' && (
        <div className="bg-[#F0FDFB] border border-[#0FBCC0]/20 rounded-[12px] p-3.5 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-[32px] h-[32px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[#36383A]">Next Reset: 12:00 AM</p>
              <p className="text-[11px] text-[#0FBCC0]">Resets daily at midnight</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[18px] font-bold text-[#0FBCC0] font-mono">
              {String(countdown.h).padStart(2, '0')}h {String(countdown.m).padStart(2, '0')}m {String(countdown.s).padStart(2, '0')}s
            </p>
            <p className="text-[10px] text-[#0FBCC0]/70">until reset</p>
          </div>
        </div>
      )}

      {/* My Ranking */}
      <div className="bg-white border border-[#E2EAF1] rounded-[12px] p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-[40px] h-[40px] rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-[#36383A]">Your Ranking</p>
            <p className="text-[12px] text-[#0FBCC0]">
              {data?.myRank ? `#${data.myRank} — Keep going!` : 'Not ranked yet — Complete offers to appear!'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[18px] font-bold text-[#0FBCC0]">${(data?.myEarnings ?? 0).toFixed(3)}</p>
          <p className="text-[11px] text-[#999999]">{data?.myOffers ?? 0} offers completed</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-3 border-[#2DD9B6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top User Highlight */}
          {topUser && (
            <div className="rounded-[12px] p-5 mb-4 border border-[#0FBCC0]/20" style={{ background: 'linear-gradient(135deg, #F0FDFB 0%, #E6FAF8 100%)' }}>
              <div className="flex flex-col items-center text-center">
                {/* Gold medal with teal accent */}
                <div className="relative mb-2">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="#F9CC28" stroke="#E5B800" strokeWidth="1">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-white" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>1</span>
                </div>
                {/* Avatar */}
                <div
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-[20px] font-bold mb-2"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  {getInitial(topUser)}
                </div>
                <p className="text-[16px] font-bold text-[#36383A]">{getDisplayName(topUser)}</p>
                <p className="text-[12px] text-[#999999] mb-1.5">ID: #{topUser.numericUserId}</p>
                <div className="inline-flex items-center gap-1.5 bg-[#0FBCC0]/10 px-3 py-1.5 rounded-full">
                  <p className="text-[22px] font-bold text-[#0FBCC0]">${topUser.earnings.toFixed(3)}</p>
                </div>
                <p className="text-[12px] text-[#999999] mt-1.5">{topUser.offers} offers completed</p>
              </div>
            </div>
          )}

          {/* Full Rankings */}
          <div className="bg-white border border-[#E2EAF1] rounded-[12px] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2EAF1] flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold text-[#36383A]">Full Rankings</h3>
                <p className="text-[11px] text-[#999999]">{data?.totalParticipants ?? 0} participants</p>
              </div>
              {data?.myRank && data.myRank > 3 && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#0FBCC0]/10 text-[#0FBCC0] border border-[#0FBCC0]/20">
                  Your Rank: #{data.myRank}
                </span>
              )}
            </div>

            {data?.rankings && data.rankings.length > 0 ? (
              <div className="divide-y divide-[#F5F5F5]">
                {data.rankings.map((user) => {
                  const isMe = user.userId === localStorage.getItem('userId') ||
                    user.numericUserId === state.user.userId
                  return (
                    <div
                      key={user.userId}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                        isMe ? 'bg-[#F0FDFB]' : 'hover:bg-[#F9FAFB]'
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-8 flex-shrink-0 flex justify-center">
                        {getRankIcon(user.rank)}
                      </div>

                      {/* Avatar */}
                      <div
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
                        style={{
                          background: user.rank <= 3
                            ? 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)'
                            : '#C4C4C4'
                        }}
                      >
                        {getInitial(user)}
                      </div>

                      {/* Name & ID */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-[14px] font-semibold text-[#36383A] truncate">
                            {getDisplayName(user)}
                          </p>
                          {isMe && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0FBCC0]/10 text-[#0FBCC0] border border-[#0FBCC0]/20">
                              YOU
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#999999]">ID: #{user.numericUserId}</p>
                      </div>

                      {/* Earnings */}
                      <div className="text-right flex-shrink-0">
                        <p className={`text-[14px] font-bold ${user.rank === 1 ? 'text-[#0FBCC0]' : 'text-[#0FBCC0]'}`}>
                          ${user.earnings.toFixed(3)}
                        </p>
                        <p className="text-[11px] text-[#999999]">{user.offers} offers</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-12 text-center">
                <div
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center mx-auto mb-3 opacity-30"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z" />
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z" />
                    <path d="M4 22h16" />
                    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
                    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
                    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                  </svg>
                </div>
                <p className="text-[14px] text-[#999999]">No rankings yet</p>
                <p className="text-[12px] text-[#BFBFBF] mt-1">Complete surveys to appear on the leaderboard!</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
