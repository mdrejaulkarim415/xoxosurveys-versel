'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/app/page'
import { useTelegramUsername } from '@/hooks/use-telegram-username'

interface UserSupportMessage {
  id: string
  message: string
  status: string
  adminReply: string | null
  repliedBy: string | null
  createdAt: string
  repliedAt: string | null
}

const faqItems = [
  {
    question: 'How do I start earning money?',
    answer: 'Simply sign up for a free account, complete your profile, and start taking surveys. Each survey you complete earns you real money that you can cash out through various gift cards and payment methods.',
  },
  {
    question: 'How much can I earn per survey?',
    answer: 'Earnings vary by survey length and complexity. Shorter surveys (8-12 minutes) typically pay $1-$2, while longer surveys (15-25 minutes) can pay $3-$5 or more. The exact amount is displayed before you start each survey.',
  },
  {
    question: 'How do I cash out my earnings?',
    answer: 'Go to the Cashout section in your dashboard and select a gift card or payment method. Enter the amount you want to withdraw (minimum $5 for most options), confirm, and your payment will be processed within 24-48 hours.',
  },
  {
    question: 'Why am I not getting any surveys?',
    answer: 'Survey availability depends on your profile, location, and current research needs. Make sure your profile is complete and accurate. New surveys are added regularly, so check back often. Some surveys may have limited spots available.',
  },
  {
    question: 'How does the referral program work?',
    answer: 'You can invite friends using your unique invitation code. When they sign up and complete surveys, you earn 10% of their survey earnings forever. Your friend also gets a 10% bonus on their earnings for the first 7 days.',
  },
  {
    question: 'Is my personal information safe?',
    answer: 'Yes, we take privacy seriously. Your personal information is encrypted and never shared with third parties without your consent. Survey responses are anonymized before being shared with researchers.',
  },
  {
    question: 'Why was I disqualified from a survey?',
    answer: 'Surveys often target specific demographics. If your profile doesn\'t match the survey requirements, you may be disqualified early. This is normal and not a reflection of your account status. You\'ll still have access to other surveys.',
  },
  {
    question: 'How long does it take to receive my payment?',
    answer: 'Most payments are processed within 24-48 hours. Virtual gift cards are usually delivered instantly via email, while physical cards and bank transfers may take 3-5 business days.',
  },
]

