'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/app/page'

interface Milestone {
  milestone: number
  reward: number
  progress: number
  isCompleted: boolean
  isClaimed: boolean
  canClaim: boolean
  claimedAt: string | null
}

export function MilestonesModal({ onClose }: { onClose: () => void }) {
  const { state, refreshUser } = useApp()
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<number | null>(null)
  const [claimResult, setClaimResult] = useState<{ milestone: number; reward: number; message: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMilestones()
  }, [])

  const fetchMilestones = async () => {
    try {
      setLoading(true)
      const userId = localStorage.getItem('userId')
      const res = await fetch(`/api/milestones?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setMilestones(data.milestones)
      }
    } catch (e) {
      console.error('Failed to fetch milestones:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (milestone: number) => {
    try {
      setClaiming(milestone)
      setError(null)
      const userId = localStorage.getItem('userId')
      const res = await fetch('/api/milestones/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, milestone }),
      })

      const data = await res.json()
      if (res.ok) {
        setClaimResult({ milestone, reward: data.reward, message: data.message })
        await fetchMilestones()
        await refreshUser()
      } else {
        setError(data.error || 'Failed to claim reward')
      }
    } catch (e) {
      setError('Something went wrong')
    } finally {
      setClaiming(null)
    }
  }

  const getMilestoneIcon = (count: number) => {
    if (count === 10) return '🎯'
    if (count === 15) return '⭐'
    if (count === 25) return '🏆'
    if (count === 75) return '💝'
    if (count === 100) return '💎'
    return '🎁'
  }

  const getMilestoneColor = (count: number) => {
    if (count === 10) return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' }
    if (count === 15) return { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' }
    if (count === 25) return { bg: '#D1FAE5', border: '#10B981', text: '#065F46' }
    if (count === 75) return { bg: '#FCE7F3', border: '#EC4899', text: '#9D174D' }
    if (count === 100) return { bg: '#EDE9FE', border: '#8B5CF6', text: '#5B21B6' }
    return { bg: '#F3F4F6', border: '#9CA3AF', text: '#374151' }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-[16px] w-full max-w-[480px] max-h-[85vh] overflow-y-auto z-10"
        style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#999999] hover:text-[#36383A] transition-colors z-10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#E2EAF1]">
          <div className="flex items-center gap-3">
            <div
              className="w-[44px] h-[44px] rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#F9CC28">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Survey Rewards</h2>
              <p className="text-[13px] text-[#999999]">Complete surveys to earn bonus gifts!</p>
            </div>
          </div>
        </div>

        {/* Success message */}
        {claimResult && (
          <div className="mx-6 mt-4 p-3 bg-[#D1FAE5] border border-[#10B981] rounded-[10px] flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="text-[13px] text-[#065F46] font-medium">{claimResult.message}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-[#FEF2F2] border border-[#EF4444] rounded-[10px] flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <p className="text-[13px] text-[#991B1B] font-medium">{error}</p>
          </div>
        )}

        {/* Milestones List */}
        <div className="p-6 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-[#2DD9B6] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            milestones.map((m) => {
              const colors = getMilestoneColor(m.milestone)
              const progressPercent = Math.min((m.progress / m.milestone) * 100, 100)

              return (
                <div
                  key={m.milestone}
                  className="rounded-[12px] border overflow-hidden transition-all"
                  style={{
                    borderColor: m.isClaimed ? '#10B981' : m.canClaim ? '#0FBCC0' : '#E2EAF1',
                    backgroundColor: m.isClaimed ? '#F0FDF4' : 'white',
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[22px]">{getMilestoneIcon(m.milestone)}</span>
                        <div>
                          <p className="text-[15px] font-bold text-[#36383A]">
                            {m.milestone} Surveys
                          </p>
                          <p className="text-[13px] text-[#999999]">
                            {m.isClaimed ? 'Claimed!' : m.isCompleted ? 'Completed - Ready to claim!' : `${m.milestone - m.progress} more to go`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-[18px] font-bold"
                          style={{ color: m.isClaimed ? '#10B981' : m.canClaim ? '#0FBCC0' : '#36383A' }}
                        >
                          ${m.reward.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-[#999999]">Gift Reward</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {!m.isClaimed && (
                      <div className="mb-3">
                        <div className="w-full bg-[#E2EAF1] rounded-full h-[6px] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progressPercent}%`,
                              background: m.canClaim
                                ? 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)'
                                : progressPercent > 50
                                  ? '#0FBCC0'
                                  : '#999999',
                            }}
                          />
                        </div>
                        <p className="text-[11px] text-[#999999] mt-1">{m.progress}/{m.milestone} completed</p>
                      </div>
                    )}

                    {/* Claim button */}
                    {m.canClaim && (
                      <button
                        onClick={() => handleClaim(m.milestone)}
                        disabled={claiming === m.milestone}
                        className="w-full h-[38px] rounded-[8px] text-[14px] font-semibold text-white transition-all disabled:opacity-50"
                        style={{
                          background: claiming === m.milestone
                            ? '#0FBCC0'
                            : 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)',
                        }}
                      >
                        {claiming === m.milestone ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Claiming...
                          </span>
                        ) : (
                          `Claim $${m.reward.toFixed(2)} Gift`
                        )}
                      </button>
                    )}

                    {/* Claimed badge */}
                    {m.isClaimed && (
                      <div className="flex items-center justify-center gap-1.5 h-[38px] rounded-[8px] bg-[#D1FAE5]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span className="text-[13px] font-semibold text-[#065F46]">Claimed</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Bottom note */}
        <div className="px-6 pb-6">
          <p className="text-[11px] text-[#999999] text-center">
            Rewards are added to your main balance instantly after claiming.
          </p>
        </div>
      </div>
    </div>
  )
}
