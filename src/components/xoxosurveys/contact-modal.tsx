'use client'

import { useState } from 'react'

export function ContactModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    if (!message.trim()) {
      setError('Message is required')
      return
    }
    if (message.trim().length < 10) {
      setError('Message must be at least 10 characters')
      return
    }

    setSending(true)
    setError(null)

    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send message. Please try again.')
        return
      }

      setSent(true)
      setTimeout(() => {
        onClose()
      }, 3000)
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-[16px] w-full max-w-[480px] overflow-hidden z-10"
        style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.30)' }}
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
        <div
          className="p-6 pb-4 border-b border-[#E2EAF1]"
          style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-white" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                Contact Us
              </h2>
              <p className="text-[12px] text-white/80 mt-0.5">
                We&apos;ll get back to you within 24 hours
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {sent ? (
            <div className="text-center py-6">
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(45,217,182,0.15) 0%, rgba(34,185,207,0.15) 100%)' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2DD9B6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </div>
              <h3 className="text-[18px] font-bold text-[#36383A] mb-2">Message Sent!</h3>
              <p className="text-[14px] text-[#6B7280]">
                Thank you for reaching out. We&apos;ll respond to your message as soon as possible.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* ===== Quick Contact Options ===== */}
              <div className="space-y-3">
                {/* Telegram Button */}
                <a
                  href="https://t.me/XoXoSurveysSupport"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full p-3.5 rounded-[12px] border-2 border-[#0088cc]/20 bg-[#E8F4FD] hover:bg-[#D6ECFA] hover:border-[#0088cc]/40 transition-all group"
                >
                  <div
                    className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #0088cc 0%, #0066aa 100%)', boxShadow: '0 2px 8px rgba(0,136,204,0.3)' }}
                  >
                    {/* Telegram Icon */}
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-[#0066aa] group-hover:text-[#004488] transition-colors">
                      Chat on Telegram
                    </p>
                    <p className="text-[12px] text-[#0088cc]/70 mt-0.5">
                      @XoXoSurveysSupport — Instant reply
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0088cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 group-hover:translate-x-0.5 transition-transform">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </a>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-[#E2EAF1]" />
                <span className="text-[12px] text-[#999999] font-medium">or send a message</span>
                <div className="flex-1 h-px bg-[#E2EAF1]" />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] text-[13px] text-[#DC2626]">
                  {error}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-[13px] font-semibold text-[#36383A] mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); setError(null) }}
                  disabled={sending}
                  className="w-full h-[42px] px-3.5 rounded-[10px] border border-[#E2EAF1] bg-[#F9FAFB] text-[14px] text-[#36383A] placeholder:text-[#999999] focus:outline-none focus:border-[#0FBCC0] focus:ring-1 focus:ring-[#0FBCC0]/20 transition-all disabled:opacity-50"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-[13px] font-semibold text-[#36383A] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null) }}
                  disabled={sending}
                  className="w-full h-[42px] px-3.5 rounded-[10px] border border-[#E2EAF1] bg-[#F9FAFB] text-[14px] text-[#36383A] placeholder:text-[#999999] focus:outline-none focus:border-[#0FBCC0] focus:ring-1 focus:ring-[#0FBCC0]/20 transition-all disabled:opacity-50"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-[13px] font-semibold text-[#36383A] mb-1.5">
                  Message
                </label>
                <textarea
                  placeholder="How can we help you?"
                  value={message}
                  onChange={(e) => { setMessage(e.target.value); setError(null) }}
                  disabled={sending}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-[10px] border border-[#E2EAF1] bg-[#F9FAFB] text-[14px] text-[#36383A] placeholder:text-[#999999] focus:outline-none focus:border-[#0FBCC0] focus:ring-1 focus:ring-[#0FBCC0]/20 transition-all resize-none disabled:opacity-50"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={sending}
                className="w-full h-[44px] rounded-[10px] text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
              >
                {sending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    Send Message
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
