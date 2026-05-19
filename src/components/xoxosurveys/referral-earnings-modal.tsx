'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/app/page'

interface ReferralRecord {
  id: string
  referredEmail: string
  surveyReward: number
  referralPercent: number
  referralAmount: number
  status: string
  createdAt: string
}

interface ReferredUser {
  id: string
  email: string
  surveysCompleted: number
  createdAt: string
}

interface ReferralData {
  inviteCode: string
  friendsInvited: number
  referralEarnings: number
  totalReferralEarnings: number
  referralRecords: ReferralRecord[]
  referredUsers: ReferredUser[]
}

export function ReferralEarningsModal({ onClose }: { onClose: () => void }) {
  const { state } = useApp()
  const [data, setData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<'earnings' | 'friends'>('earnings')

  useEffect(() => {
    fetchReferrals()
  }, [])

  const fetchReferrals = async () => {
    try {
      setLoading(true)
      const userId = localStorage.getItem('userId')
      const res = await fetch(`/api/referrals?userId=${userId}`)
      if (res.ok) {
        const referralData = await res.json()
        setData(referralData)
      }
    } catch (e) {
      console.error('Failed to fetch referrals:', e)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(state.user.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const maskEmail = (email: string) => {
    const [user, domain] = email.split('@')
    if (!user || !domain) return email
    if (user.length <= 2) return email
    return user[0] + '***@' + domain
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
            <div className="w-[44px] h-[44px] rounded-full flex items-center justify-center bg-[#E8F5E9]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Referral Earnings</h2>
              <p className="text-[13px] text-[#999999]">10% auto-credited for every survey</p>
            </div>
          </div>

          {/* Earnings summary */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-[#E8F5E9] rounded-[10px] p-4 text-center">
              <p className="text-[12px] text-[#4CAF50] font-medium">Total Earned</p>
              <p className="text-[22px] font-bold text-[#2E7D32]">${(data?.referralEarnings ?? state.user.referralEarnings).toFixed(2)}</p>
              <p className="text-[10px] text-[#81C784]">Auto-credited to balance</p>
            </div>
            <div className="bg-[#F9FAFB] rounded-[10px] p-4 text-center">
              <p className="text-[12px] text-[#999999] font-medium">Friends Invited</p>
              <p className="text-[22px] font-bold text-[#36383A]">{data?.friendsInvited ?? state.user.friendsInvited}</p>
              <p className="text-[10px] text-[#BFBFBF]">Active referrals</p>
            </div>
          </div>
        </div>

        {/* Auto-credit notice */}
        <div className="mx-6 mt-4">
          <div className="bg-[#F0FDF4] border border-[#86EFAC] rounded-[10px] p-3 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p className="text-[12px] text-[#166534] font-medium">
              Referral earnings are automatically added to your balance!
            </p>
          </div>
        </div>

        {/* Invite Code */}
        <div className="px-6 mt-4">
          <h3 className="text-[14px] font-semibold text-[#36383A] mb-2">Your Invite Code</h3>
          <div className="flex gap-2">
            <div className="flex-1 bg-[#F9FAFB] border border-[#E2EAF1] rounded-[8px] px-4 py-2.5 text-[14px] font-mono text-[#36383A]">
              {state.user.inviteCode}
            </div>
            <button
              onClick={handleCopy}
              className="px-4 rounded-[8px] text-[14px] font-medium text-white transition-all"
              style={{
                background: copied
                  ? '#0FBCC0'
                  : 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="px-6 mt-4">
          <h3 className="text-[14px] font-semibold text-[#36383A] mb-2">How it works</h3>
          <ul className="space-y-1.5">
            <li className="flex items-start gap-2 text-[13px] text-[#4B4B4B]">
              <span className="text-[#0FBCC0] mt-0.5">&#8226;</span>
              Share your invite code with friends
            </li>
            <li className="flex items-start gap-2 text-[13px] text-[#4B4B4B]">
              <span className="text-[#0FBCC0] mt-0.5">&#8226;</span>
              When they complete surveys, you earn 10% commission
            </li>
            <li className="flex items-start gap-2 text-[13px] text-[#4B4B4B]">
              <span className="text-[#0FBCC0] mt-0.5">&#8226;</span>
              Earnings are automatically added to your balance
            </li>
          </ul>
        </div>

        {/* Tabs */}
        <div className="px-6 mt-4">
          <div className="flex border-b border-[#E2EAF1]">
            <button
              onClick={() => setActiveTab('earnings')}
              className={`flex-1 pb-2 text-[13px] font-semibold transition-colors ${
                activeTab === 'earnings'
                  ? 'text-[#0FBCC0] border-b-2 border-[#0FBCC0]'
                  : 'text-[#999999] hover:text-[#36383A]'
              }`}
            >
              Earnings History
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 pb-2 text-[13px] font-semibold transition-colors ${
                activeTab === 'friends'
                  ? 'text-[#0FBCC0] border-b-2 border-[#0FBCC0]'
                  : 'text-[#999999] hover:text-[#36383A]'
              }`}
            >
              Referred Friends
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-[#2DD9B6] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'earnings' ? (
            data?.referralRecords && data.referralRecords.length > 0 ? (
              <div className="space-y-2">
                {data.referralRecords.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-[8px]">
                    <div>
                      <p className="text-[13px] font-medium text-[#36383A]">{maskEmail(record.referredEmail)}</p>
                      <p className="text-[11px] text-[#999999]">
                        {new Date(record.createdAt).toLocaleDateString()} · Survey earned ${record.surveyReward.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-bold text-[#2E7D32]">+${record.referralAmount.toFixed(2)}</p>
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#D1FAE5] text-[#065F46]">
                        Auto-credited
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E2EAF1" strokeWidth="1.5" className="mx-auto mb-3">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="8.5" cy="7" r="4" />
                  <line x1="20" y1="8" x2="20" y2="14" />
                  <line x1="23" y1="11" x2="17" y2="11" />
                </svg>
                <p className="text-[14px] text-[#999999]">No referral earnings yet</p>
                <p className="text-[12px] text-[#BFBFBF] mt-1">Share your invite code to start earning!</p>
              </div>
            )
          ) : (
            data?.referredUsers && data.referredUsers.length > 0 ? (
              <div className="space-y-2">
                {data.referredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-[#F9FAFB] rounded-[8px]">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white text-[12px] font-bold"
                        style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                      >
                        {user.email[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-[#36383A]">{maskEmail(user.email)}</p>
                        <p className="text-[11px] text-[#999999]">Joined {new Date(user.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-semibold text-[#0FBCC0]">{user.surveysCompleted} surveys</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E2EAF1" strokeWidth="1.5" className="mx-auto mb-3">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <p className="text-[14px] text-[#999999]">No referred friends yet</p>
                <p className="text-[12px] text-[#BFBFBF] mt-1">Share your code to invite friends!</p>
              </div>
            )
          )}
        </div>

        {/* Bottom note */}
        <div className="px-6 pb-6">
          <p className="text-[11px] text-[#999999] text-center">
            You earn 10% commission for every survey your referred friends complete. Earnings are automatically added to your balance.
          </p>
        </div>
      </div>
    </div>
  )
}
