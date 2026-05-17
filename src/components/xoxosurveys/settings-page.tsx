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
  const { state, setState, refreshUser } = useApp()
  const [firstname, setFirstname] = useState(state.user.firstname || '')
  const [lastname, setLastname] = useState(state.user.lastname || '')
  const [language, setLanguage] = useState(state.user.language)
  const [newsletter, setNewsletter] = useState(state.user.newsletter || 'Yes')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaved(false)

    try {
      const userId = localStorage.getItem('userId')
      if (!userId) {
        setSaveError('Not authenticated. Please log in again.')
        return
      }

      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, firstname, lastname, language, newsletter }),
      })

      const data = await res.json()

      if (res.ok) {
        setState(prev => ({
          ...prev,
          user: {
            ...prev.user,
            firstname: data.firstname ?? firstname,
            lastname: data.lastname ?? lastname,
            language: data.language ?? language,
            newsletter: data.newsletter ?? newsletter,
          },
        }))

        const cachedData = localStorage.getItem('userData')
        let parsed = cachedData ? JSON.parse(cachedData) : {}
        parsed.firstname = data.firstname ?? firstname
        parsed.lastname = data.lastname ?? lastname
        parsed.language = data.language ?? language
        parsed.newsletter = data.newsletter ?? newsletter
        localStorage.setItem('userData', JSON.stringify(parsed))

        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        setSaveError(data.error || 'Failed to save changes. Please try again.')
      }
    } catch {
      setSaveError('Network error. Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) return

    setPasswordChanging(true)
    setPasswordError(null)
    setPasswordChanged(false)

    try {
      const userId = localStorage.getItem('userId')
      if (!userId) {
        setPasswordError('Not authenticated. Please log in again.')
        return
      }

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, currentPassword, newPassword }),
      })

      const data = await res.json()

      if (res.ok) {
        setPasswordChanged(true)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setPasswordChanged(false), 3000)
      } else {
        setPasswordError(data.error || 'Failed to change password. Please try again.')
      }
    } catch {
      setPasswordError('Network error. Please check your connection and try again.')
    } finally {
      setPasswordChanging(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      const userId = localStorage.getItem('userId')
      if (!userId) {
        setDeleteError('Not authenticated. Please log in again.')
        return
      }
      const res = await fetch('/api/user/profile', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (res.ok) {
        localStorage.removeItem('sessionToken')
        localStorage.removeItem('userId')
        localStorage.removeItem('numericUserId')
        localStorage.removeItem('userEmail')
        localStorage.removeItem('userRole')
        localStorage.removeItem('userData')
        window.location.reload()
      } else {
        const data = await res.json()
        setDeleteError(data.error || 'Failed to delete account. Please contact support.')
      }
    } catch {
      setDeleteError('Network error. Please try again.')
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const PasswordToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#0FBCC0] transition-colors"
    >
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  )

  const inputStyle = "w-full h-[48px] px-4 rounded-[12px] border border-[#E2EAF1] bg-[#FAFBFC] text-[14px] text-[#36383A] font-medium outline-none transition-all duration-200 focus:border-[#0FBCC0] focus:shadow-[0_0_0_3px_rgba(15,188,192,0.1)] focus:bg-white placeholder:text-[#B0B7C3] placeholder:font-normal"
  const readOnlyInputStyle = "w-full h-[48px] px-4 rounded-[12px] border border-[#E2EAF1] bg-[#F0F2F5] text-[14px] text-[#8C939E] font-medium cursor-not-allowed"
  const labelStyle = "block text-[13px] font-semibold text-[#6B7280] mb-2 uppercase tracking-wide"

  return (
    <div className="max-w-[640px]">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
          Settings
        </h1>
        <p className="text-[14px] text-[#8C939E] mt-1">Manage your account preferences and security</p>
      </div>

      {/* Email Verification Banner */}
      {!state.user.emailVerified && (
        <div className="rounded-[16px] p-5 mb-6 bg-gradient-to-r from-[#FFF7ED] to-[#FFFBEB] border border-[#FDBA74]/40">
          <div className="flex items-start gap-4">
            <div className="w-[44px] h-[44px] rounded-full bg-[#F59E0B]/15 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-[#92400E] mb-1">Verify Your Email</h3>
              <p className="text-[13px] text-[#78350F] mb-3">
                Your email <span className="font-semibold">{state.user.email}</span> is not verified. Verify to enable cashouts.
              </p>
              {resendMessage && (
                <p className={`text-[13px] mb-2 ${resendMessage.includes('sent') ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                  {resendMessage}
                </p>
              )}
              <button
                onClick={handleResendVerification}
                disabled={resendLoading}
                className="h-[36px] px-5 rounded-[10px] text-[13px] font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
                style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
              >
                {resendLoading ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ Profile Section ============ */}
      <div className="bg-white rounded-[20px] border border-[#E2EAF1] overflow-hidden mb-6" style={{ boxShadow: '0px 4px 24px 0px rgba(191, 197, 209, 0.18)' }}>
        {/* Section Header with gradient accent */}
        <div className="px-7 pt-7 pb-5 border-b border-[#F0F2F5]">
          <div className="flex items-center gap-3">
            <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2DD9B6 0%, #22B9CF 100%)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Profile</h2>
              <p className="text-[13px] text-[#8C939E]">Your personal information</p>
            </div>
          </div>
        </div>

        <div className="px-7 py-6">
          {/* Email - Read Only */}
          <div className="mb-6">
            <label className={labelStyle}>Email Address</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8C939E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <input
                type="email"
                value={state.user.email}
                readOnly
                className={`${readOnlyInputStyle} pl-11`}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                {state.user.emailVerified ? (
                  <span className="inline-flex items-center gap-1 bg-[#ECFDF5] text-[#059669] px-2 py-0.5 rounded-full text-[11px] font-bold">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-[#FEF3C7] text-[#D97706] px-2 py-0.5 rounded-full text-[11px] font-bold">
                    Unverified
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Name fields - two column */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className={labelStyle}>First Name</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={firstname}
                  onChange={(e) => setFirstname(e.target.value)}
                  placeholder="First name"
                  className={`${inputStyle} pl-11`}
                />
              </div>
            </div>
            <div>
              <label className={labelStyle}>Last Name</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={lastname}
                  onChange={(e) => setLastname(e.target.value)}
                  placeholder="Last name"
                  className={`${inputStyle} pl-11`}
                />
              </div>
            </div>
          </div>

          {/* Language */}
          <div className="mb-6">
            <label className={labelStyle}>Language</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`${inputStyle} pl-11 appearance-none pr-10`}
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8C939E" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </div>
          </div>

          {/* Newsletter */}
          <div className="mb-7">
            <label className={labelStyle}>Newsletter</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setNewsletter('Yes')}
                className="h-[42px] px-6 rounded-[12px] text-[14px] font-semibold transition-all duration-200"
                style={{
                  background: newsletter === 'Yes' ? 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' : '#F0F2F5',
                  color: newsletter === 'Yes' ? '#FFFFFF' : '#6B7280',
                  boxShadow: newsletter === 'Yes' ? '0px 4px 12px rgba(15, 188, 192, 0.3)' : 'none',
                }}
              >
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Yes
                </span>
              </button>
              <button
                onClick={() => setNewsletter('No')}
                className="h-[42px] px-6 rounded-[12px] text-[14px] font-semibold transition-all duration-200"
                style={{
                  background: newsletter === 'No' ? 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' : '#F0F2F5',
                  color: newsletter === 'No' ? '#FFFFFF' : '#6B7280',
                  boxShadow: newsletter === 'No' ? '0px 4px 12px rgba(15, 188, 192, 0.3)' : 'none',
                }}
              >
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  No
                </span>
              </button>
            </div>
          </div>

          {/* Error message */}
          {saveError && (
            <div className="mb-5 p-4 rounded-[12px] bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <p className="text-[13px] text-[#DC2626] font-medium">{saveError}</p>
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-[50px] rounded-[14px] text-[15px] font-bold text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)', boxShadow: '0px 4px 14px rgba(15, 188, 192, 0.35)' }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : saved ? (
              <span className="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved Successfully!
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                Save Changes
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ============ Reset Password Section ============ */}
      <div className="bg-white rounded-[20px] border border-[#E2EAF1] overflow-hidden mb-6" style={{ boxShadow: '0px 4px 24px 0px rgba(191, 197, 209, 0.18)' }}>
        {/* Section Header */}
        <div className="px-7 pt-7 pb-5 border-b border-[#F0F2F5]">
          <div className="flex items-center gap-3">
            <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center bg-gradient-to-br from-[#F59E0B] to-[#F97316]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Reset Password</h2>
              <p className="text-[13px] text-[#8C939E]">Update your account password</p>
            </div>
          </div>
        </div>

        <div className="px-7 py-6">
          {/* Current Password */}
          <div className="mb-5">
            <label className={labelStyle}>Current Password</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className={`${inputStyle} pl-11 pr-12`}
              />
              <PasswordToggle show={showCurrentPassword} onToggle={() => setShowCurrentPassword(!showCurrentPassword)} />
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-[#E2EAF1]" />
            <span className="text-[12px] font-medium text-[#B0B7C3] uppercase tracking-wider">New Password</span>
            <div className="flex-1 h-px bg-[#E2EAF1]" />
          </div>

          {/* New Password */}
          <div className="mb-5">
            <label className={labelStyle}>New Password</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </div>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className={`${inputStyle} pl-11 pr-12`}
              />
              <PasswordToggle show={showNewPassword} onToggle={() => setShowNewPassword(!showNewPassword)} />
            </div>
            {newPassword && newPassword.length > 0 && newPassword.length < 6 && (
              <p className="text-[12px] text-[#EF4444] mt-2 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Password must be at least 6 characters
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="mb-5">
            <label className={labelStyle}>Confirm Password</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={`${inputStyle} pl-11 pr-12 ${newPassword && confirmPassword && newPassword !== confirmPassword ? 'border-[#EF4444] focus:border-[#EF4444] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' : ''}`}
              />
              <PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
            </div>
            {newPassword && confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[12px] text-[#EF4444] mt-2 flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                Passwords do not match
              </p>
            )}
          </div>

          {/* Error / Success messages */}
          {passwordError && (
            <div className="mb-5 p-4 rounded-[12px] bg-[#FEF2F2] border border-[#FECACA] flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <p className="text-[13px] text-[#DC2626] font-medium">{passwordError}</p>
            </div>
          )}

          {passwordChanged && (
            <div className="mb-5 p-4 rounded-[12px] bg-[#ECFDF5] border border-[#A7F3D0] flex items-center gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <p className="text-[13px] text-[#059669] font-medium">Password changed successfully!</p>
            </div>
          )}

          {/* Change Password Button */}
          <button
            onClick={handleChangePassword}
            disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || newPassword.length < 6 || passwordChanging}
            className="w-full h-[50px] rounded-[14px] text-[15px] font-bold text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #F97316 100%)', boxShadow: '0px 4px 14px rgba(249, 115, 22, 0.35)' }}
          >
            {passwordChanging ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Changing Password...
              </span>
            ) : passwordChanged ? (
              <span className="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Password Changed!
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Change Password
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ============ Account Overview ============ */}
      <div className="bg-white rounded-[20px] border border-[#E2EAF1] overflow-hidden mb-6" style={{ boxShadow: '0px 4px 24px 0px rgba(191, 197, 209, 0.18)' }}>
        {/* Section Header */}
        <div className="px-7 pt-7 pb-5 border-b border-[#F0F2F5]">
          <div className="flex items-center gap-3">
            <div className="w-[40px] h-[40px] rounded-[12px] flex items-center justify-center bg-gradient-to-br from-[#6366F1] to-[#8B5CF6]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Account Overview</h2>
              <p className="text-[13px] text-[#8C939E]">Your account details at a glance</p>
            </div>
          </div>
        </div>

        <div className="px-7 py-2">
          <div className="flex justify-between items-center py-4 border-b border-[#F0F2F5]">
            <span className="text-[14px] text-[#8C939E] font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              User ID
            </span>
            <span className="text-[14px] font-bold text-[#0FBCC0]">#{state.user.userId}</span>
          </div>
          <div className="flex justify-between items-center py-4 border-b border-[#F0F2F5]">
            <span className="text-[14px] text-[#8C939E] font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Email
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-medium text-[#36383A]">{state.user.email}</span>
              {state.user.emailVerified ? (
                <span className="inline-flex items-center gap-1 bg-[#ECFDF5] text-[#059669] px-2 py-0.5 rounded-full text-[11px] font-bold">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-[#FEF3C7] text-[#D97706] px-2 py-0.5 rounded-full text-[11px] font-bold">
                  Unverified
                </span>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center py-4 border-b border-[#F0F2F5]">
            <span className="text-[14px] text-[#8C939E] font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Balance
            </span>
            <span className="text-[16px] font-bold text-[#0FBCC0]">${state.user.balance.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-4 border-b border-[#F0F2F5]">
            <span className="text-[14px] text-[#8C939E] font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Surveys
            </span>
            <span className="text-[14px] font-medium text-[#36383A]">{state.user.surveysCompleted}/{state.user.surveyTarget}</span>
          </div>
          <div className="flex justify-between items-center py-4 border-b border-[#F0F2F5]">
            <span className="text-[14px] text-[#8C939E] font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Total Earned
            </span>
            <span className="text-[14px] font-semibold text-[#059669]">${state.user.totalEarned.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center py-4">
            <span className="text-[14px] text-[#8C939E] font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B0B7C3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Language
            </span>
            <span className="text-[14px] font-medium text-[#36383A]">{state.user.language}</span>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      {showDeleteConfirm ? (
        <div className="rounded-[16px] border border-[#FECACA] bg-[#FEF2F2] p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-[36px] h-[36px] rounded-full bg-[#EF4444]/10 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="text-[15px] font-bold text-[#991B1B]">Delete Account Permanently</h3>
          </div>
          <p className="text-[13px] text-[#7F1D1D] mb-4">This action cannot be undone. All your data, balance, and history will be permanently deleted.</p>
          {deleteError && (
            <p className="text-[12px] text-[#DC2626] mb-3">{deleteError}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="h-[40px] px-5 rounded-[10px] text-[13px] font-bold text-white bg-[#EF4444] hover:bg-[#DC2626] transition-colors disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
            </button>
            <button
              onClick={() => { setShowDeleteConfirm(false); setDeleteError(null) }}
              className="h-[40px] px-5 rounded-[10px] text-[13px] font-semibold text-[#6B7280] bg-[#F0F2F5] hover:bg-[#E2E8F0] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-[14px] text-[#B0B7C3] hover:text-[#EF4444] transition-colors flex items-center gap-2 ml-1"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete my account
        </button>
      )}
    </div>
  )
}
