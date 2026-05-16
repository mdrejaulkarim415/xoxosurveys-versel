'use client'

import { useApp } from '@/app/page'
import { useState } from 'react'

const languages = [
  'English (en)', 'German (de)', 'Spanish (es)', 'French (fr)', 'Portuguese (pt)',
  'Italian (it)', 'Dutch (nl)', 'Polish (pl)', 'Russian (ru)', 'Japanese (ja)',
  'Korean (ko)', 'Chinese (simplified) (zh)', 'Arabic (ar)', 'Hindi (hi)',
  'Turkish (tr)', 'Swedish (sv)', 'Norwegian (no)', 'Danish (da)',
  'Finnish (fi)', 'Bengali (bn)',
]

export function SettingsPage() {
  const { state, setState } = useApp()
  const [email, setEmail] = useState(state.user.email)
  const [firstname, setFirstname] = useState('')
  const [lastname, setLastname] = useState('')
  const [language, setLanguage] = useState(state.user.language)
  const [newsletter, setNewsletter] = useState('Yes')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)

  const handleResendVerification = async () => {
    setResendLoading(true)
    setResendMessage(null)
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: state.user.email }),
      })
      const data = await res.json()
      if (res.ok) {
        setResendMessage('Verification email sent! Check your inbox.')
      } else {
        setResendMessage(data.error || 'Failed to send verification email')
      }
    } catch {
      setResendMessage('Failed to send verification email. Please try again.')
    } finally {
      setResendLoading(false)
    }
  }

  const handleSave = () => {
    setState(prev => ({
      ...prev,
      user: { ...prev.user, email, language },
    }))
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleChangePassword = () => {
    if (newPassword && newPassword === confirmPassword) {
      setPasswordChanged(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordChanged(false), 3000)
    }
  }

  return (
    <div className="max-w-[600px]">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-[24px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
          Settings
        </h1>
      </div>

      {/* Email Verification Section */}
      {!state.user.emailVerified && (
        <div
          className="rounded-[12px] border border-[#F59E0B]/30 p-5 mb-6"
          style={{ background: '#FFFBEB', boxShadow: '0px 4px 20px 0px rgba(245, 158, 11, 0.08)' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-[36px] h-[36px] rounded-full bg-[#F59E0B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-[#92400E] mb-1">Verify Your Email</h3>
              <p className="text-[13px] text-[#78350F] mb-3">
                Your email <span className="font-semibold">{state.user.email}</span> is not verified. You need to verify your email before you can cash out your earnings.
              </p>
              {resendMessage && (
                <p className={`text-[13px] mb-2 ${resendMessage.includes('sent') ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                  {resendMessage}
                </p>
              )}
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="h-[36px] px-4 rounded-[8px] text-[13px] font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
              >
                {resendLoading ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Section */}
      <div
        className="bg-white rounded-[12px] border border-[#E2EAF1] p-6 mb-6"
        style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
      >
        <h2 className="text-[16px] font-semibold text-[#36383A] mb-5" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Profile</h2>

        {/* Email */}
        <div className="mb-5">
          <label className="block text-[14px] font-medium text-[#4B4B4B] mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="ns-input"
          />
        </div>

        {/* Name fields - two column */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-[14px] font-medium text-[#4B4B4B] mb-2">Firstname</label>
            <input
              type="text"
              value={firstname}
              onChange={(e) => setFirstname(e.target.value)}
              placeholder="Enter firstname"
              className="ns-input"
            />
          </div>
          <div>
            <label className="block text-[14px] font-medium text-[#4B4B4B] mb-2">Lastname</label>
            <input
              type="text"
              value={lastname}
              onChange={(e) => setLastname(e.target.value)}
              placeholder="Enter lastname"
              className="ns-input"
            />
          </div>
        </div>

        {/* Language */}
        <div className="mb-5">
          <label className="block text-[14px] font-medium text-[#4B4B4B] mb-2">Language</label>
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="ns-input appearance-none pr-10"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
        </div>

        {/* Newsletter */}
        <div className="mb-6">
          <label className="block text-[14px] font-medium text-[#4B4B4B] mb-2">Newsletter</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNewsletter('Yes')}
              className="px-4 py-2 rounded-[8px] text-[14px] font-medium transition-all"
              style={{
                background: newsletter === 'Yes' ? 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' : '#F5F5F5',
                color: newsletter === 'Yes' ? '#FFFFFF' : '#4B4B4B',
              }}
            >
              Yes
            </button>
            <button
              onClick={() => setNewsletter('No')}
              className="px-4 py-2 rounded-[8px] text-[14px] font-medium transition-all"
              style={{
                background: newsletter === 'No' ? 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' : '#F5F5F5',
                color: newsletter === 'No' ? '#FFFFFF' : '#4B4B4B',
              }}
            >
              No
            </button>
          </div>
        </div>

        {/* Save Button - gradient style */}
        <button
          onClick={handleSave}
          className="ns-btn-primary h-[44px] px-8"
        >
          {saved ? (
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved!
            </span>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>

      {/* Change Password Section */}
      <div
        className="bg-white rounded-[12px] border border-[#E2EAF1] p-6 mb-6"
        style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
      >
        <h2 className="text-[16px] font-semibold text-[#36383A] mb-5" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Reset Password</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-[14px] font-medium text-[#4B4B4B] mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="ns-input"
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#4B4B4B] mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="ns-input"
            />
          </div>

          <div>
            <label className="block text-[14px] font-medium text-[#4B4B4B] mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="ns-input"
            />
          </div>

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[13px] text-[#EF4444]">Passwords do not match</p>
          )}

          <button
            onClick={handleChangePassword}
            disabled={!currentPassword || !newPassword || newPassword !== confirmPassword}
            className="ns-btn-primary h-[44px] px-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {passwordChanged ? (
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Password Changed!
              </span>
            ) : (
              'Change Password'
            )}
          </button>
        </div>
      </div>

      {/* Account Overview */}
      <div
        className="bg-white rounded-[12px] border border-[#E2EAF1] p-6 mb-6"
        style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
      >
        <h2 className="text-[16px] font-semibold text-[#36383A] mb-4" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Account Overview</h2>
        <div className="space-y-0">
          <div className="flex justify-between items-center py-3 border-b border-[#E2EAF1]">
            <span className="text-[14px] text-[#999999]">User ID</span>
            <span className="text-[14px] font-semibold text-[#0FBCC0]">#{state.user.userId}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-[#E2EAF1]">
            <span className="text-[14px] text-[#999999]">Email</span>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-medium text-[#36383A]">{state.user.email}</span>
              {state.user.emailVerified ? (
                <span className="inline-flex items-center gap-1 bg-[#ECFDF5] text-[#059669] px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-[#FEF3C7] text-[#D97706] px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  Unverified
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-[#E2EAF1]">
            <span className="text-[14px] text-[#999999]">Current Balance</span>
            <span className="text-[14px] font-semibold text-[#0FBCC0]">${state.user.balance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-[#E2EAF1]">
            <span className="text-[14px] text-[#999999]">Surveys Completed</span>
            <span className="text-[14px] font-medium text-[#36383A]">{state.user.surveysCompleted}/{state.user.surveyTarget}</span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-[#E2EAF1]">
            <span className="text-[14px] text-[#999999]">Total Earned</span>
            <span className="text-[14px] font-medium text-[#36383A]">${state.user.totalEarned.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-[14px] text-[#999999]">Language</span>
            <span className="text-[14px] font-medium text-[#36383A]">{state.user.language}</span>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <button className="text-[14px] text-[#999999] hover:text-[#EF4444] transition-colors">
        Delete my account
      </button>
    </div>
  )
}
