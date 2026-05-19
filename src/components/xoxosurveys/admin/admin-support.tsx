'use client'

import { useState, useEffect } from 'react'

interface SupportMessage {
  id: string
  name: string
  email: string
  message: string
  status: string
  priority: string
  adminReply: string | null
  repliedBy: string | null
  userId: string | null
  createdAt: string
  readAt: string | null
  repliedAt: string | null
  user: {
    id: string
    email: string
    firstname: string | null
    lastname: string | null
    userId: number
  } | null
}

interface StatusCounts {
  open: number
  read: number
  replied: number
  closed: number
}

type FilterStatus = 'all' | 'open' | 'read' | 'replied' | 'closed'

export function AdminSupport() {
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [counts, setCounts] = useState<StatusCounts>({ open: 0, read: 0, replied: 0, closed: 0 })
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [search, setSearch] = useState('')

  const fetchMessages = async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.set('status', filter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/support/messages?${params}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
        setCounts(data.counts)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [filter, search])

  const handleStatusChange = async (messageId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/support/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        fetchMessages()
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(prev => prev ? { ...prev, status: newStatus } : null)
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handlePriorityChange = async (messageId: string, newPriority: string) => {
    try {
      const res = await fetch(`/api/admin/support/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority }),
      })
      if (res.ok) {
        fetchMessages()
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(prev => prev ? { ...prev, priority: newPriority } : null)
        }
      }
    } catch (error) {
      console.error('Failed to update priority:', error)
    }
  }

  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return
    setReplying(true)
    try {
      const res = await fetch(`/api/admin/support/messages/${selectedMessage.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminReply: replyText,
          repliedBy: 'admin',
        }),
      })
      if (res.ok) {
        setReplyText('')
        fetchMessages()
        // Refresh selected message
        const updated = await res.json()
        if (updated.message) {
          setSelectedMessage(updated.message)
        }
      }
    } catch (error) {
      console.error('Failed to send reply:', error)
    } finally {
      setReplying(false)
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return
    try {
      const res = await fetch(`/api/admin/support/messages/${messageId}`, { method: 'DELETE' })
      if (res.ok) {
        if (selectedMessage?.id === messageId) {
          setSelectedMessage(null)
        }
        fetchMessages()
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
      case 'read': return 'bg-[#DBEAFE] text-[#2563EB] border-[#BFDBFE]'
      case 'replied': return 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
      case 'closed': return 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]'
      default: return 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
      case 'high': return 'bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]'
      case 'normal': return 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]'
      case 'low': return 'bg-[#F0FDFB] text-[#0FBCC0] border-[#CCFBF1]'
      default: return 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const filterTabs: { id: FilterStatus; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: Object.values(counts).reduce((a, b) => a + b, 0) },
    { id: 'open', label: 'Open', count: counts.open },
    { id: 'read', label: 'Read', count: counts.read },
    { id: 'replied', label: 'Replied', count: counts.replied },
    { id: 'closed', label: 'Closed', count: counts.closed },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-3 border-[#2DD9B6] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            Support Messages
          </h1>
          <p className="text-[14px] text-[#999999] mt-1">Manage user support requests</p>
        </div>
        <div className="relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search messages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-[40px] pl-10 pr-4 rounded-[10px] border border-[#E2EAF1] bg-white text-[13px] text-[#36383A] outline-none focus:border-[#0FBCC0] focus:shadow-[0_0_0_3px_rgba(15,188,192,0.1)] transition-all w-[260px]"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all whitespace-nowrap ${
              filter === tab.id
                ? 'text-white shadow-sm'
                : 'bg-white border border-[#E2EAF1] text-[#6B7280] hover:bg-[#F8FAFB]'
            }`}
            style={
              filter === tab.id
                ? { background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }
                : undefined
            }
          >
            {tab.label}
            <span className={`inline-flex items-center justify-center min-w-[20px] h-[20px] rounded-full text-[11px] font-bold ${
              filter === tab.id ? 'bg-white/25 text-white' : 'bg-[#F0F2F5] text-[#6B7280]'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex gap-5 min-h-[600px]">
        {/* Messages List */}
        <div className="flex-1 bg-white rounded-[16px] border border-[#E2EAF1] overflow-hidden" style={{ boxShadow: '0px 4px 20px rgba(191, 197, 209, 0.15)' }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-[56px] h-[56px] rounded-full bg-[#F0F2F5] flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-[15px] font-semibold text-[#6B7280]">No messages found</p>
              <p className="text-[13px] text-[#B0B7C3] mt-1">Support messages will appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0F2F5] max-h-[700px] overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedMessage(msg)
                    setReplyText('')
                    // Mark as read when opened
                    if (msg.status === 'open') {
                      handleStatusChange(msg.id, 'read')
                    }
                  }}
                  className={`px-5 py-4 cursor-pointer transition-all hover:bg-[#F8FAFB] ${
                    selectedMessage?.id === msg.id ? 'bg-[#F0FDFB] border-l-[3px] border-l-[#0FBCC0]' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[14px] font-semibold text-[#36383A] truncate">{msg.name}</span>
                        {msg.status === 'open' && (
                          <span className="w-2 h-2 rounded-full bg-[#F59E0B] flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-[12px] text-[#8C939E] truncate">{msg.email}</p>
                      <p className="text-[13px] text-[#4B4B4B] mt-1.5 line-clamp-2">{msg.message}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getStatusColor(msg.status)}`}>
                        {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                      </span>
                      <span className="text-[11px] text-[#B0B7C3]">{formatDate(msg.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Detail Panel */}
        {selectedMessage && (
          <div className="w-[400px] bg-white rounded-[16px] border border-[#E2EAF1] overflow-hidden flex-shrink-0" style={{ boxShadow: '0px 4px 20px rgba(191, 197, 209, 0.15)' }}>
            <div className="px-5 py-4 border-b border-[#F0F2F5]">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-[#36383A]">Message Details</h3>
                <button
                  onClick={() => { setSelectedMessage(null); setReplyText('') }}
                  className="w-[28px] h-[28px] rounded-full bg-[#F0F2F5] flex items-center justify-center hover:bg-[#E2EAF1] transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Sender Info */}
              <div className="flex items-center gap-3">
                <div
                  className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-white text-[15px] font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #2DD9B6 0%, #22B9CF 100%)' }}
                >
                  {selectedMessage.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#36383A]">{selectedMessage.name}</p>
                  <p className="text-[12px] text-[#8C939E] truncate">{selectedMessage.email}</p>
                </div>
              </div>

              {selectedMessage.user && (
                <div className="bg-[#F8FAFB] rounded-[10px] px-3 py-2 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="text-[12px] text-[#0FBCC0] font-medium">
                    Registered User #{selectedMessage.user.userId}
                  </span>
                </div>
              )}

              {/* Status & Priority */}
              <div className="flex gap-2">
                <select
                  value={selectedMessage.status}
                  onChange={(e) => handleStatusChange(selectedMessage.id, e.target.value)}
                  className={`text-[12px] font-bold px-3 py-1.5 rounded-full border outline-none cursor-pointer ${getStatusColor(selectedMessage.status)}`}
                >
                  <option value="open">Open</option>
                  <option value="read">Read</option>
                  <option value="replied">Replied</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={selectedMessage.priority}
                  onChange={(e) => handlePriorityChange(selectedMessage.id, e.target.value)}
                  className={`text-[12px] font-bold px-3 py-1.5 rounded-full border outline-none cursor-pointer ${getPriorityColor(selectedMessage.priority)}`}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <p className="text-[12px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">Message</p>
                <div className="bg-[#F8FAFB] rounded-[12px] p-4">
                  <p className="text-[14px] text-[#36383A] leading-relaxed whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>
                <p className="text-[11px] text-[#B0B7C3] mt-1.5">
                  Sent {formatDate(selectedMessage.createdAt)}
                </p>
              </div>

              {/* Admin Reply (if exists) */}
              {selectedMessage.adminReply && (
                <div>
                  <p className="text-[12px] font-semibold text-[#059669] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Admin Reply
                  </p>
                  <div className="bg-[#ECFDF5] rounded-[12px] p-4 border border-[#A7F3D0]">
                    <p className="text-[14px] text-[#36383A] leading-relaxed whitespace-pre-wrap">{selectedMessage.adminReply}</p>
                    <p className="text-[11px] text-[#6EE7B7] mt-2">
                      Replied by {selectedMessage.repliedBy} {selectedMessage.repliedAt ? formatDate(selectedMessage.repliedAt) : ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Reply Input */}
              <div>
                <p className="text-[12px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wide">Reply</p>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-[12px] border border-[#E2EAF1] bg-[#FAFBFC] text-[14px] text-[#36383A] font-medium outline-none transition-all duration-200 focus:border-[#0FBCC0] focus:shadow-[0_0_0_3px_rgba(15,188,192,0.1)] focus:bg-white placeholder:text-[#B0B7C3] placeholder:font-normal resize-none"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleReply}
                    disabled={!replyText.trim() || replying}
                    className="flex-1 h-[40px] rounded-[10px] text-[13px] font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md"
                    style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                  >
                    {replying ? 'Sending...' : 'Send Reply'}
                  </button>
                  <button
                    onClick={() => handleDelete(selectedMessage.id)}
                    className="h-[40px] px-4 rounded-[10px] text-[13px] font-semibold text-[#EF4444] bg-[#FEF2F2] border border-[#FECACA] hover:bg-[#FEE2E2] transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
