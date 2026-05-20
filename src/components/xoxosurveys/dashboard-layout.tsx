'use client'

import { useApp } from '@/app/page'
import { SurveysPage } from './surveys-page'
import { CashoutPage } from './cashout-page'
import { LeaderboardPage } from './leaderboard-page'
import { SettingsPage } from './settings-page'
import { HelpPage } from './help-page'
import { FingerprintCollector } from './fingerprint-collector'
import { MilestonesModal } from './milestones-modal'
import { ReferralEarningsModal } from './referral-earnings-modal'
import { EarningsHistoryModal } from './earnings-history-modal'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useTelegramUsername } from '@/hooks/use-telegram-username'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  iconType: string
  offerwall: string | null
  rewardAmount: number | null
  createdAt: string
}

// Toast notification for immediate feedback
interface ToastNotification {
  id: string
  title: string
  message: string
  rewardAmount?: number
  offerwall?: string
}

const sidebarItems = [
  { id: 'surveys' as const, label: 'Surveys', icon: 'survey' },
  { id: 'cashout' as const, label: 'Cashout', icon: 'cashout' },
  { id: 'invite' as const, label: 'Invite Friends', icon: 'invite' },
  { id: 'leaderboard' as const, label: 'Leaderboard', icon: 'leaderboard' },
  { id: 'settings' as const, label: 'Settings', icon: 'settings' },
  { id: 'help' as const, label: 'Help', icon: 'help' },
]

function SidebarIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? '#0FBCC0' : '#36383A'
  const weight = active ? 2 : 1.5
  switch (type) {
    case 'survey':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      )
    case 'cashout':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    case 'settings':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    case 'help':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'logout':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      )
    case 'invite':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      )
    case 'leaderboard':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 6 9 6 9z" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 18 9 18 9z" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      )
    case 'admin':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    default:
      return null
  }
}

