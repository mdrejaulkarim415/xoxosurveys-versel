'use client'

import { useState } from 'react'
import { useApp } from '@/app/page'
import { LegalModal } from './legal-modal'
import { ContactModal } from './contact-modal'

type LegalPage = 'terms' | 'privacy' | null

export function AuthPage() {
  const { login } = useApp()
  const [isLogin, setIsLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [showInvitation, setShowInvitation] = useState(false)
  const [invitationCode, setInvitationCode] = useState('')
  const [forgotPassword, setForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotSent, setForgotSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [legalPage, setLegalPage] = useState<LegalPage>(null)
  const [showContact, setShowContact] = useState(false)

  const handleRegister = async () => {
    if (!email || !password) {
      setError('Email and password are required')
      return
    }
    if (password !== repeatPassword) {
      setError('Passwords do not match')
      return
    }
    if (!agreed) {
      setError('You must agree to the Terms and Privacy Policy')
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

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: email.split('@')[0],
          inviteCode: invitationCode || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.')
        return
      }

      login(email, false, {
        userId: data.user.userId,
        balance: data.user.balance || 0,
        surveysCompleted: data.user.surveysCompleted || 0,
        surveyTarget: data.user.surveyTarget || 25,
        earningRate: data.user.earningRate || 0.005,
        inviteCode: data.user.inviteCode,
        unclaimedRevenue: data.user.unclaimedRevenue || 0,
        friendsInvited: data.user.friendsInvited || 0,
        totalEarned: data.user.totalEarned || 0,
        emailVerified: data.user.emailVerified || false,
        role: data.user.role || 'user',
        firstname: data.user.firstname || '',
        lastname: data.user.lastname || '',
        newsletter: data.user.newsletter || 'Yes',
        language: data.user.language || 'English (en)',
      })

      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken)
      }
      localStorage.setItem('userId', data.user.id) // cuid for API lookups
      if (data.user.userId) {
        localStorage.setItem('numericUserId', String(data.user.userId))
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid email or password')
        return
      }

      login(email, data.user.emailVerified || false, {
        userId: data.user.userId,
        balance: data.user.balance || 0,
        surveysCompleted: data.user.surveysCompleted || 0,
        surveyTarget: data.user.surveyTarget || 25,
        earningRate: data.user.earningRate || 0.005,
        inviteCode: data.user.inviteCode,
        unclaimedRevenue: data.user.unclaimedRevenue || 0,
        friendsInvited: data.user.friendsInvited || 0,
        totalEarned: data.user.totalEarned || 0,
        emailVerified: data.user.emailVerified || false,
        role: data.user.role || 'user',
        firstname: data.user.firstname || '',
        lastname: data.user.lastname || '',
        newsletter: data.user.newsletter || 'Yes',
        language: data.user.language || 'English (en)',
      })

      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken)
      }
      localStorage.setItem('userId', data.user.id) // cuid for API lookups
      if (data.user.userId) {
        localStorage.setItem('numericUserId', String(data.user.userId))
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = () => {
    if (isLogin) {
      handleLogin()
    } else {
      handleRegister()
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send reset email')
        return
      }

      // Show success state — always show success to prevent email enumeration
      setForgotSent(true)
    } catch (err) {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col relative overflow-hidden">
      {/* ===== Decorative Background ===== */}

      {/* Large main green circle */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '520px',
          height: '520px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 40%, #b8f0de 0%, #a8e6cf 30%, #8ddbbf 60%, #7dd3b5 100%)',
          top: '50%',
          left: '25%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.55,
          filter: 'blur(2px)',
          zIndex: 0,
        }}
      />

      {/* Secondary soft circle */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #d4f5ea 0%, #c3eddf 50%, transparent 100%)',
          top: '30%',
          left: '35%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.4,
          zIndex: 0,
        }}
      />

      {/* Feature Circle 1 - Calculator (top-left) */}
      <div
        className="absolute pointer-events-none hidden lg:flex items-center justify-center"
        style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 8px 32px rgba(45, 217, 182, 0.18), 0 2px 8px rgba(0,0,0,0.06)',
          top: '12%',
          left: '8%',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E0F7F4 0%, #D1F2EC 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="8" y1="10" x2="10" y2="10" />
            <line x1="14" y1="10" x2="16" y2="10" />
            <line x1="8" y1="14" x2="10" y2="14" />
            <line x1="14" y1="14" x2="16" y2="14" />
            <line x1="8" y1="18" x2="10" y2="18" />
            <line x1="14" y1="18" x2="16" y2="18" />
          </svg>
        </div>
      </div>

      {/* Feature Circle 2 - Car (top-right area, left side) */}
      <div
        className="absolute pointer-events-none hidden lg:flex items-center justify-center"
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 8px 32px rgba(45, 217, 182, 0.18), 0 2px 8px rgba(0,0,0,0.06)',
          top: '18%',
          left: '30%',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FFF3E0 0%, #FFE8CC 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FF9800" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 17h14M5 17a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1l2-3h8l2 3h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2M5 17v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1M17 17v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1" />
            <circle cx="7.5" cy="13" r="1.5" fill="#FF9800" />
            <circle cx="16.5" cy="13" r="1.5" fill="#FF9800" />
          </svg>
        </div>
      </div>

      {/* Feature Circle 3 - Phone (bottom-left) */}
      <div
        className="absolute pointer-events-none hidden lg:flex items-center justify-center"
        style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 8px 32px rgba(45, 217, 182, 0.18), 0 2px 8px rgba(0,0,0,0.06)',
          bottom: '22%',
          left: '10%',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E8EAF6 0%, #D5D9F2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5C6BC0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="2" />
            <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" />
          </svg>
        </div>
      </div>

      {/* Feature Circle 4 - Gift (bottom-right area, left side) */}
      <div
        className="absolute pointer-events-none hidden lg:flex items-center justify-center"
        style={{
          width: '85px',
          height: '85px',
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 8px 32px rgba(45, 217, 182, 0.18), 0 2px 8px rgba(0,0,0,0.06)',
          bottom: '16%',
          left: '32%',
          zIndex: 1,
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FCE4EC 0%, #F8BBD0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#E91E63" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12" />
            <rect x="2" y="7" width="20" height="5" />
            <line x1="12" y1="22" x2="12" y2="7" />
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
        </div>
      </div>

      {/* Floating Coin 1 - Green (top-left area) */}
      <div
        className="absolute pointer-events-none hidden lg:flex items-center justify-center"
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2DD9B6 0%, #22B9CF 100%)',
          boxShadow: '0 4px 16px rgba(45, 217, 182, 0.35)',
          top: '28%',
          left: '5%',
          zIndex: 2,
          animation: 'floatCoin1 4s ease-in-out infinite',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '18px' }}>$</span>
      </div>

      {/* Floating Coin 2 - Orange (bottom-center-left) */}
      <div
        className="absolute pointer-events-none hidden lg:flex items-center justify-center"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FFB347 0%, #FF9800 100%)',
          boxShadow: '0 4px 16px rgba(255, 152, 0, 0.35)',
          bottom: '32%',
          left: '18%',
          zIndex: 2,
          animation: 'floatCoin2 5s ease-in-out infinite',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '16px' }}>$</span>
      </div>

      {/* Floating Coin 3 - Green (right of main circle) */}
      <div
        className="absolute pointer-events-none hidden lg:flex items-center justify-center"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #2DD9B6 0%, #22B9CF 100%)',
          boxShadow: '0 4px 16px rgba(45, 217, 182, 0.35)',
          top: '55%',
          left: '38%',
          zIndex: 2,
          animation: 'floatCoin3 3.5s ease-in-out infinite',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>$</span>
      </div>

      {/* Text Bubble - "Answer Surveys" */}
      <div
        className="absolute pointer-events-none hidden lg:flex items-center gap-2.5"
        style={{
          padding: '10px 16px',
          borderRadius: '14px',
          background: '#ffffff',
          boxShadow: '0 6px 24px rgba(45, 217, 182, 0.15), 0 2px 8px rgba(0,0,0,0.05)',
          top: '42%',
          left: '4%',
          zIndex: 3,
        }}
      >
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #2DD9B6 0%, #22B9CF 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#36383A' }}>Answer Surveys</span>
      </div>

      {/* Text Bubble - "Get Rewards" */}
      <div
        className="absolute pointer-events-none hidden lg:flex items-center gap-2.5"
        style={{
          padding: '10px 16px',
          borderRadius: '14px',
          background: '#ffffff',
          boxShadow: '0 6px 24px rgba(255, 152, 0, 0.15), 0 2px 8px rgba(0,0,0,0.05)',
          bottom: '35%',
          left: '26%',
          zIndex: 3,
        }}
      >
        <div
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #FFB347 0%, #FF9800 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 12 20 22 4 22 4 12" />
            <rect x="2" y="7" width="20" height="5" />
            <line x1="12" y1="22" x2="12" y2="7" />
            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
            <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
          </svg>
        </div>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#36383A' }}>Get Rewards</span>
      </div>

      {/* Small decorative dots */}
      <div className="absolute pointer-events-none hidden lg:block" style={{ top: '65%', left: '8%', width: '8px', height: '8px', borderRadius: '50%', background: '#2DD9B6', opacity: 0.3, zIndex: 1 }} />
      <div className="absolute pointer-events-none hidden lg:block" style={{ top: '20%', left: '40%', width: '6px', height: '6px', borderRadius: '50%', background: '#FFB347', opacity: 0.3, zIndex: 1 }} />
      <div className="absolute pointer-events-none hidden lg:block" style={{ top: '75%', left: '35%', width: '10px', height: '10px', borderRadius: '50%', background: '#22B9CF', opacity: 0.2, zIndex: 1 }} />
      <div className="absolute pointer-events-none hidden lg:block" style={{ top: '35%', left: '22%', width: '5px', height: '5px', borderRadius: '50%', background: '#2DD9B6', opacity: 0.4, zIndex: 1 }} />

      {/* ===== CSS Animations ===== */}
      <style jsx global>{`
        @keyframes floatCoin1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-12px); }
        }
        @keyframes floatCoin2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes floatCoin3 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      {/* ===== Header ===== */}
      <header className="border-b border-[#E2EAF1] bg-white/80 backdrop-blur-sm relative z-10">
        <div className="max-w-[1200px] mx-auto px-5 h-[70px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="XoXoSurveys" className="w-8 h-8 rounded-full object-cover" />
            <span className="text-[24px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
              XoXoSurveys
            </span>
          </div>
          <div className="flex items-center gap-5">
            <button className="hidden sm:flex items-center gap-1.5 text-[14px] text-[#999999] hover:text-[#36383A] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              English (en)
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null) }}
              className="text-white font-semibold h-9 px-5 rounded-[8px] transition-all text-[14px]"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <div className="flex-1 flex items-center justify-center p-5 py-10 relative z-5">
        <div className="w-full max-w-[1100px] flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left Side - Hero text */}
          <div className="flex-1 text-center lg:text-left relative z-10">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold mb-6 uppercase tracking-wider"
              style={{
                background: 'linear-gradient(135deg, rgba(45,217,182,0.12) 0%, rgba(34,185,207,0.12) 100%)',
                color: '#0FBCC0',
                border: '1px solid rgba(45,217,182,0.2)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#F9CC28" stroke="#F9CC28" strokeWidth="0.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              #1 Survey Platform
            </div>

            {/* Headline */}
            <h1
              className="text-[38px] lg:text-[48px] font-extrabold mb-5 leading-[1.1]"
              style={{ fontFamily: 'var(--font-outfit), sans-serif', color: '#1A1D21' }}
            >
              Earn Money with{' '}
              <span
                className="inline-block"
                style={{
                  background: 'linear-gradient(270deg, #2DD9B6 0%, #22B9CF 50%, #1A9FD4 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 8px rgba(45,217,182,0.3))',
                }}
              >
                Paid Online Surveys
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-[#6B7280] text-[16px] mb-8 max-w-[460px] mx-auto lg:mx-0 leading-relaxed font-medium">
              Complete surveys and redeem your earnings through PayPal, Amazon, and more. Join <span className="text-[#0FBCC0] font-bold">thousands of users</span> already earning.
            </p>

            {/* Feature Cards - 2x2 Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[440px] mx-auto lg:mx-0">
              {[
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2DD9B6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  ),
                  title: 'Earn up to $5',
                  subtitle: 'Per survey completed',
                  gradient: 'linear-gradient(135deg, #E6FFF8 0%, #D1FAE5 100%)',
                  border: 'rgba(45,217,182,0.2)',
                  iconBg: 'linear-gradient(135deg, #2DD9B6 0%, #22B9CF 100%)',
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF9800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 12 20 22 4 22 4 12" />
                      <rect x="2" y="7" width="20" height="5" />
                      <line x1="12" y1="22" x2="12" y2="7" />
                      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
                      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                    </svg>
                  ),
                  title: 'Multiple Cashouts',
                  subtitle: 'PayPal, Amazon & more',
                  gradient: 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)',
                  border: 'rgba(255,152,0,0.2)',
                  iconBg: 'linear-gradient(135deg, #FFB347 0%, #FF9800 100%)',
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5C6BC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  ),
                  title: 'Fast & Easy',
                  subtitle: 'Surveys in minutes',
                  gradient: 'linear-gradient(135deg, #EEF0FF 0%, #D5D9F2 100%)',
                  border: 'rgba(92,107,192,0.2)',
                  iconBg: 'linear-gradient(135deg, #7986CB 0%, #5C6BC0 100%)',
                },
                {
                  icon: (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E91E63" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  ),
                  title: '10% Referral',
                  subtitle: 'Bonus forever',
                  gradient: 'linear-gradient(135deg, #FFF0F5 0%, #FCE4EC 100%)',
                  border: 'rgba(233,30,99,0.2)',
                  iconBg: 'linear-gradient(135deg, #F06292 0%, #E91E63 100%)',
                },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-[14px] transition-all duration-300 hover:scale-[1.03] hover:shadow-lg cursor-default"
                  style={{
                    background: feature.gradient,
                    border: `1px solid ${feature.border}`,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    className="flex-shrink-0 w-[42px] h-[42px] rounded-[12px] flex items-center justify-center"
                    style={{ background: feature.iconBg, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  >
                    {feature.icon}
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-[#1A1D21] leading-tight">{feature.title}</p>
                    <p className="text-[11px] text-[#6B7280] font-medium leading-tight mt-0.5">{feature.subtitle}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 mt-6 max-w-[440px] mx-auto lg:mx-0">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['#2DD9B6', '#22B9CF', '#FF9800', '#E91E63'].map((color, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white"
                      style={{ background: color, zIndex: 4 - i }}
                    >
                      {i === 3 ? '+' : ''}
                    </div>
                  ))}
                </div>
                <span className="text-[12px] text-[#6B7280] font-semibold">50K+ Users</span>
              </div>
              <div className="h-4 w-px bg-[#E2EAF1]" />
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#F9CC28">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-[12px] text-[#6B7280] font-semibold">4.9 Rating</span>
              </div>
              <div className="h-4 w-px bg-[#E2EAF1]" />
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2DD9B6" strokeWidth="2.5">
                  <path d="M9 11l3 3L22 4" />
                </svg>
                <span className="text-[12px] text-[#6B7280] font-semibold">Verified</span>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Card */}
          <div className="w-full max-w-[400px] relative z-10">
            <div
              className="bg-white/95 backdrop-blur-md rounded-[16px] border border-[#E2EAF1] p-6"
              style={{ boxShadow: '0px 8px 40px 0px rgba(45, 217, 182, 0.10), 0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
            >
              {/* Rocket icon + text */}
              <div className="flex items-center gap-2 mb-5">
                <svg className="w-[20px] h-[20px] flex-shrink-0" viewBox="0 0 24 24" fill="#0FBCC0">
                  <path d="M6.676 9.18c-1.426-.009-3.217.764-4.583 2.13-.521.521-.979 1.129-1.333 1.812 1.232-.933 2.547-1.225 4.086-.361.453-1.199 1.056-2.418 1.83-3.581zm8.154 8.143c-1.264.826-2.506 1.422-3.581 1.842.863 1.54.571 2.853-.361 4.085.684-.353 1.291-.812 1.812-1.334 1.37-1.369 2.144-3.165 2.13-4.593zm5.127-13.288c-.344-.024-.681-.035-1.011-.035-7.169 0-11.249 5.465-12.733 9.86l3.939 3.94c4.525-1.62 9.848-5.549 9.848-12.642 0-.366-.014-.74-.043-1.123z" />
                </svg>
                <p className="text-[14px] font-semibold text-[#36383A]">
                  {isLogin ? 'Login to XoXoSurveys' : 'Register and start earning now'}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 rounded-[8px] bg-[#FEF2F2] border border-[#FECACA] text-[13px] text-[#DC2626]">
                  {error}
                </div>
              )}

              {!forgotPassword ? (
                <>
                  {/* Form Fields */}
                  <div className="space-y-3 mb-4">
                    <input
                      type="email"
                      placeholder={isLogin ? 'Email' : 'Enter your email'}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                      disabled={loading}
                      className="xoxo-input"
                    />
                    <input
                      type="password"
                      placeholder={isLogin ? 'Password' : 'Enter your password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null) }}
                      onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                      disabled={loading}
                      className="xoxo-input"
                    />
                    {!isLogin && (
                      <input
                        type="password"
                        placeholder="Repeat password"
                        value={repeatPassword}
                        onChange={(e) => { setRepeatPassword(e.target.value); setError(null) }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                        disabled={loading}
                        className="xoxo-input"
                      />
                    )}
                  </div>

                  {/* Terms Checkbox */}
                  {!isLogin && (
                    <div className="flex items-start gap-2 mb-4">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-[3px] w-4 h-4 rounded accent-[#0FBCC0]"
                      />
                      <label htmlFor="terms" className="text-[14px] text-[#4B4B4B] leading-snug">
                        I agree with{' '}
                        <span onClick={() => setLegalPage('terms')} className="text-[#0FBCC0] font-medium cursor-pointer hover:underline">Terms</span>
                        {' '}and{' '}
                        <span onClick={() => setLegalPage('privacy')} className="text-[#0FBCC0] font-medium cursor-pointer hover:underline">Privacy Policy</span>
                      </label>
                    </div>
                  )}

                  {/* Forgot Password */}
                  {isLogin && (
                    <div className="mb-3">
                      <button
                        onClick={() => setForgotPassword(true)}
                        className="text-[14px] text-[#0FBCC0] hover:underline font-medium"
                      >
                        Forgot password
                      </button>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={handleAuth}
                    disabled={loading}
                    className="xoxo-btn-primary w-full h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        {isLogin ? 'Logging in...' : 'Creating account...'}
                      </span>
                    ) : (
                      <>
                        {isLogin ? 'Login now' : 'Sign up now'}
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>

                  {/* Social Login */}
                  <div className="flex items-center justify-center gap-4 mt-5">
                    <button className="w-[44px] h-[44px] rounded-full border border-[#E2EAF1] flex items-center justify-center hover:bg-[#F9FAFB] transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    </button>
                    <button className="w-[44px] h-[44px] rounded-full border border-[#E2EAF1] flex items-center justify-center hover:bg-[#F9FAFB] transition-colors">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                    </button>
                  </div>

                  {/* Switch Auth Mode */}
                  <div className="text-center mt-5 text-[14px] text-[#999999]">
                    {isLogin ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <span>You don&apos;t have an account?</span>
                        <button
                          onClick={() => { setIsLogin(false); setError(null) }}
                          className="font-semibold text-white px-4 py-1.5 rounded-[8px] text-[13px] transition-all hover:opacity-90"
                          style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                        >
                          Sign up now
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5">
                        <span>Already have an account?</span>
                        <button
                          onClick={() => { setIsLogin(true); setError(null) }}
                          className="font-semibold text-white px-4 py-1.5 rounded-[8px] text-[13px] transition-all hover:opacity-90"
                          style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                        >
                          Login
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Invitation Code */}
                  {!isLogin && (
                    <button
                      onClick={() => setShowInvitation(!showInvitation)}
                      className="block mx-auto mt-4 text-[14px] text-[#0FBCC0] hover:underline font-medium"
                    >
                      Use invitation code
                    </button>
                  )}

                  {showInvitation && (
                    <div className="mt-3">
                      <input
                        placeholder="Enter invitation code"
                        value={invitationCode}
                        onChange={(e) => setInvitationCode(e.target.value)}
                        className="xoxo-input"
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-5">
                    <svg className="w-[20px] h-[20px] text-[#0FBCC0] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <p className="text-[14px] font-semibold text-[#36383A]">Reset your password</p>
                  </div>

                  {!forgotSent ? (
                    <>
                      <p className="text-[13px] text-[#666666] mb-4">
                        Enter your email and we&apos;ll send you a link to reset your password.
                      </p>
                      <div className="space-y-3 mb-4">
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={forgotEmail}
                          onChange={(e) => { setForgotEmail(e.target.value); setError(null) }}
                          onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                          disabled={loading}
                          className="xoxo-input"
                        />
                      </div>
                      <button
                        onClick={handleForgotPassword}
                        disabled={loading}
                        className="xoxo-btn-primary w-full h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2a10 10 0 0 1 10 10" />
                            </svg>
                            Sending...
                          </span>
                        ) : (
                          <>
                            Send reset link
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <div
                        className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto mb-4"
                        style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 11l3 3L22 4" />
                        </svg>
                      </div>
                      <h3 className="text-[16px] font-bold text-[#36383A] mb-2">Check your email</h3>
                      <p className="text-[13px] text-[#666666] mb-4">
                        If an account with <span className="font-semibold text-[#36383A]">{forgotEmail}</span> exists, we&apos;ve sent a password reset link. Check your inbox and spam folder.
                      </p>
                      <p className="text-[12px] text-[#999999]">
                        The link expires in 1 hour.
                      </p>
                    </div>
                  )}

                  <div className="text-center mt-4">
                    <button
                      onClick={() => { setForgotPassword(false); setForgotSent(false); setError(null) }}
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
      </div>

      {/* ===== Footer ===== */}
      <footer className="border-t border-[#E2EAF1] py-6 bg-white/80 backdrop-blur-sm relative z-10">
        <div className="max-w-[1200px] mx-auto px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="XoXoSurveys" className="w-6 h-6 rounded-full object-cover" />
            <span className="text-[14px] text-[#999999]">XoXoSurveys &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-5 text-[14px] text-[#999999]">
            <button onClick={() => setLegalPage('terms')} className="hover:text-[#36383A] transition-colors">Terms</button>
            <button onClick={() => setLegalPage('privacy')} className="hover:text-[#36383A] transition-colors">Privacy Policy</button>
            <button onClick={() => setShowContact(true)} className="hover:text-[#36383A] transition-colors">Contact</button>
          </div>
        </div>
      </footer>

      {/* Legal Modals */}
      <LegalModal page={legalPage} onClose={() => setLegalPage(null)} />
      {showContact && <ContactModal onClose={() => setShowContact(false)} />}
    </div>
  )
}
