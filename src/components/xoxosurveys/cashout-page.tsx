'use client'

import { useApp } from '@/app/page'
import React, { useState, useEffect, useCallback } from 'react'

interface CashoutRecord {
  id: string
  giftCardType: string
  amount: number
  status: string
  createdAt: string
  processedAt: string | null
  reserveAmount?: number
  reserveStatus?: string
}

const giftCards = [
  {
    id: 'binance',
    name: 'Binance Pay',
    brand: 'Binance',
    brandLine2: 'Pay',
    subtext: 'Binance Pay (USDT)',
    min: 5,
    max: 100,
    bgStyle: { background: '#181A20' },
    brandColor: '#F0B90B',
    brand2Color: '#FFFFFF',
    subtextColor: 'rgba(255,255,255,0.80)',
    priceColor: 'rgba(255,255,255,0.70)',
    needsPaymentDetail: true,
    paymentLabel: 'Binance ID',
    paymentPlaceholder: 'Enter your Binance ID (e.g. 123456789)',
    paymentType: 'text' as const,
    icon: (
      <div className="w-[36px] h-[36px] rounded-full bg-[#F0B90B] flex items-center justify-center flex-shrink-0">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#181A20">
          <path d="M12 2L8.5 5.5L10 7L12 5L14 7L15.5 5.5L12 2ZM5.5 8.5L2 12L5.5 15.5L7 14L5 12L7 10L5.5 8.5ZM18.5 8.5L17 10L19 12L17 14L18.5 15.5L22 12L18.5 8.5ZM12 22L15.5 18.5L14 17L12 19L10 17L8.5 18.5L12 22ZM10 12L12 10L14 12L12 14L10 12Z" />
        </svg>
      </div>
    ),
  },
  {
    id: 'litecoin',
    name: 'Litecoin (LTC)',
    brand: 'Lite',
    brandLine2: 'coin',
    subtext: 'Litecoin Transfer',
    min: 5,
    max: 100,
    bgStyle: { background: 'linear-gradient(135deg, #345D9D, #2A4B80)' },
    brandColor: '#FFFFFF',
    brand2Color: '#FFFFFF',
    subtextColor: 'rgba(255,255,255,0.85)',
    priceColor: 'rgba(255,255,255,0.70)',
    needsPaymentDetail: true,
    paymentLabel: 'Litecoin Address',
    paymentPlaceholder: 'Enter your LTC wallet address (starts with L or M)',
    paymentType: 'text' as const,
    icon: (
      <div className="w-[36px] h-[36px] rounded-full bg-white flex items-center justify-center flex-shrink-0">
        <span className="text-[#345D9D] font-bold text-[16px]" style={{ fontFamily: 'var(--font-outfit)' }}>L</span>
      </div>
    ),
  },
  {
    id: 'paypal',
    name: 'PayPal Transfer',
    brand: 'Pay',
    brandLine2: 'Pal',
    subtext: 'PayPal Transfer',
    min: 5,
    max: 100,
    bgStyle: { background: '#003087' },
    brandColor: '#009CDE',
    brand2Color: '#012169',
    subtextColor: 'rgba(255,255,255,0.80)',
    priceColor: 'rgba(255,255,255,0.70)',
    needsPaymentDetail: true,
    paymentLabel: 'PayPal Email',
    paymentPlaceholder: 'Enter your PayPal email address',
    paymentType: 'email' as const,
    icon: null,
  },
  {
    id: 'amazon',
    name: 'Amazon Gift Card',
    brand: 'Amazon',
    brandLine2: '',
    subtext: 'Amazon Gift Card',
    min: 5,
    max: 50,
    bgStyle: { background: 'linear-gradient(135deg, #FF9900, #FF6600)' },
    brandColor: '#FFFFFF',
    brand2Color: '#FFFFFF',
    subtextColor: 'rgba(255,255,255,0.90)',
    priceColor: 'rgba(255,255,255,0.80)',
    needsPaymentDetail: false,
    icon: null,
  },
  {
    id: 'google-play',
    name: 'Google Play',
    brand: 'Google',
    brandLine2: 'Play',
    subtext: 'Google Play',
    min: 10,
    max: 50,
    bgStyle: { background: 'linear-gradient(135deg, #00BCD4, #009688)' },
    brandColor: '#FFFFFF',
    brand2Color: '#FFFFFF',
    subtextColor: 'rgba(255,255,255,0.90)',
    priceColor: 'rgba(255,255,255,0.80)',
    needsPaymentDetail: false,
    icon: null,
  },
]

