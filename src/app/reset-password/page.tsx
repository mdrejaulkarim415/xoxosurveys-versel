'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invalidToken, setInvalidToken] = useState(false)

  useEffect(() => {
    if (!token) {
      setInvalidToken(true)
    }
  }, [token])

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      setError('Password must contain at least one letter and one number')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to reset password')
        return
      }

      setSuccess(true)
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center p-5">
      <div className="w-full max-w-[420px]">
        <div
          className="bg-white rounded-[16px] border border-[#E2EAF1] p-8"
          style={{ boxShadow: '0px 8px 40px 0px rgba(45, 217, 182, 0.10), 0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
        >
          {/* Logo */}
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <img src="/logo.png" alt="XoXoSurveys" className="w-8 h-8 rounded-full object-cover" />
            <span className="text-[22px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
              XoXoSurveys
            </span>
          </div>

          {invalidToken ? (
            /* Invalid/Missing Token */
            <div className="text-center py-4">
              <div
                className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: '#FEF2F2' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <h3 className="text-[18px] font-bold text-[#36383A] mb-2">Invalid Reset Link</h3>
              <p className="text-[13px] text-[#666666] mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full h-[44px] text-white font-semibold rounded-[10px] transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
              >
                Go to Login
              </button>
            </div>
          ) : success ? (
            /* Success State */
            <div className="text-center py-4">
              <div
                className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 11l3 3L22 4" />
                </svg>
              </div>
              <h3 className="text-[18px] font-bold text-[#36383A] mb-2">Password Reset Successful!</h3>
              <p className="text-[13px] text-[#666666] mb-6">
                Your password has been changed. You&apos;ve been logged out of all devices for security. Please login with your new password.
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full h-[44px] text-white font-semibold rounded-[10px] transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
              >
                Login Now
              </button>
            </div>
          ) : (
            /* Reset Password Form */
            <>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-[20px] h-[20px] text-[#0FBCC0] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <h2 className="text-[18px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                  Set New Password
                </h2>
              </div>
              <p className="text-[13px] text-[#666666] mb-5">
                Choose a strong password for your account. Must be at least 8 characters with a letter and a number.
              </p>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] text-[13px] text-[#DC2626]">
                  {error}
                </div>
              )}

              <div className="space-y-3 mb-5">
                <input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                  disabled={loading}
                  className="ns-input"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null) }}
                  onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                  disabled={loading}
                  className="ns-input"
                />
              </div>

              <button
                onClick={handleResetPassword}
                disabled={loading}
                className="ns-btn-primary w-full h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a10 10 0 0 1 10 10" />
                    </svg>
                    Resetting...
                  </span>
                ) : (
                  <>
                    Reset Password
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>

              <div className="text-center mt-4">
                <button
                  onClick={() => router.push('/')}
                  className="text-[14px] text-[#0FBCC0] font-semibold hover:underline"
                >
                  Back to login
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