export function DashboardLayout() {
  const { state, setCurrentPage, logout, refreshUser } = useApp()
  const telegramUsername = useTelegramUsername()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showMilestonesModal, setShowMilestonesModal] = useState(false)
  const [showReferralModal, setShowReferralModal] = useState(false)
  const [showEarningsModal, setShowEarningsModal] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [bannerData, setBannerData] = useState<{ enabled: boolean; message: string; type: string } | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingRead, setMarkingRead] = useState(false)
  const [toastNotif, setToastNotif] = useState<ToastNotification | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const isUnderReview = state.user.isUnderReview && state.user.role !== 'admin'

  // Show toast notification with auto-dismiss
  const showToast = useCallback((toast: ToastNotification) => {
    setToastNotif(toast)
    setTimeout(() => setToastNotif(null), 5000) // Auto-dismiss after 5 seconds
  }, [])

  // Review overlay contact form state
  const [showReviewContact, setShowReviewContact] = useState(false)
  const [reviewContactForm, setReviewContactForm] = useState({
    name: '',
    email: '',
    message: '',
  })
  const [reviewContactSending, setReviewContactSending] = useState(false)
  const [reviewContactSent, setReviewContactSent] = useState(false)
  const [reviewContactError, setReviewContactError] = useState<string | null>(null)

  // Pre-fill contact form when user data is available
  useEffect(() => {
    if (state.user.email) {
      setReviewContactForm(prev => ({
        ...prev,
        name: prev.name || `${state.user.firstname || ''} ${state.user.lastname || ''}`.trim(),
        email: prev.email || state.user.email || '',
      }))
    }
  }, [state.user.email, state.user.firstname, state.user.lastname])

  const handleReviewContactSubmit = async () => {
    setReviewContactSending(true)
    setReviewContactError(null)
    try {
      const userId = localStorage.getItem('userId')
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reviewContactForm.name,
          email: reviewContactForm.email,
          message: reviewContactForm.message,
          userId: userId || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setReviewContactSent(true)
        setReviewContactForm(prev => ({ ...prev, message: '' }))
        setTimeout(() => setReviewContactSent(false), 4000)
      } else {
        setReviewContactError(data.error || 'Failed to send message. Please try again.')
      }
    } catch {
      setReviewContactError('Network error. Please check your connection and try again.')
    } finally {
      setReviewContactSending(false)
    }
  }

  // Fetch notifications - with improved error handling and toast trigger
  const fetchNotifications = useCallback(async (showRewardToast = false) => {
    try {
      const userId = localStorage.getItem('userId')
      if (!userId) return
      const res = await fetch(`/api/notifications?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        const newNotifications = data.notifications || []
        const newUnreadCount = data.unreadCount || 0

        // If this was triggered by a balance change (survey completion),
        // check if there's a new notification we haven't seen yet
        if (showRewardToast && newNotifications.length > 0) {
          const latestNotif = newNotifications[0]
          if (latestNotif && !latestNotif.isRead && (latestNotif.type === 'offer_complete' || latestNotif.type === 'survey_complete')) {
            // Show a toast popup for the new reward
            showToast({
              id: latestNotif.id,
              title: latestNotif.title,
              message: latestNotif.message,
              rewardAmount: latestNotif.rewardAmount ?? undefined,
              offerwall: latestNotif.offerwall ?? undefined,
            })
          }
        }

        setNotifications(newNotifications)
        setUnreadCount(newUnreadCount)
      } else {
        console.warn('[Notifications] Fetch failed with status:', res.status)
      }
    } catch (e) {
      console.warn('[Notifications] Fetch error:', e)
    }
  }, [showToast])

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      setMarkingRead(true)
      const userId = localStorage.getItem('userId')
      if (!userId) return
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        setUnreadCount(0)
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      }
    } catch (e) {
      console.warn('Failed to mark notifications as read:', e)
    } finally {
      setMarkingRead(false)
    }
  }

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Fetch banner settings
  const fetchBanner = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/banner')
      if (res.ok) {
        const data = await res.json()
        setBannerData(data)
      }
    } catch {
      // silently fail
    }
  }, [])

  // Refresh user data and notifications periodically
  useEffect(() => {
    // Initial refresh
    refreshUser()
    fetchNotifications()
    fetchBanner()

    // Refresh every 10 seconds for faster notification delivery
    const interval = setInterval(() => {
      refreshUser()
      fetchNotifications()
    }, 10000)
    // Refresh banner every 2 minutes
    const bannerInterval = setInterval(() => {
      fetchBanner()
    }, 120000)

    // Listen for instant notification refresh when balance changes (from survey completion)
    // Also show a toast popup for the reward
    const handleBalanceChanged = (event: Event) => {
      const customEvent = event as CustomEvent
      const detail = customEvent?.detail
      // Immediately show toast with balance change info
      if (detail?.newBalance && detail?.totalEarned) {
        const earned = detail.newBalance - (detail.previousBalance || 0)
        if (earned > 0) {
          showToast({
            id: `balance-${Date.now()}`,
            title: 'Reward Received!',
            message: `+$${earned.toFixed(3)} has been credited to your account`,
            rewardAmount: earned,
          })
        }
      }
      // Also fetch server notifications (with toast for new ones)
      fetchNotifications(true)
    }
    window.addEventListener('xoxo-balance-changed', handleBalanceChanged)

    return () => {
      clearInterval(interval)
      clearInterval(bannerInterval)
      window.removeEventListener('xoxo-balance-changed', handleBalanceChanged)
    }
  }, [refreshUser, fetchNotifications, fetchBanner])

  // Helper: time ago
  const timeAgo = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Helper: get icon for notification type
  const getNotifIcon = (iconType: string) => {
    switch (iconType) {
      case 'login':
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#FEF3C7]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
        )
      case 'reward':
      case 'money':
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        )
      case 'star':
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#FFF8E1]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#F9CC28">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
        )
      case 'users':
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#E8F5E9]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-[#F0F9FF]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
        )
    }
  }

  const isAdmin = state.user.role === 'admin'

  const handleNavClick = (id: string) => {
    if (id === 'invite') {
      setShowInviteModal(true)
      setMobileMenuOpen(false)
      return
    }
    setCurrentPage(id as typeof state.currentPage)
    setMobileMenuOpen(false)
  }

  const renderPage = () => {
    switch (state.currentPage) {
      case 'surveys': return <SurveysPage />
      case 'cashout': return <CashoutPage />
      case 'leaderboard': return <LeaderboardPage />
      case 'settings': return <SettingsPage />
      case 'help': return <HelpPage />
      default: return <SurveysPage />
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Anti-fraud fingerprint collector (invisible) */}
      <FingerprintCollector />

      {/* Toast Notification Popup - shows immediately when survey is completed */}
      {toastNotif && (
        <div
          className="fixed top-4 right-4 z-[70] animate-in slide-in-from-right duration-300"
          style={{ maxWidth: '360px' }}
        >
          <div
            className="bg-white rounded-[14px] shadow-[0px_8px_32px_0px_rgba(0,0,0,0.15)] border border-[#0FBCC0]/30 overflow-hidden"
            style={{ animation: 'slideInRight 0.4s ease-out' }}
          >
            {/* Green gradient top bar */}
            <div
              className="h-[3px]"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            />
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className="w-[40px] h-[40px] rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                      {toastNotif.title}
                    </p>
                    <button
                      onClick={() => setToastNotif(null)}
                      className="text-[#999] hover:text-[#666] transition-colors flex-shrink-0"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[12px] text-[#666] mt-0.5">{toastNotif.message}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {toastNotif.rewardAmount != null && toastNotif.rewardAmount > 0 && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32]">
                        +${toastNotif.rewardAmount.toFixed(3)}
                      </span>
                    )}
                    {toastNotif.offerwall && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0FDFB] text-[#0FBCC0] border border-[#0FBCC0]/20">
                        {toastNotif.offerwall}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Under Review Banner */}
      {isUnderReview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[16px] w-full max-w-[480px] mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {!showReviewContact ? (
              /* === Review Info View === */
              <div className="p-8 text-center">
                <div
                  className="w-[64px] h-[64px] rounded-full flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <h2
                  className="text-[22px] font-bold text-[#1A1A1A] mb-3"
                  style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
                >
                  Your account is under review
                </h2>
                <p className="text-[14px] text-[#666] leading-relaxed mb-6">
                  Please contact support team to make it faster
                </p>
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-[10px] p-4 mb-5">
                  <p className="text-[12px] text-[#999] mb-2">What does this mean?</p>
                  <ul className="text-[12px] text-[#666] text-left space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-[#D97706] mt-0.5">&#8226;</span>
                      Your account is being reviewed for security purposes
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D97706] mt-0.5">&#8226;</span>
                      All account activities are temporarily suspended
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#D97706] mt-0.5">&#8226;</span>
                      Contact our support team to speed up the process
                    </li>
                  </ul>
                </div>
                {/* Contact Options */}
                <div className="space-y-2.5">
                  {/* Telegram - Primary contact */}
                  <a
                    href={`https://t.me/${telegramUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 rounded-[10px] text-[15px] font-semibold text-white flex items-center justify-center gap-2.5 hover:shadow-lg transition-all active:scale-[0.98]"
                    style={{ background: '#0088cc' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                    Contact via Telegram
                  </a>

                  {/* In-app contact form */}
                  <button
                    onClick={() => setShowReviewContact(true)}
                    className="w-full py-3 rounded-[10px] text-[14px] font-semibold text-[#0FBCC0] border border-[#0FBCC0]/30 bg-[#F0FDFB] hover:bg-[#E0FAF8] transition-colors flex items-center justify-center gap-2"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    Send a Message
                  </button>
                </div>

                <button
                  onClick={logout}
                  className="w-full py-3 rounded-[10px] text-[14px] font-medium text-[#999] hover:text-[#666] hover:bg-[#F5F5F5] transition-colors mt-1 border border-[#E5E7EB]"
                >
                  Logout
                </button>
              </div>
            ) : (
              /* === Contact Form View === */
              <div className="p-6">
                {/* Back button & header */}
                <div className="flex items-center gap-3 mb-5">
                  <button
                    onClick={() => { setShowReviewContact(false); setReviewContactError(null) }}
                    className="p-1.5 rounded-[8px] hover:bg-[#F5F5F5] transition-colors"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#36383A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </svg>
                  </button>
                  <div>
                    <h2 className="text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Contact Support</h2>
                    <p className="text-[12px] text-[#999]">We&apos;re here to help you</p>
                  </div>
                </div>

                {reviewContactSent ? (
                  /* Success state */
                  <div className="text-center py-6">
                    <div
                      className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ background: 'linear-gradient(135deg, #2DD9B6 0%, #22B9CF 100%)' }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p className="text-[16px] font-bold text-[#36383A]">Message sent successfully!</p>
                    <p className="text-[14px] text-[#8C939E] mt-1">We&apos;ll get back to you within 24 hours.</p>
                    <button
                      onClick={() => { setShowReviewContact(false); setReviewContactSent(false) }}
                      className="mt-5 w-full py-3 rounded-[10px] text-[14px] font-medium text-[#999] hover:text-[#666] hover:bg-[#F5F5F5] transition-colors border border-[#E5E7EB]"
                    >
                      Back
                    </button>
                  </div>
                ) : (
                  /* Contact form */
                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className="block text-[12px] font-semibold text-[#6B7280] mb-1.5 uppercase tracking-wide">Name</label>
                      <input
                        type="text"
                        value={reviewContactForm.name}
                        onChange={(e) => setReviewContactForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Your name"
                        className="w-full h-[44px] px-4 rounded-[10px] border border-[#E2EAF1] bg-[#FAFBFC] text-[14px] text-[#36383A] font-medium outline-none transition-all duration-200 focus:border-[#0FBCC0] focus:shadow-[0_0_0_3px_rgba(15,188,192,0.1)] focus:bg-white placeholder:text-[#B0B7C3] placeholder:font-normal"
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[12px] font-semibold text-[#6B7280] mb-1.5 uppercase tracking-wide">Email</label>
                      <input
                        type="email"
                        value={reviewContactForm.email}
                        onChange={(e) => setReviewContactForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Your email"
                        className="w-full h-[44px] px-4 rounded-[10px] border border-[#E2EAF1] bg-[#FAFBFC] text-[14px] text-[#36383A] font-medium outline-none transition-all duration-200 focus:border-[#0FBCC0] focus:shadow-[0_0_0_3px_rgba(15,188,192,0.1)] focus:bg-white placeholder:text-[#B0B7C3] placeholder:font-normal"
                      />
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-[12px] font-semibold text-[#6B7280] mb-1.5 uppercase tracking-wide">Message</label>
                      <textarea
                        value={reviewContactForm.message}
                        onChange={(e) => setReviewContactForm(prev => ({ ...prev, message: e.target.value }))}
                        placeholder="Describe your issue..."
                        rows={4}
                        className="w-full px-4 py-3 rounded-[10px] border border-[#E2EAF1] bg-[#FAFBFC] text-[14px] text-[#36383A] font-medium outline-none transition-all duration-200 focus:border-[#0FBCC0] focus:shadow-[0_0_0_3px_rgba(15,188,192,0.1)] focus:bg-white placeholder:text-[#B0B7C3] placeholder:font-normal resize-none"
                      />
                    </div>

                    {/* Error message */}
                    {reviewContactError && (
                      <div className="p-3 rounded-[10px] bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="15" y1="9" x2="9" y2="15" />
                          <line x1="9" y1="9" x2="15" y2="15" />
                        </svg>
                        <p className="text-[12px] text-[#DC2626] font-medium">{reviewContactError}</p>
                      </div>
                    )}

                    {/* Send Button */}
                    <button
                      onClick={handleReviewContactSubmit}
                      disabled={!reviewContactForm.name || !reviewContactForm.email || !reviewContactForm.message || reviewContactSending}
                      className="w-full h-[46px] rounded-[10px] text-[14px] font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg"
                      style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)', boxShadow: '0px 4px 14px rgba(15, 188, 192, 0.35)' }}
                    >
                      {reviewContactSending ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                          </svg>
                          Send Message
                        </span>
                      )}
                    </button>

                    {/* Logout button */}
                    <button
                      onClick={logout}
                      className="w-full py-2.5 rounded-[10px] text-[13px] font-medium text-[#999] hover:text-[#666] hover:bg-[#F5F5F5] transition-colors border border-[#E5E7EB]"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header: 60px height, white bg, sticky */}
      <header className="bg-white border-b border-[#E2EAF1] sticky top-0 z-30 h-[60px]">
        <div className="flex items-center justify-between px-4 lg:px-5 h-full">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-[8px] hover:bg-[#F5F5F5] transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#36383A" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="XoXoSurveys" className="w-[32px] h-[32px] rounded-full object-cover" />
              <span
                className="text-[18px] font-bold text-[#36383A] hidden sm:block"
                style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
              >
                XoXoSurveys
              </span>
            </div>

            {/* User Stat Badges */}
            <div className="hidden md:flex items-center gap-2 ml-4">
              <button
                onClick={() => setShowMilestonesModal(true)}
                className="flex items-center gap-1.5 bg-[#FFF8E1] text-[#B8860B] px-3 py-1 rounded-full text-[12px] font-bold border border-[#FFD700]/30 hover:bg-[#FFE082] hover:border-[#FFD700]/50 transition-all cursor-pointer"
                title="Survey Rewards - Click to view milestones"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#F9CC28">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {state.user.surveysCompleted}/{state.user.surveyTarget}
              </button>
              <button
                onClick={() => setShowReferralModal(true)}
                className="flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] px-3 py-1 rounded-full text-[12px] font-bold hover:bg-[#C8E6C9] transition-all cursor-pointer"
                title="Referral Earnings - Click to view"
              >
                +${state.user.referralEarnings.toFixed(2)}
              </button>
              <button
                onClick={() => setShowEarningsModal(true)}
                className="flex items-center gap-1 bg-[#F5F5F5] text-[#36383A] px-3 py-1 rounded-full text-[12px] font-bold border border-[#E2EAF1] hover:bg-[#E5E7EB] hover:border-[#0FBCC0]/30 transition-all cursor-pointer"
                title="Click to view earnings history"
              >
                $ {state.user.balance.toFixed(2)}
              </button>
              {state.user.reservedBalance > 0 && (
                <div className="flex items-center gap-1 bg-[#FFF7ED] text-[#D97706] px-3 py-1 rounded-full text-[12px] font-bold border border-[#F59E0B]/30" title="Reserved Balance - on hold for cashout approvals">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  ${state.user.reservedBalance.toFixed(2)}
                </div>
              )}
            </div>
          </div>

          {/* Right side: notification bell, user dropdown */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-[8px] hover:bg-[#F5F5F5] transition-colors relative"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#36383A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-[#EF4444] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-[44px] w-[320px] bg-white rounded-[12px] shadow-[0px_4px_20px_0px_rgba(191,197,209,0.20)] border border-[#E2EAF1] z-50 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2EAF1]">
                    <h3 className="text-[14px] font-semibold text-[#36383A]">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        disabled={markingRead}
                        className="text-[11px] font-semibold text-[#0FBCC0] hover:text-[#0CCFC3] transition-colors disabled:opacity-50"
                      >
                        {markingRead ? 'Marking...' : 'Mark all as read'}
                      </button>
                    )}
                  </div>
                  {/* Notification List */}
                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 px-4 text-center">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#E2EAF1" strokeWidth="1.5" className="mx-auto mb-2">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <p className="text-[13px] text-[#999999]">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[#F5F5F5]">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`flex gap-2.5 p-3 transition-colors ${
                              notif.isRead ? 'bg-white' : 'bg-[#F0FDFB]'
                            }`}
                          >
                            <div className="flex-shrink-0 mt-0.5">
                              {getNotifIcon(notif.iconType)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className={`text-[12px] leading-tight ${notif.isRead ? 'text-[#4B4B4B] font-medium' : 'text-[#36383A] font-semibold'}`}>
                                  {notif.title}
                                </p>
                                {!notif.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-[#0FBCC0] flex-shrink-0 mt-1" />
                                )}
                              </div>
                              <p className="text-[11px] text-[#666] mt-0.5 leading-tight line-clamp-2">
                                {notif.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-[#999999]">{timeAgo(notif.createdAt)}</span>
                                {notif.offerwall && (
                                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#F0FDFB] text-[#0FBCC0] border border-[#0FBCC0]/20">
                                    {notif.offerwall}
                                  </span>
                                )}
                                {notif.rewardAmount != null && notif.rewardAmount > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#E8F5E9] text-[#2E7D32]">
                                    +${notif.rewardAmount.toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-[8px] hover:bg-[#F5F5F5] transition-colors"
              >
                <div
                  className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white text-[13px] font-bold"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  {state.user.email ? state.user.email[0].toUpperCase() : 'U'}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2" className={`hidden sm:block transition-transform ${showUserDropdown ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showUserDropdown && (
                <div className="absolute right-0 top-[44px] w-[200px] bg-white rounded-[12px] shadow-[0px_4px_20px_0px_rgba(191,197,209,0.20)] border border-[#E2EAF1] z-50 py-1">
                  <div className="px-4 py-3 border-b border-[#E2EAF1]">
                    <p className="text-[13px] font-medium text-[#36383A] truncate">{state.user.email}</p>
                    <p className="text-[11px] text-[#0FBCC0] font-semibold">ID: #{state.user.userId}</p>
                  </div>
                  <button
                    onClick={() => { setCurrentPage('settings'); setShowUserDropdown(false) }}
                    className="w-full text-left px-4 py-2 text-[13px] text-[#4B4B4B] hover:bg-[#F9FAFB] transition-colors"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => { logout(); setShowUserDropdown(false) }}
                    className="w-full text-left px-4 py-2 text-[13px] text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Announcement Banner */}
      {bannerData?.enabled && bannerData.message && (
        <AnnouncementBanner message={bannerData.message} type={bannerData.type} />
      )}

      <div className="flex">
        {/* Sidebar - Desktop: 220px wide, white bg, border-right */}
        <aside className="hidden lg:flex flex-col w-[220px] bg-white border-r border-[#E2EAF1] min-h-[calc(100vh-60px)]">
          <nav className="flex-1 py-6 px-3 space-y-1">
            {sidebarItems.map((item) => {
              const isActive = state.currentPage === item.id || (item.id === 'invite' && showInviteModal)
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium transition-all ${
                    isActive
                      ? 'text-[#0FBCC0] bg-[#F0FDFB]'
                      : 'text-[#4B4B4B] hover:bg-[#F9FAFB]'
                  }`}
                  style={isActive ? { borderLeft: '3px solid #0FBCC0' } : undefined}
                >
                  <SidebarIcon type={item.icon} active={isActive} />
                  {item.label}
                </button>
              )
            })}

            {/* Admin Panel - conditional */}
            {isAdmin && (
              <button
                onClick={() => setCurrentPage('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium transition-all ${
                  state.currentPage === 'admin'
                    ? 'text-[#0FBCC0] bg-[#F0FDFB]'
                    : 'text-[#4B4B4B] hover:bg-[#F9FAFB]'
                }`}
                style={state.currentPage === 'admin' ? { borderLeft: '3px solid #0FBCC0' } : undefined}
              >
                <SidebarIcon type="admin" active={state.currentPage === 'admin'} />
                Admin Panel
              </button>
            )}
          </nav>

          {/* Logout at bottom */}
          <div className="px-3 pb-6">
            <div className="border-t border-[#E2EAF1] pt-3">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium text-[#999999] hover:bg-[#F9FAFB] transition-colors"
              >
                <SidebarIcon type="logout" active={false} />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white z-50 shadow-[0px_4px_20px_0px_rgba(191,197,209,0.20)]">
              {/* Mobile sidebar header */}
              <div className="flex items-center justify-between px-5 h-[60px] border-b border-[#E2EAF1]">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="XoXoSurveys" className="w-[32px] h-[32px] rounded-full object-cover" />
                  <span className="text-[18px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>XoXoSurveys</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-[#F5F5F5] rounded-[6px]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Mobile stats */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-[#E2EAF1]">
                <button
                  onClick={() => { setShowMilestonesModal(true); setMobileMenuOpen(false) }}
                  className="flex items-center gap-1 bg-[#FFF8E1] text-[#B8860B] px-2 py-0.5 rounded-full text-[11px] font-bold hover:bg-[#FFE082] transition-all cursor-pointer"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#F9CC28"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  {state.user.surveysCompleted}/{state.user.surveyTarget}
                </button>
                <button
                  onClick={() => { setShowReferralModal(true); setMobileMenuOpen(false) }}
                  className="flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded-full text-[11px] font-bold hover:bg-[#C8E6C9] transition-all cursor-pointer"
                >
                  +${state.user.referralEarnings.toFixed(2)}
                </button>
                <div className="flex items-center gap-1 bg-[#F5F5F5] text-[#36383A] px-2 py-0.5 rounded-full text-[11px] font-bold">
                  ${state.user.balance.toFixed(2)}
                </div>
                {state.user.reservedBalance > 0 && (
                  <div className="flex items-center gap-1 bg-[#FFF7ED] text-[#D97706] px-2 py-0.5 rounded-full text-[11px] font-bold border border-[#F59E0B]/30" title="Reserved Balance">
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    ${state.user.reservedBalance.toFixed(2)}
                  </div>
                )}
              </div>

              <nav className="px-3 py-4 space-y-1">
                {sidebarItems.map((item) => {
                  const isActive = state.currentPage === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium transition-all ${
                        isActive
                          ? 'text-[#0FBCC0] bg-[#F0FDFB]'
                          : 'text-[#4B4B4B] hover:bg-[#F9FAFB]'
                      }`}
                      style={isActive ? { borderLeft: '3px solid #0FBCC0' } : undefined}
                    >
                      <SidebarIcon type={item.icon} active={isActive} />
                      {item.label}
                    </button>
                  )
                })}
                {isAdmin && (
                  <button
                    onClick={() => { setCurrentPage('admin'); setMobileMenuOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium transition-all ${
                      state.currentPage === 'admin'
                        ? 'text-[#0FBCC0] bg-[#F0FDFB]'
                        : 'text-[#4B4B4B] hover:bg-[#F9FAFB]'
                    }`}
                    style={state.currentPage === 'admin' ? { borderLeft: '3px solid #0FBCC0' } : undefined}
                  >
                    <SidebarIcon type="admin" active={state.currentPage === 'admin'} />
                    Admin Panel
                  </button>
                )}
              </nav>

              <div className="absolute bottom-0 left-0 right-0 px-3 pb-4 border-t border-[#E2EAF1] pt-3">
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium text-[#999999] hover:bg-[#F9FAFB] transition-colors"
                >
                  <SidebarIcon type="logout" active={false} />
                  Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-60px)]">
          {renderPage()}
        </main>
      </div>

      {/* Invite Friends Modal */}
      {showInviteModal && <InviteFriendsModal onClose={() => setShowInviteModal(false)} />}

      {/* Milestones Modal */}
      {showMilestonesModal && <MilestonesModal onClose={() => setShowMilestonesModal(false)} />}

      {/* Referral Earnings Modal */}
      {showReferralModal && <ReferralEarningsModal onClose={() => setShowReferralModal(false)} />}

      {/* Earnings History Modal */}
      {showEarningsModal && <EarningsHistoryModal onClose={() => setShowEarningsModal(false)} />}
    </div>
  )
}

function AnnouncementBanner({ message, type }: { message: string; type: string }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const styles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    info: { bg: '#F0FDFB', border: '#0FBCC0', text: '#065F46', icon: '#0FBCC0' },
    warning: { bg: '#FFF8E1', border: '#F59E0B', text: '#92400E', icon: '#F59E0B' },
    success: { bg: '#F0FDF4', border: '#10B981', text: '#065F46', icon: '#10B981' },
    error: { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B', icon: '#EF4444' },
  }
  const s = styles[type] || styles.info

  return (
    <div
      className="border-b px-4 py-2.5 flex items-center gap-2.5"
      style={{ backgroundColor: s.bg, borderColor: s.border + '40' }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={s.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <p className="text-[13px] font-medium flex-1" style={{ color: s.text }}>{message}</p>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
        style={{ color: s.icon }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

function InviteFriendsModal({ onClose }: { onClose: () => void }) {
  const { state } = useApp()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(state.user.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-[12px] w-full max-w-[440px] p-6 z-10"
        style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#999999] hover:text-[#36383A] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-[40px] h-[40px] rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h2 className="text-[20px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Invite friends</h2>
        </div>

        {/* Benefits */}
        <ul className="space-y-2 mb-5">
          <li className="flex items-start gap-2 text-[14px] text-[#4B4B4B]">
            <span className="text-[#0FBCC0] mt-0.5">&#8226;</span>
            Invite your friends and earn 10% for every completed survey - forever.*
          </li>
          <li className="flex items-start gap-2 text-[14px] text-[#4B4B4B]">
            <span className="text-[#0FBCC0] mt-0.5">&#8226;</span>
            Your friend gets a 10% bonus for 7 days.
          </li>
          <li className="flex items-start gap-2 text-[12px] text-[#999999]">
            <span className="text-[#999999] mt-0.5">*</span>
            You can only have one account and not refer yourself. Brand bidding is also forbidden.
          </li>
        </ul>

        {/* Invitation Code */}
        <div className="mb-5">
          <h3 className="text-[14px] font-semibold text-[#36383A] mb-2">Invitation Code</h3>
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

        {/* Statistics */}
        <div>
          <h3 className="text-[14px] font-semibold text-[#36383A] mb-3">Statistics</h3>
          <div className="space-y-0">
            <div className="flex justify-between items-center py-2.5 border-b border-[#E2EAF1]">
              <span className="text-[14px] text-[#999999]">Unclaimed Revenue</span>
              <span className="text-[14px] font-semibold text-[#36383A]">{state.user.unclaimedRevenue.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-[#E2EAF1]">
              <span className="text-[14px] text-[#999999]">Friends invited</span>
              <span className="text-[14px] font-semibold text-[#36383A]">{state.user.friendsInvited}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[14px] text-[#999999]">Total Earned</span>
              <span className="text-[14px] font-semibold text-[#0FBCC0]">{state.user.totalEarned.toFixed(2)} USD</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="xoxo-btn-primary w-full mt-6 h-[44px]"
        >
          Close
        </button>
      </div>
    </div>
  )
}