export function HelpPage() {
  const { state } = useApp()
  const telegramUsername = useTelegramUsername()
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [contactForm, setContactForm] = useState({
    name: `${state.user.firstname || ''} ${state.user.lastname || ''}`.trim(),
    email: state.user.email || '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  // Message history state
  const [supportMessages, setSupportMessages] = useState<UserSupportMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(true)
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'messages'>('faq')

  // Fetch user's support messages
  const fetchMessages = async () => {
    try {
      const userId = localStorage.getItem('userId')
      if (!userId) {
        setMessagesLoading(false)
        return
      }

      const res = await fetch(`/api/support/messages?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setSupportMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch support messages:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [])

  const handleSubmit = async () => {
    setSending(true)
    setSendError(null)

    try {
      const userId = localStorage.getItem('userId')
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          message: contactForm.message,
          userId: userId || undefined,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSubmitted(true)
        setContactForm(prev => ({ ...prev, message: '' }))
        setTimeout(() => setSubmitted(false), 4000)
        // Refresh message list
        fetchMessages()
      } else {
        setSendError(data.error || 'Failed to send message. Please try again.')
      }
    } catch {
      setSendError('Network error. Please check your connection and try again.')
    } finally {
      setSending(false)
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" /> Open
        </span>
      case 'read':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" /> Read
        </span>
      case 'replied':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" /> Replied
        </span>
      case 'closed':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" /> Closed
        </span>
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]">{status}</span>
    }
  }

  const repliedCount = supportMessages.filter(m => m.adminReply).length

  const inputStyle = "w-full h-[48px] px-4 rounded-[12px] border border-[#E2EAF1] bg-[#FAFBFC] text-[14px] text-[#36383A] font-medium outline-none transition-all duration-200 focus:border-[#0FBCC0] focus:shadow-[0_0_0_3px_rgba(15,188,192,0.1)] focus:bg-white placeholder:text-[#B0B7C3] placeholder:font-normal"
  const labelStyle = "block text-[13px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wide"

  return (
    <div className="max-w-[640px]">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
          Help Center
        </h1>
        <p className="text-[14px] text-[#8C939E] mt-1">Find answers and get support</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all ${
            activeTab === 'faq'
              ? 'text-white shadow-sm'
              : 'bg-white border border-[#E2EAF1] text-[#6B7280] hover:bg-[#F8FAFB]'
          }`}
          style={activeTab === 'faq' ? { background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' } : undefined}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          FAQ
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all ${
            activeTab === 'contact'
              ? 'text-white shadow-sm'
              : 'bg-white border border-[#E2EAF1] text-[#6B7280] hover:bg-[#F8FAFB]'
          }`}
          style={activeTab === 'contact' ? { background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' } : undefined}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Contact
        </button>
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-[12px] text-[13px] font-semibold transition-all relative ${
            activeTab === 'messages'
              ? 'text-white shadow-sm'
              : 'bg-white border border-[#E2EAF1] text-[#6B7280] hover:bg-[#F8FAFB]'
          }`}
          style={activeTab === 'messages' ? { background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' } : undefined}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          My Messages
          {repliedCount > 0 && (
            <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold ${
              activeTab === 'messages' ? 'bg-white/25 text-white' : 'bg-[#0FBCC0] text-white'
            }`}>
              {repliedCount}
            </span>
          )}
        </button>
      </div>

      {/* ============ FAQ Tab ============ */}
      {activeTab === 'faq' && (
        <div
          className="bg-white rounded-[20px] border border-[#E2EAF1] overflow-hidden mb-6"
          style={{ boxShadow: '0px 4px 24px 0px rgba(191, 197, 209, 0.18)' }}
        >
          {/* Section Header */}
          <div className="px-7 pt-7 pb-5 border-b border-[#F0F2F5]">
            <div className="flex items-center gap-3">
              <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                  Frequently Asked Questions
                </h2>
                <p className="text-[13px] text-[#8C939E]">Quick answers to common questions</p>
              </div>
            </div>
          </div>

          <div className="px-7 py-5">
            <div className="space-y-2">
              {faqItems.map((item, index) => {
                const isOpen = openFaq === index
                return (
                  <div
                    key={index}
                    className="rounded-[12px] overflow-hidden transition-all"
                    style={{
                      background: isOpen ? '#F0FDFB' : '#FFFFFF',
                      border: isOpen ? '1px solid #E2EAF1' : '1px solid #E2EAF1',
                      borderLeftWidth: isOpen ? '3px' : '1px',
                      borderLeftColor: isOpen ? '#0FBCC0' : '#E2EAF1',
                      borderRightColor: '#E2EAF1',
                      borderTopColor: '#E2EAF1',
                      borderBottomColor: '#E2EAF1',
                    }}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
                    >
                      <span className={`text-[14px] font-medium ${isOpen ? 'text-[#0FBCC0]' : 'text-[#36383A]'}`}>
                        {item.question}
                      </span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={isOpen ? '#0FBCC0' : '#999999'}
                        strokeWidth="2"
                        className={`transform transition-transform flex-shrink-0 ml-3 ${isOpen ? 'rotate-180' : ''}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-3.5">
                        <p className="text-[14px] text-[#4B4B4B] leading-relaxed">{item.answer}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============ Contact Tab ============ */}
      {activeTab === 'contact' && (
        <div
          className="bg-white rounded-[20px] border border-[#E2EAF1] overflow-hidden mb-6"
          style={{ boxShadow: '0px 4px 24px 0px rgba(191, 197, 209, 0.18)' }}
        >
          {/* Section Header */}
          <div className="px-7 pt-7 pb-5 border-b border-[#F0F2F5]">
            <div className="flex items-center gap-3">
              <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2DD9B6 0%, #22B9CF 100%)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-[18px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                  Contact Support
                </h2>
                <p className="text-[13px] text-[#8C939E]">We&apos;re here to help you</p>
              </div>
            </div>
          </div>

          <div className="px-7 py-6">
            {/* Telegram Quick Contact */}
            <a
              href={`https://t.me/${telegramUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-[14px] mb-5 hover:shadow-md transition-all active:scale-[0.99]"
              style={{ background: '#0088cc' }}
            >
              <div className="w-[44px] h-[44px] rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-bold text-white">Contact via Telegram</p>
                <p className="text-[12px] text-white/80 mt-0.5">Fastest response — usually within minutes</p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 opacity-70">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>

            {/* Divider with "or" */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-[#E2EAF1]"></div>
              <span className="text-[12px] text-[#B0B7C3] font-medium">or send a message</span>
              <div className="flex-1 h-px bg-[#E2EAF1]"></div>
            </div>

            {submitted ? (
              <div className="text-center py-8">
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
              </div>
            ) : (
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label className={labelStyle}>Name</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                      className={`${inputStyle} pl-11`}
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className={labelStyle}>Email</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Your email"
                      className={`${inputStyle} pl-11`}
                    />
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className={labelStyle}>Message</label>
                  <div className="relative">
                    <div className="absolute left-4 top-4">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </div>
                    <textarea
                      value={contactForm.message}
                      onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Describe your issue..."
                      rows={5}
                      className="w-full px-4 pl-11 py-3.5 rounded-[12px] border border-[#E2EAF1] bg-[#FAFBFC] text-[14px] text-[#36383A] font-medium outline-none transition-all duration-200 focus:border-[#0FBCC0] focus:shadow-[0_0_0_3px_rgba(15,188,192,0.1)] focus:bg-white placeholder:text-[#B0B7C3] placeholder:font-normal resize-none"
                    />
                  </div>
                </div>

                {/* Error message */}
                {sendError && (
                  <div className="p-4 rounded-[12px] bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                    <p className="text-[13px] text-[#DC2626] font-medium">{sendError}</p>
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={handleSubmit}
                  disabled={!contactForm.name || !contactForm.email || !contactForm.message || sending}
                  className="w-full h-[50px] rounded-[14px] text-[15px] font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)', boxShadow: '0px 4px 14px rgba(15, 188, 192, 0.35)' }}
                >
                  {sending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" />
                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      Send Message
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ Messages Tab ============ */}
      {activeTab === 'messages' && (
        <div
          className="bg-white rounded-[20px] border border-[#E2EAF1] overflow-hidden mb-6"
          style={{ boxShadow: '0px 4px 24px 0px rgba(191, 197, 209, 0.18)' }}
        >
          {/* Section Header */}
          <div className="px-7 pt-7 pb-5 border-b border-[#F0F2F5]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2DD9B6 0%, #22B9CF 100%)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                    My Messages
                  </h2>
                  <p className="text-[13px] text-[#8C939E]">Your support conversations</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('contact')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[12px] font-semibold text-white"
                style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Message
              </button>
            </div>
          </div>

          <div className="px-7 py-5">
            {messagesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-10 h-10 border-3 border-[#2DD9B6] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : supportMessages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-[56px] h-[56px] rounded-full bg-[#F0F2F5] flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <p className="text-[15px] font-semibold text-[#6B7280]">No messages yet</p>
                <p className="text-[13px] text-[#B0B7C3] mt-1">Your support messages will appear here</p>
                <button
                  onClick={() => setActiveTab('contact')}
                  className="mt-4 px-5 py-2 rounded-[10px] text-[13px] font-semibold text-white"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  Send a Message
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {supportMessages.map((msg) => {
                  const isExpanded = expandedMessage === msg.id
                  const hasReply = !!msg.adminReply

                  return (
                    <div
                      key={msg.id}
                      className="rounded-[14px] overflow-hidden transition-all"
                      style={{
                        border: hasReply ? '1px solid #A7F3D0' : '1px solid #E2EAF1',
                        borderLeftWidth: hasReply ? '3px' : '1px',
                        borderLeftColor: hasReply ? '#059669' : '#E2EAF1',
                      }}
                    >
                      {/* Message Header - Clickable */}
                      <button
                        onClick={() => setExpandedMessage(isExpanded ? null : msg.id)}
                        className="w-full px-5 py-4 text-left hover:bg-[#F8FAFB] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusBadge(msg.status)}
                              <span className="text-[11px] text-[#B0B7C3]">{formatDate(msg.createdAt)}</span>
                            </div>
                            <p className="text-[14px] text-[#36383A] line-clamp-2 mt-1.5">{msg.message}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {hasReply && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669]">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Replied
                              </span>
                            )}
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#B0B7C3"
                              strokeWidth="2"
                              className={`transform transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </div>
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-5 pb-5 space-y-4 border-t border-[#F0F2F5]">
                          {/* Original Message */}
                          <div className="pt-4">
                            <p className="text-[12px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                              Your Message
                            </p>
                            <div className="bg-[#F8FAFB] rounded-[12px] p-4">
                              <p className="text-[14px] text-[#36383A] leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                            </div>
                            <p className="text-[11px] text-[#B0B7C3] mt-1.5">
                              Sent {formatDate(msg.createdAt)}
                            </p>
                          </div>

                          {/* Admin Reply */}
                          {msg.adminReply && (
                            <div>
                              <p className="text-[12px] font-semibold text-[#059669] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                Admin Reply
                              </p>
                              <div className="bg-[#ECFDF5] rounded-[12px] p-4 border border-[#A7F3D0]">
                                <p className="text-[14px] text-[#36383A] leading-relaxed whitespace-pre-wrap">{msg.adminReply}</p>
                                <p className="text-[11px] text-[#6EE7B7] mt-2">
                                  Replied by {msg.repliedBy || 'admin'} {msg.repliedAt ? formatDate(msg.repliedAt) : ''}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* No reply yet */}
                          {!msg.adminReply && msg.status !== 'closed' && (
                            <div className="bg-[#FFFBEB] border border-[#F59E0B30] rounded-[12px] p-4">
                              <p className="text-[13px] text-[#92400E] font-medium flex items-center gap-2">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10" />
                                  <polyline points="12 6 12 12 16 14" />
                                </svg>
                                Awaiting response from our team
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
