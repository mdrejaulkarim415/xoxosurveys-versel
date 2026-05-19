'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UserCheck,
  ShieldAlert,
  Send,
  ChevronRight,
  Eye,
  Ban,
  Unlock,
  RefreshCw,
  Search,
  Mail,
  X,
  Clock,
  Globe,
  Monitor,
  AlertTriangle,
  Fingerprint,
  MapPin,
  ExternalLink,
} from 'lucide-react'

type ReviewRecord = {
  id: string
  userId: string
  reason: string
  status: string
  totalEarned: number
  surveysCompleted: number
  fraudScore: number
  ipCount: number
  deviceCount: number
  avgCompletionSpeed: number
  flaggedAttempts: number
  vpnDetected: boolean
  duplicateAccounts: number
  reviewedBy: string | null
  reviewNote: string | null
  adminEmailSent: boolean
  adminEmailContent: string | null
  reviewedAt: string | null
  resolvedAt: string | null
  createdAt: string
  user: {
    id: string
    userId: number
    email: string
    firstname: string | null
    lastname: string | null
    balance: number
    totalEarned: number
    surveysCompleted: number
    fraudScore: number
    fraudFlags: string
    isBanned: boolean
    isUnderReview: boolean
    isFlagged: boolean
    deviceFingerprint: string | null
    lastLoginAt: string | null
    lastLoginIp: string | null
    loginCount: number
    createdAt: string
  }
  ips: Array<{
    ipAddress: string
    country: string | null
    city: string | null
    isVpn: boolean
    isProxy: boolean
    isTor: boolean
    isBlocked: boolean
    firstSeen: string
    lastSeen: string
  }>
  sessions: Array<{
    ipAddress: string | null
    deviceFingerprint: string | null
    userAgent: string | null
    country: string | null
    city: string | null
    isVpn: boolean
    createdAt: string
  }>
  flaggedAttempts: Array<{
    id: string
    surveyId: string
    timeSpent: number
    completionSpeed: number | null
    flagReason: string | null
    completedAt: string | null
  }>
  recentAttempts: Array<{
    id: string
    timeSpent: number
    reward: number
    completionSpeed: number | null
    answerConsistency: number | null
    isFlagged: boolean
    startedAt: string
    completedAt: string | null
  }>
}

