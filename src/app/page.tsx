'use client'

import { useState, createContext, useContext, useEffect } from 'react'
import { AuthPage } from '@/components/nicesurveys/auth-page'
import { DashboardLayout } from '@/components/nicesurveys/dashboard-layout'
import { AdminLayout } from '@/components/nicesurveys/admin/admin-layout'

type AppState = {
  isLoggedIn: boolean
  currentPage: 'surveys' | 'cashout' | 'settings' | 'help' | 'admin'
  user: {
    userId: number
    email: string
    role: string
    balance: number
    surveysCompleted: number
    surveyTarget: number
    earningRate: number
    language: string
    inviteCode: string
    unclaimedRevenue: number
    friendsInvited: number
    totalEarned: number
    emailVerified: boolean
  }
}

type AppContextType = {
  state: AppState
  setState: React.Dispatch<React.SetStateAction<AppState>>
  login: (email: string, emailVerified?: boolean, userData?: Partial<AppState['user']>) => void
  logout: () => void
  setCurrentPage: (page: AppState['currentPage']) => void
  refreshUser: () => Promise<void>
}

const AppContext = createContext<AppContextType | null>(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export default function Home() {
  const [state, setState] = useState<AppState>({
    isLoggedIn: false,
    currentPage: 'surveys',
    user: {
      userId: 0,
      email: '',
      role: 'user',
      balance: 0,
      surveysCompleted: 0,
      surveyTarget: 25,
      earningRate: 0.005,
      language: 'English (en)',
      inviteCode: '',
      unclaimedRevenue: 0,
      friendsInvited: 0,
      totalEarned: 0,
      emailVerified: false,
    },
  })

  const [hydrated, setHydrated] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)

  // Helper: parse userId that could be cuid ("clxxx") or integer string
  const parseUserId = (val: string | null): number => {
    if (!val) return 0
    const num = parseInt(val)
    return isNaN(num) ? 0 : num
  }

  // Restore session from localStorage on page load
  // Strategy: Show UI INSTANTLY with session identifiers only (email, role)
  // Then fetch fresh data from server in background — NO userData caching in localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('sessionToken')
    const savedUserId = localStorage.getItem('userId') // cuid
    const savedNumericUserId = localStorage.getItem('numericUserId') // integer
    const savedEmail = localStorage.getItem('userEmail')
    const savedRole = localStorage.getItem('userRole')

    if (savedToken && savedUserId) {
      // We have a saved session — show UI immediately with session identifiers only
      const role = savedRole || 'user'
      const isAdmin = role === 'admin' || savedEmail === 'admin@xoxosurveys.com'
      const numericId = parseUserId(savedNumericUserId)

      // Show UI INSTANTLY — no waiting for API
      setState({
        isLoggedIn: true,
        currentPage: isAdmin ? 'admin' : 'surveys',
        user: {
          userId: numericId,
          email: savedEmail || '',
          role,
          balance: 0, // Will be updated from server
          surveysCompleted: 0,
          surveyTarget: 25,
          earningRate: 0.005,
          language: 'English (en)',
          inviteCode: '',
          unclaimedRevenue: 0,
          friendsInvited: 0,
          totalEarned: 0,
          emailVerified: isAdmin, // Admins are always verified
        },
      })
      setHydrated(true)

      // Fetch fresh data from server in background
      const refreshFromServer = async () => {
        try {
          const res = await fetch(`/api/user/balance?userId=${savedUserId}&_t=${Date.now()}`, {
            cache: 'no-store',
          })
          if (res.ok) {
            const data = await res.json()
            const freshRole = data.role || role
            const freshIsAdmin = freshRole === 'admin' || savedEmail === 'admin@xoxosurveys.com'
            const freshNumericId = data.userId ?? numericId

            if (data.userId) localStorage.setItem('numericUserId', String(data.userId))

            setState(prev => ({
              ...prev,
              currentPage: freshIsAdmin ? 'admin' : prev.currentPage,
              user: {
                ...prev.user,
                userId: freshNumericId || prev.user.userId,
                role: freshRole,
                balance: data.balance ?? prev.user.balance,
                surveysCompleted: data.surveysCompleted ?? prev.user.surveysCompleted,
                earningRate: data.earningRate ?? prev.user.earningRate,
                inviteCode: data.inviteCode || prev.user.inviteCode,
                unclaimedRevenue: data.unclaimedRevenue ?? prev.user.unclaimedRevenue,
                friendsInvited: data.friendsInvited ?? prev.user.friendsInvited,
                totalEarned: data.totalEarned ?? prev.user.totalEarned,
                emailVerified: data.emailVerified ?? prev.user.emailVerified,
              },
            }))
          } else if (res.status === 404) {
            // User not found — session is invalid
            localStorage.removeItem('sessionToken')
            localStorage.removeItem('userId')
            localStorage.removeItem('numericUserId')
            localStorage.removeItem('userEmail')
            localStorage.removeItem('userRole')
            setState(prev => ({
              ...prev,
              isLoggedIn: false,
              currentPage: 'surveys',
              user: {
                userId: 0, email: '', role: 'user', balance: 0,
                surveysCompleted: 0, surveyTarget: 25, earningRate: 0.005,
                language: 'English (en)', inviteCode: '', unclaimedRevenue: 0,
                friendsInvited: 0, totalEarned: 0, emailVerified: false,
              },
            }))
          }
          // For 500 or other errors, keep the session — will retry on next refreshUser()
        } catch {
          // Network error — keep the session, will retry on next refreshUser()
        }
      }
      refreshFromServer()
    } else {
      setHydrated(true)
    }
  }, [])

  // Handle email verification redirect from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verifyStatus = params.get('verify')

    if (verifyStatus) {
      const messages: Record<string, string> = {
        'success': '✅ Your email has been verified successfully! You can now log in.',
        'already-verified': 'ℹ️ Your email is already verified.',
        'missing-token': '⚠️ Verification token is missing. Please check the link in your email.',
        'invalid-token': '⚠️ Invalid verification link. Please request a new verification email.',
        'token-expired': '⏰ Verification link has expired. Please request a new verification email.',
        'error': '❌ An error occurred during verification. Please try again.',
      }
      setVerifyMessage(messages[verifyStatus] || 'Unknown verification status.')

      if (verifyStatus === 'success' || verifyStatus === 'already-verified') {
        setState(prev => ({
          ...prev,
          user: { ...prev.user, emailVerified: true },
        }))
        // Force a fresh server fetch to sync everything
        setTimeout(() => {
          const userId = localStorage.getItem('userId')
          if (userId) {
            fetch(`/api/user/balance?userId=${userId}&_t=${Date.now()}`, { cache: 'no-store' })
              .then(r => r.ok ? r.json() : null)
              .then(data => {
                if (data) {
                  setState(prev => ({
                    ...prev,
                    user: {
                      ...prev.user,
                      emailVerified: data.emailVerified ?? true,
                      balance: data.balance ?? prev.user.balance,
                      totalEarned: data.totalEarned ?? prev.user.totalEarned,
                      surveysCompleted: data.surveysCompleted ?? prev.user.surveysCompleted,
                    },
                  }))
                }
              })
              .catch(() => {})
          }
        }, 1000)
      }

      // Clean up URL
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const login = (email: string, emailVerified: boolean = false, userData?: Partial<AppState['user']>) => {
    const isAdmin = userData?.role === 'admin' || email === 'admin@xoxosurveys.com'
    const role = userData?.role ?? (isAdmin ? 'admin' : 'user')

    // Save ONLY session identifiers to localStorage (NOT user data like balance)
    if (typeof window !== 'undefined') {
      localStorage.setItem('userEmail', email)
      localStorage.setItem('userRole', role)
      if (userData?.userId) {
        localStorage.setItem('numericUserId', String(userData.userId))
      }
    }

    setState(prev => ({
      ...prev,
      isLoggedIn: true,
      currentPage: isAdmin ? 'admin' : 'surveys',
      user: {
        ...prev.user,
        userId: userData?.userId ?? prev.user.userId,
        email,
        role,
        balance: userData?.balance ?? 0,
        surveysCompleted: userData?.surveysCompleted ?? 0,
        surveyTarget: userData?.surveyTarget ?? 25,
        earningRate: userData?.earningRate ?? 0.005,
        inviteCode: userData?.inviteCode ?? prev.user.inviteCode,
        unclaimedRevenue: userData?.unclaimedRevenue ?? 0,
        friendsInvited: userData?.friendsInvited ?? 0,
        totalEarned: userData?.totalEarned ?? 0,
        emailVerified: isAdmin ? true : emailVerified,
      },
    }))

    // After login, fetch fresh data from server to ensure everything is synced
    const cuid = localStorage.getItem('userId')
    if (cuid) {
      fetch(`/api/user/balance?userId=${cuid}&_t=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data) {
            setState(prev => ({
              ...prev,
              user: {
                ...prev.user,
                userId: data.userId ?? prev.user.userId,
                balance: data.balance ?? prev.user.balance,
                emailVerified: data.emailVerified ?? prev.user.emailVerified,
                totalEarned: data.totalEarned ?? prev.user.totalEarned,
                surveysCompleted: data.surveysCompleted ?? prev.user.surveysCompleted,
                earningRate: data.earningRate ?? prev.user.earningRate,
                inviteCode: data.inviteCode || prev.user.inviteCode,
                unclaimedRevenue: data.unclaimedRevenue ?? prev.user.unclaimedRevenue,
                friendsInvited: data.friendsInvited ?? prev.user.friendsInvited,
              },
            }))
          }
        })
        .catch(() => {})
    }
  }

  const logout = () => {
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('numericUserId')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userRole')
    setState(prev => ({
      ...prev,
      isLoggedIn: false,
      currentPage: 'surveys',
      user: {
        userId: 0,
        email: '',
        role: 'user',
        balance: 0,
        surveysCompleted: 0,
        surveyTarget: 25,
        earningRate: 0.005,
        language: 'English (en)',
        inviteCode: '',
        unclaimedRevenue: 0,
        friendsInvited: 0,
        totalEarned: 0,
        emailVerified: false,
      },
    }))
  }

  const setCurrentPage = (page: AppState['currentPage']) => {
    setState(prev => ({ ...prev, currentPage: page }))
  }

  const refreshUser = async () => {
    const userId = localStorage.getItem('userId')
    if (!userId) return

    try {
      const res = await fetch(`/api/user/balance?userId=${userId}&_t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.userId) localStorage.setItem('numericUserId', String(data.userId))

        setState(prev => ({
          ...prev,
          user: {
            ...prev.user,
            userId: data.userId ?? prev.user.userId,
            balance: data.balance ?? prev.user.balance,
            emailVerified: data.emailVerified ?? prev.user.emailVerified,
            totalEarned: data.totalEarned ?? prev.user.totalEarned,
            surveysCompleted: data.surveysCompleted ?? prev.user.surveysCompleted,
            earningRate: data.earningRate ?? prev.user.earningRate,
            inviteCode: data.inviteCode || prev.user.inviteCode,
            unclaimedRevenue: data.unclaimedRevenue ?? prev.user.unclaimedRevenue,
            friendsInvited: data.friendsInvited ?? prev.user.friendsInvited,
            role: data.role ?? prev.user.role,
          },
        }))
      }
    } catch {
      // Silently fail - will retry on next refresh
    }
  }

  return (
    <AppContext.Provider value={{ state, setState, login, logout, setCurrentPage, refreshUser }}>
      {verifyMessage && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center pt-4 px-4">
          <div className={`max-w-md w-full p-4 rounded-xl shadow-lg border text-sm font-medium flex items-center justify-between gap-3 ${
            verifyMessage.includes('✅') ? 'bg-green-50 border-green-200 text-green-800' :
            verifyMessage.includes('ℹ️') ? 'bg-blue-50 border-blue-200 text-blue-800' :
            'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <span>{verifyMessage}</span>
            <button
              onClick={() => setVerifyMessage(null)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {!hydrated ? (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFB]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[#2DD9B6] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#999999] text-sm font-medium">Loading...</p>
          </div>
        </div>
      ) : !state.isLoggedIn ? (
        <AuthPage />
      ) : state.currentPage === 'admin' ? (
        <AdminLayout />
      ) : (
        <DashboardLayout />
      )}
    </AppContext.Provider>
  )
}
