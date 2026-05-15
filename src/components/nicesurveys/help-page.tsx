'use client'

import { useState } from 'react'

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
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    setSubmitted(true)
    setContactForm({ name: '', email: '', message: '' })
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <div className="max-w-3xl">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
          Help Center
        </h1>
        <p className="text-[14px] text-[#999999] mt-1">Find answers to common questions</p>
      </div>

      {/* FAQ Section - cards with 12px border-radius, active = 3px teal border-left */}
      <div
        className="bg-white rounded-[12px] border border-[#E2EAF1] p-6 mb-6"
        style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
      >
        <h2 className="text-[16px] font-semibold text-[#36383A] mb-4" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
          Frequently Asked Questions
        </h2>
        <div className="space-y-2">
          {faqItems.map((item, index) => {
            const isOpen = openFaq === index
            return (
              <div
                key={index}
                className="rounded-[12px] overflow-hidden transition-all"
                style={{
                  borderLeft: isOpen ? '3px solid #0FBCC0' : '3px solid transparent',
                  background: isOpen ? '#F0FDFB' : '#FFFFFF',
                  border: isOpen ? undefined : '1px solid #E2EAF1',
                  borderBottom: isOpen ? '1px solid #E2EAF1' : undefined,
                  borderRight: isOpen ? '1px solid #E2EAF1' : undefined,
                  borderTop: isOpen ? '1px solid #E2EAF1' : undefined,
                  borderLeftWidth: isOpen ? '3px' : '1px',
                  borderLeftColor: isOpen ? '#0FBCC0' : '#E2EAF1',
                  borderRightColor: isOpen ? '#E2EAF1' : '#E2EAF1',
                  borderTopColor: isOpen ? '#E2EAF1' : '#E2EAF1',
                  borderBottomColor: isOpen ? '#E2EAF1' : '#E2EAF1',
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

      {/* Contact Form */}
      <div
        className="bg-white rounded-[12px] border border-[#E2EAF1] p-6"
        style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
      >
        <h2 className="text-[16px] font-semibold text-[#36383A] mb-4" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
          Contact Support
        </h2>

        {submitted ? (
          <div className="text-center py-8">
            <div
              className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-[16px] font-semibold text-[#36383A]">Message sent successfully!</p>
            <p className="text-[14px] text-[#999999] mt-1">We&apos;ll get back to you within 24 hours.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-[14px] font-medium text-[#4B4B4B] mb-2">Name</label>
              <input
                type="text"
                value={contactForm.name}
                onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Your name"
                className="ns-input"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#4B4B4B] mb-2">Email</label>
              <input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Your email"
                className="ns-input"
              />
            </div>
            <div>
              <label className="block text-[14px] font-medium text-[#4B4B4B] mb-2">Message</label>
              <textarea
                value={contactForm.message}
                onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Describe your issue..."
                rows={4}
                className="w-full px-4 py-3 rounded-[8px] border border-[#E2EAF1] bg-white text-[14px] text-[#444444] focus:border-[#0CCFC3] focus:outline-none focus:shadow-[0_0_0_1px_#0CCFC3] resize-none transition-colors"
                style={{ boxShadow: '0px 4px 20px 0px rgba(176, 180, 186, 0.25)' }}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!contactForm.name || !contactForm.email || !contactForm.message}
              className="ns-btn-primary h-[44px] px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send Message
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
