'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/app/page'

interface EarningEntry {
  id: string
  type: 'survey' | 'milestone' | 'referral'
  provider: string
  providerLabel: string
  amount: number
  timeSpent: number | null
  timeMinutes: number | null
  offerId: string | null
  surveyTitle: string | null
  createdAt: string
}

interface EarningsData {
  balance: number
  reservedBalance: number
  totalEarned: number
  surveysCompleted: number
  summary: {
    surveyEarnings: number
    milestoneEarnings: number
    referralEarnings: number
  }
  earnings: EarningEntry[]
}

export function EarningsHistoryModal({ onClose }: { onClose: () => void }) {
  const { state } = useApp()
  const [data, setData] = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'survey' | 'milestone' | 'referral'>('all')

  useEffect(() => {
    fetchEarnings()
  }, [])

  const fetchEarnings = async () => {
    try {
      setLoading(true)
      const userId = localStorage.getItem('userId')
      const res = await fetch(`/api/user/earnings?userId=${userId}`)
      if (res.ok) {
        const d = await res.json()
        setData(d)
      }
    } catch (e) {
      console.error('Failed to fetch earnings:', e)
    } finally {
      setLoading(false)
    }
  }

  const filteredEarnings = data?.earnings.filter(e => filter === 'all' || e.type === filter) || []

  // Time ago helper
  const timeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  // Format date helper
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Provider color mapping
  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'revtoo': return { bg: '#F0FDFB', border: '#0FBCC0', text: '#0FBCC0' }
      case 'cpx-research': return { bg: '#EDE9FE', border: '#8B5CF6', text: '#7C3AED' }
      case 'bitlabs': return { bg: '#FCE7F3', border: '#EC4899', text: '#DB2777' }
      case 'inbrain': return { bg: '#EFF6FF', border: '#3B82F6', text: '#2563EB' }
      case 'internal': return { bg: '#F0FDF4', border: '#10B981', text: '#059669' }
      case 'milestone': return { bg: '#FFF8E1', border: '#F59E0B', text: '#D97706' }
      case 'referral': return { bg: '#E8F5E9', border: '#22C55E', text: '#16A34A' }
      default: return { bg: '#F9FAFB', border: '#9CA3AF', text: '#6B7280' }
    }
  }

  // Type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'survey':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        )
      case 'milestone':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#F9CC28" stroke="#F9CC28" strokeWidth="1">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )
      case 'referral':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
          </svg>
        )
      default: return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-[16px] w-full max-w-[520px] max-h-[85vh] overflow-hidden z-10 flex flex-col"
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
        <div className="p-6 pb-4 border-b border-[#E2EAF1] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-[44px] h-[44px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Earnings History</h2>
              <p className="text-[13px] text-[#999999]">Track all your earnings and rewards</p>
            </div>
          </div>

          {/* Balance Summary */}
          {data && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="bg-[#F9FAFB] rounded-[10px] p-3 text-center">
                <p className="text-[11px] text-[#999999] mb-0.5">Balance</p>
                <p className="text-[16px] font-bold text-[#36383A]">${data.balance.toFixed(2)}</p>
              </div>
              <div className="bg-[#F9FAFB] rounded-[10px] p-3 text-center">
                <p className="text-[11px] text-[#999999] mb-0.5">Total Earned</p>
                <p className="text-[16px] font-bold text-[#0FBCC0]">${data.totalEarned.toFixed(2)}</p>
              </div>
              <div className="bg-[#F9FAFB] rounded-[10px] p-3 text-center">
                <p className="text-[11px] text-[#999999] mb-0.5">Surveys</p>
                <p className="text-[16px] font-bold text-[#36383A]">{data.surveysCompleted}</p>
              </div>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 pb-2 flex-shrink-0">
          {[
            { key: 'all' as const, label: 'All' },
            { key: 'survey' as const, label: 'Surveys' },
            { key: 'milestone' as const, label: 'Milestones' },
            { key: 'referral' as const, label: 'Referrals' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                filter === tab.key
                  ? 'bg-[#0FBCC0] text-white'
                  : 'bg-[#F5F5F5] text-[#666666] hover:bg-[#E5E7EB]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Earnings List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6" style={{ scrollbarWidth: 'thin', scrollbarColor: '#0FBCC0 transparent' }}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-3 border-[#2DD9B6] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredEarnings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div
                className="w-[56px] h-[56px] rounded-full flex items-center justify-center mb-3"
                style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <p className="text-[14px] font-medium text-[#999999]">No earnings yet</p>
              <p className="text-[12px] text-[#BBBBBB] mt-1">Complete surveys to start earning!</p>
            </div>
          ) : (
            <div className="space-y-2 pt-1">
              {filteredEarnings.map((entry) => {
                const colors = getProviderColor(entry.provider)
                return (
                  <div
                    key={entry.id}
                    className="rounded-[12px] border border-[#E2EAF1] p-3.5 hover:shadow-sm transition-all bg-white"
                  >
                    <div className="flex items-start gap-3">
                      {/* Type Icon */}
                      <div
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: colors.bg, color: colors.text }}
                      >
                        {getTypeIcon(entry.type)}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-[14px] font-semibold text-[#36383A] truncate">
                              {entry.surveyTitle || entry.providerLabel}
                            </p>
                          </div>
                          <p className="text-[16px] font-bold text-[#10B981] flex-shrink-0">
                            +${entry.amount.toFixed(2)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {/* Provider Badge */}
                          <span
                            className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}30` }}
                          >
                            {entry.providerLabel}
                          </span>

                          {/* Time spent */}
                          {entry.timeMinutes !== null && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-[#666666]">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                              </svg>
                              {entry.timeMinutes} min
                            </span>
                          )}

                          {/* Offer ID */}
                          {entry.offerId && (
                            <span className="text-[10px] text-[#999999]">
                              #{entry.offerId}
                            </span>
                          )}

                          {/* Date */}
                          <span className="text-[10px] text-[#999999]" title={formatDate(entry.createdAt)}>
                            {timeAgo(entry.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Bottom note */}
        <div className="px-6 py-3 border-t border-[#E2EAF1] flex-shrink-0">
          <p className="text-[10px] text-[#999999] text-center">
            Shows earnings from the last 100 transactions. All amounts in USD.
          </p>
        </div>
      </div>
    </div>
  )
}