export function AdminReviews() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [manualReviewUserId, setManualReviewUserId] = useState('')
  const [manualReviewLoading, setManualReviewLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; userId: number; email: string; name: string | null; balance: number; totalEarned: number; isUnderReview: boolean; isBanned: boolean }>>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/reviews?status=${statusFilter}&limit=50`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews || [])
      }
    } catch (e) {
      console.error('Failed to fetch reviews:', e)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleAction = async (reviewId: string, action: 'release' | 'ban') => {
    try {
      setActionLoading(reviewId + action)
      const adminUserId = localStorage.getItem('userId') || 'admin'
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, action, adminId: adminUserId, note }),
      })
      if (res.ok) {
        setNote('')
        fetchReviews()
        if (selectedReview?.id === reviewId) {
          setSelectedReview(null)
        }
      } else {
        const data = await res.json()
        alert(data.error || 'Action failed')
      }
    } catch (e) {
      console.error('Action failed:', e)
      alert('Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendEmail = async () => {
    if (!selectedReview || !emailSubject || !emailMessage) return
    try {
      setEmailSending(true)
      const adminUserId = localStorage.getItem('userId') || 'admin'
      const res = await fetch('/api/admin/reviews/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          adminId: adminUserId,
          subject: emailSubject,
          message: emailMessage,
        }),
      })
      if (res.ok) {
        alert('Email sent successfully!')
        setShowEmailModal(false)
        setEmailSubject('')
        setEmailMessage('')
        fetchReviews()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send email')
      }
    } catch (e) {
      console.error('Email send failed:', e)
      alert('Failed to send email')
    } finally {
      setEmailSending(false)
    }
  }

  const handleManualReview = async (userId: string) => {
    if (!userId.trim()) return
    try {
      setManualReviewLoading(true)
      const adminUserId = localStorage.getItem('userId') || 'admin'
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId.trim(),
          reason: 'manual_admin',
          adminId: adminUserId,
        }),
      })
      if (res.ok) {
        setManualReviewUserId('')
        setSearchQuery('')
        setSearchResults([])
        setShowSearchResults(false)
        fetchReviews()
        alert('User has been put under review!')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to put user under review')
      }
    } catch (e) {
      console.error('Manual review failed:', e)
      alert('Failed to put user under review')
    } finally {
      setManualReviewLoading(false)
    }
  }

  const handleUserSearch = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }
    try {
      setSearchLoading(true)
      setShowSearchResults(true)
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setSearchResults(data.users || [])
      }
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  const getReasonBadge = (reason: string) => {
    switch (reason) {
      case 'auto_4dollar':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#D97706] border border-[#F59E0B]/30">Auto ($4 Earned)</span>
      case 'manual_admin':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] border border-[#3B82F6]/30">Manual Admin</span>
      case 'fraud_suspicion':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#EF4444]/30">Fraud Suspicion</span>
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#666]">{reason}</span>
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF7ED] text-[#D97706]">Pending Review</span>
      case 'released':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32]">Released</span>
      case 'banned':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]">Banned</span>
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#666]">{status}</span>
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleString()
  }

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
    return date.toLocaleDateString()
  }

  // Detail View
  if (selectedReview) {
    const r = selectedReview
    const u = r.user
    const fraudFlags = (() => { try { return JSON.parse(u.fraudFlags || '[]') } catch { return [] } })()

    return (
      <div className="space-y-4">
        {/* Back button */}
        <button
          onClick={() => setSelectedReview(null)}
          className="flex items-center gap-2 text-[14px] text-[#555] hover:text-[#1A1A1A] transition-colors"
        >
          <ChevronRight size={16} className="rotate-180" />
          Back to Reviews
        </button>

        {/* User Header Card */}
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] overflow-hidden">
          <div className="p-5 border-b border-[#E5E7EB]" style={{ background: 'linear-gradient(135deg, #F0FDFB 0%, #E6FAF8 100%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-[20px] font-bold"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  {u.email[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[18px] font-bold text-[#1A1A1A]">
                      {u.firstname && u.lastname ? `${u.firstname} ${u.lastname}` : u.email}
                    </h2>
                    {getReasonBadge(r.reason)}
                    {getStatusBadge(r.status)}
                  </div>
                  <p className="text-[13px] text-[#999]">ID: #{u.userId} • {u.email}</p>
                  <p className="text-[11px] text-[#999]">Under review since: {formatDate(r.createdAt)}</p>
                </div>
              </div>
              {r.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-semibold bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE] transition-colors"
                  >
                    <Mail size={14} />
                    Email User
                  </button>
                  <button
                    onClick={() => handleAction(r.id, 'release')}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-semibold bg-[#E8F5E9] text-[#2E7D32] hover:bg-[#C8E6C9] transition-colors disabled:opacity-50"
                  >
                    {actionLoading === r.id + 'release' ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Unlock size={14} />
                    )}
                    Release
                  </button>
                  <button
                    onClick={() => handleAction(r.id, 'ban')}
                    disabled={!!actionLoading}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-semibold bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FECACA] transition-colors disabled:opacity-50"
                  >
                    {actionLoading === r.id + 'ban' ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Ban size={14} />
                    )}
                    Ban
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Note input */}
          {r.status === 'pending' && (
            <div className="p-4 border-b border-[#E5E7EB] flex gap-2">
              <input
                type="text"
                placeholder="Add a review note (optional)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="flex-1 px-3 py-2 rounded-[8px] border border-[#E5E7EB] text-[13px] focus:outline-none focus:border-[#0FBCC0]"
              />
            </div>
          )}
          {r.reviewNote && (
            <div className="px-5 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <p className="text-[12px] text-[#999] mb-1">Review Note:</p>
              <p className="text-[13px] text-[#4B4B4B]">{r.reviewNote}</p>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 text-center">
            <p className="text-[22px] font-bold text-[#0FBCC0]">${u.totalEarned.toFixed(2)}</p>
            <p className="text-[11px] text-[#999] mt-1">Total Earned</p>
          </div>
          <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 text-center">
            <p className="text-[22px] font-bold text-[#1A1A1A]">{u.surveysCompleted}</p>
            <p className="text-[11px] text-[#999] mt-1">Surveys Completed</p>
          </div>
          <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 text-center">
            <p className="text-[22px] font-bold text-[#F59E0B]">{u.fraudScore.toFixed(0)}</p>
            <p className="text-[11px] text-[#999] mt-1">Fraud Score</p>
          </div>
          <div className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 text-center">
            <p className="text-[22px] font-bold text-[#1A1A1A]">${u.balance.toFixed(2)}</p>
            <p className="text-[11px] text-[#999] mt-1">Current Balance</p>
          </div>
        </div>

        {/* Review Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Account Security */}
          <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-5">
            <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
              <ShieldAlert size={16} className="text-[#D97706]" />
              Security & Fraud
            </h3>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#666]">VPN/Proxy Detected</span>
                <span className={`text-[13px] font-semibold ${r.vpnDetected ? 'text-[#DC2626]' : 'text-[#2E7D32]'}`}>
                  {r.vpnDetected ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#666]">Flagged Attempts</span>
                <span className={`text-[13px] font-semibold ${r.flaggedAttempts > 0 ? 'text-[#DC2626]' : 'text-[#2E7D32]'}`}>
                  {r.flaggedAttempts}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#666]">Duplicate Accounts</span>
                <span className={`text-[13px] font-semibold ${r.duplicateAccounts > 0 ? 'text-[#DC2626]' : 'text-[#2E7D32]'}`}>
                  {r.duplicateAccounts}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#666]">Avg Completion Speed</span>
                <span className="text-[13px] font-semibold text-[#1A1A1A]">
                  {r.avgCompletionSpeed.toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#666]">Is Flagged</span>
                <span className={`text-[13px] font-semibold ${u.isFlagged ? 'text-[#DC2626]' : 'text-[#2E7D32]'}`}>
                  {u.isFlagged ? 'Yes' : 'No'}
                </span>
              </div>
              {fraudFlags.length > 0 && (
                <div>
                  <p className="text-[12px] text-[#999] mb-1">Fraud Flags:</p>
                  <div className="flex flex-wrap gap-1">
                    {fraudFlags.map((flag: string, i: number) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#EF4444]/20">
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Login Info */}
          <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-5">
            <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-3 flex items-center gap-2">
              <Globe size={16} className="text-[#0FBCC0]" />
              Login & IP Info
            </h3>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#666]">Unique IPs</span>
                <span className="text-[13px] font-semibold text-[#1A1A1A]">{r.ipCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#666]">Unique Devices</span>
                <span className="text-[13px] font-semibold text-[#1A1A1A]">{r.deviceCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#666]">Total Logins</span>
                <span className="text-[13px] font-semibold text-[#1A1A1A]">{u.loginCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#666]">Last Login IP</span>
                <span className="text-[12px] font-mono text-[#1A1A1A]">{u.lastLoginIp || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#666]">Last Login</span>
                <span className="text-[12px] text-[#1A1A1A]">{formatDate(u.lastLoginAt)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#666]">Account Created</span>
                <span className="text-[12px] text-[#1A1A1A]">{formatDate(u.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* IP Addresses */}
        {r.ips.length > 0 && (
          <div className="bg-white rounded-[12px] border border-[#E5E7EB] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E5E7EB]">
              <h3 className="text-[14px] font-semibold text-[#1A1A1A] flex items-center gap-2">
                <MapPin size={16} className="text-[#0FBCC0]" />
                IP Addresses ({r.ips.length})
              </h3>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[#F9FAFB] sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 text-[#999] font-medium">IP Address</th>
                    <th className="text-left px-4 py-2 text-[#999] font-medium">Location</th>
                    <th className="text-center px-4 py-2 text-[#999] font-medium">VPN</th>
                    <th className="text-center px-4 py-2 text-[#999] font-medium">Proxy</th>
                    <th className="text-center px-4 py-2 text-[#999] font-medium">Tor</th>
                    <th className="text-center px-4 py-2 text-[#999] font-medium">Blocked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5]">
                  {r.ips.map((ip, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-mono">{ip.ipAddress}</td>
                      <td className="px-4 py-2">{ip.country || 'Unknown'}{ip.city ? `, ${ip.city}` : ''}</td>
                      <td className="px-4 py-2 text-center">{ip.isVpn ? '🔴' : '✅'}</td>
                      <td className="px-4 py-2 text-center">{ip.isProxy ? '🔴' : '✅'}</td>
                      <td className="px-4 py-2 text-center">{ip.isTor ? '🔴' : '✅'}</td>
                      <td className="px-4 py-2 text-center">{ip.isBlocked ? '🔴' : '✅'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sessions */}
        {r.sessions.length > 0 && (
          <div className="bg-white rounded-[12px] border border-[#E5E7EB] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E5E7EB]">
              <h3 className="text-[14px] font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Monitor size={16} className="text-[#0FBCC0]" />
                Recent Sessions ({r.sessions.length})
              </h3>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[#F9FAFB] sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 text-[#999] font-medium">IP</th>
                    <th className="text-left px-4 py-2 text-[#999] font-medium">Location</th>
                    <th className="text-center px-4 py-2 text-[#999] font-medium">VPN</th>
                    <th className="text-left px-4 py-2 text-[#999] font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5]">
                  {r.sessions.map((s, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-mono">{s.ipAddress || 'N/A'}</td>
                      <td className="px-4 py-2">{s.country || 'Unknown'}{s.city ? `, ${s.city}` : ''}</td>
                      <td className="px-4 py-2 text-center">{s.isVpn ? '🔴' : '✅'}</td>
                      <td className="px-4 py-2">{formatDate(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Flagged Attempts */}
        {r.flaggedAttempts.length > 0 && (
          <div className="bg-white rounded-[12px] border border-[#E5E7EB] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E5E7EB]">
              <h3 className="text-[14px] font-semibold text-[#1A1A1A] flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#DC2626]" />
                Flagged Survey Attempts ({r.flaggedAttempts.length})
              </h3>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[#F9FAFB] sticky top-0">
                  <tr>
                    <th className="text-left px-4 py-2 text-[#999] font-medium">Survey</th>
                    <th className="text-center px-4 py-2 text-[#999] font-medium">Time</th>
                    <th className="text-center px-4 py-2 text-[#999] font-medium">Speed</th>
                    <th className="text-left px-4 py-2 text-[#999] font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5]">
                  {r.flaggedAttempts.map((a, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-mono text-[11px]">{a.surveyId.slice(0, 12)}...</td>
                      <td className="px-4 py-2 text-center">{Math.round(a.timeSpent / 60)}min</td>
                      <td className="px-4 py-2 text-center">{a.completionSpeed?.toFixed(2) || 'N/A'}x</td>
                      <td className="px-4 py-2 text-[#DC2626] max-w-[200px] truncate">{a.flagReason || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Attempts */}
        {r.recentAttempts.length > 0 && (
          <div className="bg-white rounded-[12px] border border-[#E5E7EB] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#E5E7EB]">
              <h3 className="text-[14px] font-semibold text-[#1A1A1A] flex items-center gap-2">
                <Clock size={16} className="text-[#0FBCC0]" />
                Recent Survey Attempts ({r.recentAttempts.length})
              </h3>
            </div>
            <div className="max-h-[200px] overflow-y-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-[#F9FAFB] sticky top-0">
                  <tr>
                    <th className="text-center px-4 py-2 text-[#999] font-medium">Time</th>
                    <th className="text-center px-4 py-2 text-[#999] font-medium">Reward</th>
                    <th className="text-center px-4 py-2 text-[#999] font-medium">Speed</th>
                    <th className="text-center px-4 py-2 text-[#999] font-medium">Consistency</th>
                    <th className="text-center px-4 py-2 text-[#999] font-medium">Flagged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F5F5]">
                  {r.recentAttempts.map((a, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-center">{Math.round(a.timeSpent / 60)}min</td>
                      <td className="px-4 py-2 text-center text-[#0FBCC0] font-semibold">${a.reward.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">{a.completionSpeed?.toFixed(2) || 'N/A'}x</td>
                      <td className="px-4 py-2 text-center">{a.answerConsistency ? `${Math.round(a.answerConsistency * 100)}%` : 'N/A'}</td>
                      <td className="px-4 py-2 text-center">{a.isFlagged ? '🔴' : '✅'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Email Modal */}
        {showEmailModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEmailModal(false)} />
            <div className="relative bg-white rounded-[12px] w-full max-w-[500px] p-6 z-10 shadow-xl">
              <button
                onClick={() => setShowEmailModal(false)}
                className="absolute top-4 right-4 text-[#999] hover:text-[#1A1A1A]"
              >
                <X size={20} />
              </button>
              <h3 className="text-[18px] font-bold text-[#1A1A1A] mb-4 flex items-center gap-2">
                <Mail size={20} className="text-[#0FBCC0]" />
                Send Email to User
              </h3>
              <p className="text-[13px] text-[#999] mb-4">Send an email to {u.email} during their account review.</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[13px] font-medium text-[#555] mb-1 block">Subject</label>
                  <input
                    type="text"
                    placeholder="Email subject..."
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E5E7EB] text-[13px] focus:outline-none focus:border-[#0FBCC0]"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-medium text-[#555] mb-1 block">Message</label>
                  <textarea
                    placeholder="Type your message..."
                    value={emailMessage}
                    onChange={(e) => setEmailMessage(e.target.value)}
                    rows={5}
                    className="w-full px-3 py-2 rounded-[8px] border border-[#E5E7EB] text-[13px] focus:outline-none focus:border-[#0FBCC0] resize-none"
                  />
                </div>
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending || !emailSubject || !emailMessage}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[8px] text-[14px] font-semibold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  {emailSending ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  {emailSending ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // List View
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            Account Reviews
          </h2>
          <p className="text-[13px] text-[#999]">Review and manage user accounts flagged for review</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchReviews}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-[#555] hover:bg-[#F5F7FA] transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Manual Review - Search by Email/ID */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-4">
        <h3 className="text-[14px] font-semibold text-[#1A1A1A] mb-2 flex items-center gap-2">
          <UserCheck size={16} className="text-[#0FBCC0]" />
          Put User Under Review
        </h3>
        <p className="text-[12px] text-[#999] mb-3">Search by email or name to find and review any user</p>
        <div className="relative">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999]" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-[8px] border border-[#E5E7EB] text-[13px] focus:outline-none focus:border-[#0FBCC0]"
              />
              {searchLoading && (
                <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999] animate-spin" />
              )}
            </div>
          </div>
          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[8px] border border-[#E5E7EB] shadow-lg z-20 max-h-[250px] overflow-y-auto">
              {searchResults.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[#F5F7FA] cursor-pointer border-b border-[#F5F5F5] last:border-0"
                  onClick={() => {
                    if (u.isUnderReview) {
                      alert('This user is already under review!')
                      return
                    }
                    if (u.isBanned) {
                      alert('This user is already banned!')
                      return
                    }
                    handleManualReview(u.id)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white text-[12px] font-bold"
                      style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                    >
                      {u.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-[#1A1A1A]">{u.name || u.email}</p>
                      <p className="text-[11px] text-[#999]">#{u.userId} • {u.email} • Earned: ${u.totalEarned.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.isUnderReview && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[#7C3AED]">Under Review</span>
                    )}
                    {u.isBanned && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]">Banned</span>
                    )}
                    {!u.isUnderReview && !u.isBanned && (
                      <button
                        className="flex items-center gap-1 px-2.5 py-1 rounded-[6px] text-[11px] font-semibold text-white"
                        style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleManualReview(u.id)
                        }}
                        disabled={manualReviewLoading}
                      >
                        {manualReviewLoading ? <RefreshCw size={10} className="animate-spin" /> : <ShieldAlert size={10} />}
                        Review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {showSearchResults && searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[8px] border border-[#E5E7EB] shadow-lg z-20 p-4 text-center">
              <p className="text-[13px] text-[#999]">No users found for &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-1 bg-[#F5F5F5] rounded-[10px] p-1">
        {['pending', 'released', 'banned', 'all'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`flex-1 py-2 rounded-[8px] text-[13px] font-semibold transition-all capitalize ${
              statusFilter === s
                ? 'bg-white text-[#0FBCC0] shadow-sm'
                : 'text-[#999999] hover:text-[#4B4B4B]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-3 border-[#2DD9B6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-12 text-center">
          <ShieldAlert size={40} className="mx-auto text-[#E5E7EB] mb-3" />
          <p className="text-[14px] text-[#999]">No {statusFilter !== 'all' ? statusFilter : ''} reviews found</p>
          <p className="text-[12px] text-[#BFBFBF] mt-1">Reviews will appear here when accounts are flagged</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-[10px] border border-[#E5E7EB] p-4 hover:border-[#0FBCC0]/30 transition-colors cursor-pointer"
              onClick={() => setSelectedReview(review)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-white text-[14px] font-bold flex-shrink-0"
                    style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                  >
                    {review.user.email[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-[#1A1A1A]">
                        {review.user.firstname && review.user.lastname
                          ? `${review.user.firstname} ${review.user.lastname}`
                          : review.user.email}
                      </p>
                      {getReasonBadge(review.reason)}
                      {getStatusBadge(review.status)}
                    </div>
                    <p className="text-[11px] text-[#999]">
                      ID: #{review.user.userId} • Earned: ${review.totalEarned.toFixed(2)} • Surveys: {review.surveysCompleted} • Fraud Score: {review.fraudScore.toFixed(0)}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-[#999] flex items-center gap-1">
                        <Globe size={10} /> {review.ipCount} IPs
                      </span>
                      <span className="text-[10px] text-[#999] flex items-center gap-1">
                        <Monitor size={10} /> {review.deviceCount} devices
                      </span>
                      {review.vpnDetected && (
                        <span className="text-[10px] text-[#DC2626] font-semibold flex items-center gap-1">
                          <AlertTriangle size={10} /> VPN
                        </span>
                      )}
                      {review.flaggedAttempts > 0 && (
                        <span className="text-[10px] text-[#DC2626] font-semibold">
                          {review.flaggedAttempts} flagged
                        </span>
                      )}
                      {review.duplicateAccounts > 0 && (
                        <span className="text-[10px] text-[#DC2626] font-semibold">
                          {review.duplicateAccounts} dupes
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {review.adminEmailSent && (
                    <span className="text-[10px] text-[#2563EB] font-semibold flex items-center gap-1">
                      <Mail size={10} /> Email sent
                    </span>
                  )}
                  <span className="text-[11px] text-[#999]">{timeAgo(review.createdAt)}</span>
                  <ChevronRight size={16} className="text-[#999]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