// Gift card display names for cashout history
const giftCardDisplayNames: Record<string, string> = {
  'binance': 'Binance Pay',
  'litecoin': 'Litecoin (LTC)',
  'paypal': 'PayPal Transfer',
  'amazon': 'Amazon Gift Card',
  'google-play': 'Google Play',
}

// Status config for cashout history
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactElement }> = {
  pending: {
    label: 'Pending',
    color: '#D97706',
    bgColor: '#FFFBEB',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  approved: {
    label: 'Approved',
    color: '#059669',
    bgColor: '#ECFDF5',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  processed: {
    label: 'Processed',
    color: '#059669',
    bgColor: '#ECFDF5',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  rejected: {
    label: 'Declined',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  },
  flagged: {
    label: 'Under Review',
    color: '#EA580C',
    bgColor: '#FFF7ED',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  chargeback: {
    label: 'Chargeback',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
    ),
  },
}

// Reserve status config
const reserveStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  held: { label: 'Hold', color: '#D97706', bgColor: '#FFFBEB' },
  released: { label: 'Released', color: '#059669', bgColor: '#ECFDF5' },
  forfeited: { label: 'Forfeited', color: '#DC2626', bgColor: '#FEF2F2' },
}

export function CashoutPage() {
  const { state, setState } = useApp()
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [paymentDetail, setPaymentDetail] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [cashoutSuccess, setCashoutSuccess] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const [cashoutLoading, setCashoutLoading] = useState(false)
  const [cashoutError, setCashoutError] = useState<string | null>(null)

  // Cashout history state
  const [cashoutHistory, setCashoutHistory] = useState<CashoutRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  // Reserve calculation helper - Tiered formula: every $5 step adds $2 reserve
  // $0.01-$5.00 → $2 | $5.01-$10.00 → $4 | $10.01-$15.00 → $6 | etc.
  // This prevents gaming by withdrawing just under thresholds
  const calculateReserve = (withdrawalAmount: number): number => {
    if (withdrawalAmount <= 0) return 0
    return Math.ceil(withdrawalAmount / 5) * 2
  }

  const calculateTotalDeduction = (withdrawalAmount: number): number => {
    return withdrawalAmount + calculateReserve(withdrawalAmount)
  }

  // Available balance (total balance minus reserved)
  const availableBalance = state.user.balance - state.user.reservedBalance

  // Fetch cashout history
  const fetchCashoutHistory = useCallback(async () => {
    try {
      const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
      if (!storedUserId) return

      const res = await fetch(`/api/cashout/history?userId=${storedUserId}`)
      if (res.ok) {
        const data = await res.json()
        setCashoutHistory(data.cashouts || [])
      }
    } catch {
      // Silently fail
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCashoutHistory()
  }, [fetchCashoutHistory])

  // Refresh history after successful cashout
  useEffect(() => {
    if (cashoutSuccess) {
      fetchCashoutHistory()
    }
  }, [cashoutSuccess, fetchCashoutHistory])

  // Validate payment detail based on card type
  const isPaymentDetailValid = () => {
    if (!selectedCardData?.needsPaymentDetail) return true
    if (!paymentDetail.trim()) return false
    if (selectedCardData.id === 'paypal') {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paymentDetail.trim())
    }
    if (selectedCardData.id === 'binance') {
      return paymentDetail.trim().length >= 6
    }
    if (selectedCardData.id === 'litecoin') {
      return paymentDetail.trim().length >= 20
    }
    return paymentDetail.trim().length > 0
  }

  const displayedCards = showAll ? giftCards : giftCards.slice(0, 3)
  const selectedCardData = giftCards.find(c => c.id === selectedCard)

  const handleResendVerification = async () => {
    setResendLoading(true)
    setResendMessage(null)
    try {
      // Use stored userId (cuid) if available, otherwise fall back to email
      const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUserId || undefined,
          email: state.user.email,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setResendMessage('Verification email sent! Check your inbox and spam folder.')
      } else {
        setResendMessage(data.error || 'Failed to send verification email')
      }
    } catch {
      setResendMessage('Failed to send verification email. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleCashout = async () => {
    const amountNum = parseFloat(amount)
    const totalDeduction = calculateTotalDeduction(amountNum)
    if (!amountNum || totalDeduction > state.user.balance) return

    setCashoutLoading(true)
    setCashoutError(null)

    try {
      const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null
      if (!storedUserId) {
        setCashoutError('Session expired. Please log in again.')
        return
      }

      const res = await fetch('/api/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: storedUserId,
          giftCardType: selectedCard,
          amount: amountNum,
          paymentDetail: selectedCardData?.needsPaymentDetail ? paymentDetail.trim() : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setCashoutError(data.error || 'Cashout request failed')
        return
      }

      // Update user balance and reserved balance in state
      setState(prev => ({
        ...prev,
        user: {
          ...prev.user,
          balance: data.newBalance ?? prev.user.balance - totalDeduction,
          reservedBalance: data.newReservedBalance ?? prev.user.reservedBalance + calculateReserve(amountNum),
        },
      }))

      setCashoutSuccess(true)
      setTimeout(() => {
        setCashoutSuccess(false)
        setSelectedCard(null)
        setAmount('')
        setPaymentDetail('')
        setShowConfirm(false)
      }, 3000)
    } catch {
      setCashoutError('Network error. Please try again.')
    } finally {
      setCashoutLoading(false)
    }
  }

  // Format date for display
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

  // Current amount for validation
  const amountNum = parseFloat(amount) || 0
  const reserveAmount = calculateReserve(amountNum)
  const totalDeduction = calculateTotalDeduction(amountNum)

  if (cashoutSuccess) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div
          className="w-[80px] h-[80px] rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 className="text-[24px] font-bold text-[#36383A] mb-2" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Cashout Requested!</h2>
        <p className="text-[#999999] text-[16px]">Your payment will be processed within 24-48 hours.</p>
        {reserveAmount > 0 && (
          <p className="text-[#D97706] text-[14px] mt-2">
            ${reserveAmount.toFixed(2)} reserve amount is on hold and will be released by admin after approval.
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
          Select a Gift Card
        </h1>
        <p className="text-[14px] text-[#999999] mt-1">
          Available: <span className="text-[#0FBCC0] font-bold">${availableBalance.toFixed(2)}</span>
          {state.user.reservedBalance > 0 && (
            <>
              {' '}| Reserved: <span className="text-[#D97706] font-bold">${state.user.reservedBalance.toFixed(2)}</span>
            </>
          )}
        </p>
      </div>

      {/* Reserve Info Banner */}
      <div
        className="mb-6 rounded-[12px] border border-[#F59E0B]/20 p-4"
        style={{ background: '#FFFBEB', boxShadow: '0px 4px 20px 0px rgba(245, 158, 11, 0.06)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-[32px] h-[32px] rounded-full bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-[#92400E] mb-1">Reserve Amount Policy</h3>
            <p className="text-[13px] text-[#78350F]">
              A tiered reserve is held based on your withdrawal amount: $2 per $5 step.
              $0.01-$5.00 requires $2 reserve. $5.01-$10.00 requires $4 reserve. $10.01-$15.00 requires $6 reserve, and so on.
              The reserve will be released by admin after approval.
              Example: $5 withdraw needs $7 balance ($5 + $2). $10 withdraw needs $14 balance ($10 + $4).
            </p>
          </div>
        </div>
      </div>

      {/* Email Verification Required Banner */}
      {!state.user.emailVerified && (
        <div
          className="mb-6 rounded-[12px] border border-[#F59E0B]/30 p-5"
          style={{ background: '#FFFBEB', boxShadow: '0px 4px 20px 0px rgba(245, 158, 11, 0.08)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-[40px] h-[40px] rounded-full bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] font-bold text-[#92400E] mb-1">Email Verification Required</h3>
              <p className="text-[14px] text-[#78350F] mb-3">
                You must verify your email address before you can cash out. We sent a verification link to <span className="font-semibold">{state.user.email}</span>.
              </p>
              {resendMessage && (
                <p className={`text-[13px] mb-2 ${resendMessage.includes('sent') ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                  {resendMessage}
                </p>
              )}
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="h-[38px] px-5 rounded-[8px] text-[14px] font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
              >
                {resendLoading ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {!selectedCard ? (
        <>
          {/* Gift Cards - exact dark backgrounds, 12px radius, min-height 120px */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[12px]">
            {displayedCards.map((card) => (
              <button
                key={card.id}
                onClick={() => !state.user.emailVerified ? null : setSelectedCard(card.id)}
                disabled={!state.user.emailVerified}
                className={`rounded-[12px] p-5 text-left transition-all min-h-[120px] flex flex-col justify-between border-0 outline-none ${
                  !state.user.emailVerified ? 'opacity-50 cursor-not-allowed' : 'hover:scale-[1.03]'
                }`}
                style={{
                  ...card.bgStyle,
                  boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)',
                }}
              >
                <div>
                  {card.icon && <div className="mb-3">{card.icon}</div>}
                  <h3 className="text-[18px] font-bold" style={{ color: card.brandColor }}>{card.brand}</h3>
                  {card.brandLine2 && (
                    <span className="text-[24px] font-bold" style={{ color: card.brand2Color }}>{card.brandLine2}</span>
                  )}
                </div>
                <div>
                  <p className="text-[12px] mt-2" style={{ color: card.subtextColor }}>{card.subtext}</p>
                  <p className="text-[12px]" style={{ color: card.priceColor }}>{card.min}-{card.max} $</p>
                </div>
              </button>
            ))}

            {/* Show All Card */}
            {!showAll && giftCards.length > 3 && (
              <button
                onClick={() => !state.user.emailVerified ? null : setShowAll(true)}
                disabled={!state.user.emailVerified}
                className={`bg-white border border-[#E2EAF1] rounded-[12px] p-5 flex flex-col items-center justify-center transition-colors min-h-[120px] ${
                  !state.user.emailVerified ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#F9FAFB]'
                }`}
                style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
              >
                <div
                  className="w-[40px] h-[40px] rounded-full flex items-center justify-center mb-2"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </div>
                <p className="text-[14px] text-[#4B4B4B] font-medium">Show all gift cards</p>
                <p className="text-[12px] text-[#999999]">+{giftCards.length - 3} available</p>
              </button>
            )}
          </div>

          {/* ===== CASHOUT HISTORY SECTION ===== */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              <h2 className="text-[16px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                Cashout History
              </h2>
            </div>

            {/* Loading State */}
            {historyLoading && (
              <div className="bg-white rounded-[12px] border border-[#E2EAF1] p-6 animate-pulse" style={{ boxShadow: '0px 4px 20px 0px rgba(191,197,209,0.20)' }}>
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-[40px] h-[40px] rounded-full bg-[#F0F2F5]" />
                        <div>
                          <div className="h-4 bg-[#F0F2F5] rounded w-24 mb-2" />
                          <div className="h-3 bg-[#F0F2F5] rounded w-32" />
                        </div>
                      </div>
                      <div className="h-6 bg-[#F0F2F5] rounded-full w-20" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cashout History List */}
            {!historyLoading && cashoutHistory.length > 0 && (
              <div className="bg-white rounded-[12px] border border-[#E2EAF1] overflow-hidden" style={{ boxShadow: '0px 4px 20px 0px rgba(191,197,209,0.20)' }}>
                <div className="divide-y divide-[#F0F2F5]">
                  {cashoutHistory.map((record) => {
                    const status = statusConfig[record.status] || statusConfig.pending
                    const recordReserve = record.reserveAmount || calculateReserve(record.amount)
                    return (
                      <div key={record.id} className="p-4 flex items-center gap-3 hover:bg-[#FAFBFC] transition-colors">
                        {/* Gift Card Type Icon */}
                        <div
                          className="w-[40px] h-[40px] rounded-full flex items-center justify-center flex-shrink-0 text-white text-[14px] font-bold"
                          style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                        >
                          $
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[14px] font-semibold text-[#36383A] truncate">
                              {giftCardDisplayNames[record.giftCardType] || record.giftCardType}
                            </p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <p className="text-[14px] font-bold text-[#36383A]">
                                ${record.amount.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <p className="text-[12px] text-[#999999]">
                              {formatDate(record.createdAt)}
                            </p>
                            <div className="flex items-center gap-2">
                              {recordReserve > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5"
                                  style={{
                                    color: reserveStatusConfig[record.reserveStatus || 'held']?.color || '#D97706',
                                    background: reserveStatusConfig[record.reserveStatus || 'held']?.bgColor || '#FFFBEB',
                                  }}
                                >
                                  Reserve: ${recordReserve.toFixed(2)}
                                </span>
                              )}
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold rounded-full px-2.5 py-0.5 flex-shrink-0"
                                style={{ color: status.color, background: status.bgColor }}
                              >
                                {status.icon}
                                {status.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!historyLoading && cashoutHistory.length === 0 && (
              <div className="bg-white rounded-[12px] border border-[#E2EAF1] p-8 text-center" style={{ boxShadow: '0px 4px 20px 0px rgba(191,197,209,0.20)' }}>
                <div
                  className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </div>
                <p className="text-[14px] text-[#999999]">No cashout history yet. Request your first cashout above!</p>
              </div>
            )}
          </div>

          {/* ===== RESERVED BALANCE SECTION ===== */}
          {state.user.reservedBalance > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <h2 className="text-[16px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                  Reserved Balance
                </h2>
                <span className="text-[14px] font-bold text-[#D97706] ml-auto">${state.user.reservedBalance.toFixed(2)}</span>
              </div>

              <div className="bg-white rounded-[12px] border border-[#E2EAF1] overflow-hidden" style={{ boxShadow: '0px 4px 20px 0px rgba(191,197,209,0.20)' }}>
                <div className="divide-y divide-[#F0F2F5]">
                  {cashoutHistory
                    .filter((record) => (record.reserveAmount || calculateReserve(record.amount)) > 0)
                    .map((record) => {
                      const recordReserve = record.reserveAmount || calculateReserve(record.amount)
                      const rs = reserveStatusConfig[record.reserveStatus || 'held'] || reserveStatusConfig.held
                      return (
                        <div key={record.id} className="p-4 flex items-center gap-3 hover:bg-[#FAFBFC] transition-colors">
                          <div
                            className="w-[36px] h-[36px] rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: rs.bgColor }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={rs.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[13px] font-semibold text-[#36383A] truncate">
                                {giftCardDisplayNames[record.giftCardType] || record.giftCardType}
                              </p>
                              <p className="text-[13px] font-bold text-[#D97706] flex-shrink-0">
                                ${recordReserve.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1">
                              <p className="text-[11px] text-[#999999]">
                                Withdrawal: ${record.amount.toFixed(2)} | {formatDate(record.createdAt)}
                              </p>
                              <span
                                className="inline-flex items-center text-[10px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0"
                                style={{ color: rs.color, background: rs.bgColor }}
                              >
                                {rs.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  {cashoutHistory.filter((record) => (record.reserveAmount || calculateReserve(record.amount)) > 0).length === 0 && (
                    <div className="p-6 text-center">
                      <p className="text-[13px] text-[#999999]">No reserves on hold. Your reserves will appear here after a cashout.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Selected Card - Amount Form */
        <div className="max-w-[400px]">
          <button
            onClick={() => { setSelectedCard(null); setAmount(''); setPaymentDetail(''); setShowConfirm(false) }}
            className="flex items-center gap-2 text-[14px] text-[#999999] hover:text-[#36383A] mb-4 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to gift cards
          </button>

          <div
            className="rounded-[12px] p-6 mb-6"
            style={{
              ...selectedCardData?.bgStyle,
              boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)',
            }}
          >
            <h3 className="text-[22px] font-bold" style={{ color: selectedCardData?.brandColor }}>{selectedCardData?.brand}</h3>
            {selectedCardData?.brandLine2 && (
              <span className="text-[22px] font-bold" style={{ color: selectedCardData?.brand2Color }}>{selectedCardData?.brandLine2}</span>
            )}
            <p className="text-[14px] mt-1" style={{ color: selectedCardData?.subtextColor }}>{selectedCardData?.name}</p>
          </div>

          <div
            className="bg-white rounded-[12px] border border-[#E2EAF1] p-6"
            style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
          >
            <label className="block text-[14px] font-medium text-[#36383A] mb-2">
              Amount (${selectedCardData?.min}-${selectedCardData?.max})
            </label>
            <div className="relative mb-2">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999999] text-[14px] font-medium pointer-events-none">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Enter amount (${selectedCardData?.min}-${selectedCardData?.max})`}
                min={selectedCardData?.min}
                max={Math.min(selectedCardData?.max || 50, availableBalance)}
                className="xoxo-input"
                style={{ paddingLeft: '32px' }}
              />
            </div>

            {/* Reserve Amount Info */}
            {amountNum > 0 && (
              <div className="mb-4 p-3 rounded-[8px] border border-[#F59E0B]/20" style={{ background: '#FFFBEB' }}>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#78350F]">Withdrawal:</span>
                  <span className="font-medium text-[#36383A]">${amountNum.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px] mt-1">
                  <span className="text-[#78350F]">Reserve:</span>
                  <span className="font-medium text-[#D97706]">${reserveAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-[13px] mt-1 pt-1 border-t border-[#F59E0B]/20">
                  <span className="text-[#78350F] font-medium">Total Deduction:</span>
                  <span className="font-bold text-[#36383A]">${totalDeduction.toFixed(2)}</span>
                </div>
                {totalDeduction > state.user.balance && (
                  <p className="text-[12px] text-[#DC2626] mt-2">
                    Insufficient balance. You need ${totalDeduction.toFixed(2)} (Withdrawal: ${amountNum.toFixed(2)} + Reserve: ${reserveAmount.toFixed(2)})
                  </p>
                )}
              </div>
            )}

            {/* Quick Amount Buttons with reserve info */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {[5, 10, 25, 50].map((val) => {
                const isActive = amount === val.toString()
                const valReserve = calculateReserve(val)
                const valTotal = val + valReserve
                return (
                  <button
                    key={val}
                    onClick={() => setAmount(val.toString())}
                    className="py-2.5 rounded-[8px] text-[14px] font-medium transition-all text-center"
                    style={{
                      background: isActive
                        ? 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)'
                        : '#F5F5F5',
                      color: isActive ? '#FFFFFF' : '#4B4B4B',
                      border: isActive ? 'none' : '1px solid #E2EAF1',
                    }}
                  >
                    <div>${val}</div>
                    <div className={`text-[10px] ${isActive ? 'text-white/80' : 'text-[#999999]'}`}>
                      Reserve: ${valReserve} (Need: ${valTotal})
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Payment Detail Input - Binance ID / Litecoin Address / PayPal Email */}
            {selectedCardData?.needsPaymentDetail && (
              <div className="mb-6">
                <label className="block text-[14px] font-medium text-[#36383A] mb-2">
                  {selectedCardData.paymentLabel}
                </label>
                <input
                  type={selectedCardData.paymentType || 'text'}
                  value={paymentDetail}
                  onChange={(e) => setPaymentDetail(e.target.value)}
                  placeholder={selectedCardData.paymentPlaceholder}
                  className="xoxo-input"
                />
                {paymentDetail && !isPaymentDetailValid() && (
                  <p className="text-[12px] text-[#DC2626] mt-1.5">
                    {selectedCardData.id === 'paypal' && 'Please enter a valid email address'}
                    {selectedCardData.id === 'binance' && 'Binance ID must be at least 6 characters'}
                    {selectedCardData.id === 'litecoin' && 'Litecoin address must be at least 20 characters'}
                  </p>
                )}
              </div>
            )}

            {!showConfirm ? (
              <button
                onClick={() => {
                  if (!state.user.emailVerified) return
                  if (!isPaymentDetailValid()) return
                  const amountNum = parseFloat(amount)
                  const totalDed = calculateTotalDeduction(amountNum)
                  if (amountNum && amountNum >= (selectedCardData?.min || 5) && totalDed <= state.user.balance) {
                    setShowConfirm(true)
                  }
                }}
                disabled={!state.user.emailVerified || !amount || totalDeduction > state.user.balance || amountNum < (selectedCardData?.min || 5) || !isPaymentDetailValid()}
                className="xoxo-btn-primary w-full h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!state.user.emailVerified ? 'Verify Email First' : !isPaymentDetailValid() && selectedCardData?.needsPaymentDetail ? `Enter ${selectedCardData?.paymentLabel}` : totalDeduction > state.user.balance ? `Need $${totalDeduction.toFixed(2)}` : 'Continue'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-[#F9FAFB] rounded-[12px] p-4 border border-[#E2EAF1]">
                  <div className="flex justify-between text-[14px] mb-1">
                    <span className="text-[#999999]">Gift Card</span>
                    <span className="font-medium text-[#36383A]">{selectedCardData?.name}</span>
                  </div>
                  <div className="flex justify-between text-[14px] mb-1">
                    <span className="text-[#999999]">Withdrawal Amount</span>
                    <span className="font-medium text-[#36383A]">${amountNum.toFixed(2)}</span>
                  </div>
                  {reserveAmount > 0 && (
                    <div className="flex justify-between text-[14px] mb-1">
                      <span className="text-[#999999]">Reserve Amount</span>
                      <span className="font-medium text-[#D97706]">${reserveAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[14px] mb-1 pt-1 border-t border-[#E2EAF1]">
                    <span className="text-[#999999] font-medium">Total Deduction</span>
                    <span className="font-bold text-[#36383A]">${totalDeduction.toFixed(2)}</span>
                  </div>
                  {selectedCardData?.needsPaymentDetail && paymentDetail && (
                    <div className="flex justify-between text-[14px]">
                      <span className="text-[#999999]">{selectedCardData.paymentLabel}</span>
                      <span className="font-medium text-[#36383A] truncate ml-3 max-w-[200px]">{paymentDetail}</span>
                    </div>
                  )}
                </div>
                {reserveAmount > 0 && (
                  <div className="p-3 rounded-[8px] border border-[#F59E0B]/20" style={{ background: '#FFFBEB' }}>
                    <div className="flex items-start gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                      <p className="text-[12px] text-[#78350F]">
                        Reserve amount of ${reserveAmount.toFixed(2)} will be on hold and released by admin after approval.
                      </p>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleCashout}
                  disabled={cashoutLoading}
                  className="xoxo-btn-primary w-full h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cashoutLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Confirm Cashout'
                  )}
                </button>
                {cashoutError && (
                  <p className="text-[13px] text-[#DC2626] text-center mt-2">{cashoutError}</p>
                )}
                <button
                  onClick={() => setShowConfirm(false)}
                  className="w-full bg-[#F5F5F5] hover:bg-[#EAEAEA] text-[#4B4B4B] font-medium py-2.5 rounded-[8px] transition-colors text-[14px]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
