'use client'

import { useState, createContext, useContext, useEffect } from 'react'
import { AuthPage } from '@/components/xoxosurveys/auth-page'
import { DashboardLayout } from '@/components/xoxosurveys/dashboard-layout'
import { AdminLayout } from '@/components/xoxosurveys/admin/admin-layout'

type AppState = {
  isLoggedIn: boolean
  currentPage: 'surveys' | 'cashout' | 'leaderboard' | 'settings' | 'help' | 'admin'
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
    referralEarnings: number
    friendsInvited: number
    totalEarned: number
    emailVerified: boolean
    firstname: string
    lastname: string
    newsletter: string
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
      referralEarnings: 0,
      friendsInvited: 0,
      totalEarned: 0,
      emailVerified: false,
      firstname: '',
      lastname: '',
      newsletter: 'Yes',
    },
  })

  const [hydrated, setHydrated] = useState(false)
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null)

  const parseUserId = (val: string | null): number => {
    if (!val) return 0
    const num = parseInt(val)
    return isNaN(num) ? 0 : num
  }

  useEffect(() => {
    const savedToken = localStorage.getItem('sessionToken')
    const savedUserId = localStorage.getItem('userId')
    const savedNumericUserId = localStorage.getItem('numericUserId')
    const savedEmail = localStorage.getItem('userEmail')
    const savedRole = localStorage.getItem('userRole')
    const savedUserData = localStorage.getItem('userData')

    if (savedToken && savedUserId) {
      const role = savedRole || 'user'
      const isAdmin = role === 'admin' || savedEmail === 'admin@xoxosurveys.com'
      const numericId = parseUserId(savedNumericUserId)

      if (savedEmail) {
        let cachedData: any = null
        try {
          cachedData = savedUserData ? JSON.parse(savedUserData) : null
        } catch { /* ignore parse error */ }

        setState({
          isLoggedIn: true,
          currentPage: isAdmin ? 'admin' : 'surveys',
          user: {
            userId: numericId || (cachedData?.userId ?? 0),
            email: savedEmail,
            role,
            balance: cachedData?.balance ?? 0,
            surveysCompleted: cachedData?.surveysCompleted ?? 0,
            surveyTarget: cachedData?.surveyTarget ?? 25,
            earningRate: cachedData?.earningRate ?? 0.005,
            language: cachedData?.language ?? 'English (en)',
            inviteCode: cachedData?.inviteCode ?? '',
            unclaimedRevenue: cachedData?.unclaimedRevenue ?? 0,
            referralEarnings: cachedData?.referralEarnings ?? 0,
            friendsInvited: cachedData?.friendsInvited ?? 0,
            totalEarned: cachedData?.totalEarned ?? 0,
            emailVerified: cachedData?.emailVerified ?? false,
            firstname: cachedData?.firstname ?? '',
            lastname: cachedData?.lastname ?? '',
            newsletter: cachedData?.newsletter ?? 'Yes',
          },
        })
        setHydrated(true)

        const refreshFromApi = async () => {
          try {
            const res = await fetch(`/api/user/balance?userId=${savedUserId}`)
            if (res.ok) {
              const data = await res.json()
              const freshRole = data.role || savedRole || 'user'
              const freshIsAdmin = freshRole === 'admin' || savedEmail === 'admin@xoxosurveys.com'
              const freshNumericId = data.userId ?? numericId

              localStorage.setItem('userData', JSON.stringify(data))
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
                  referralEarnings: data.referralEarnings ?? prev.user.referralEarnings,
                  friendsInvited: data.friendsInvited ?? prev.user.friendsInvited,
                  totalEarned: data.totalEarned ?? prev.user.totalEarned,
                  emailVerified: data.emailVerified ?? prev.user.emailVerified,
                  firstname: data.firstname ?? prev.user.firstname,
                  lastname: data.lastname ?? prev.user.lastname,
                  newsletter: data.newsletter ?? prev.user.newsletter,
                  language: data.language ?? prev.user.language,
                  surveyTarget: data.surveyTarget ?? prev.user.surveyTarget,
                },
              }))
            } else if (res.status === 404) {
              localStorage.removeItem('sessionToken')
              localStorage.removeItem('userId')
              localStorage.removeItem('numericUserId')
              localStorage.removeItem('userEmail')
              localStorage.removeItem('userRole')
              localStorage.removeItem('userData')
              setState(prev => ({
                ...prev,
                isLoggedIn: false,
                currentPage: 'surveys',
                user: {
                  userId: 0, email: '', role: 'user', balance: 0,
                  surveysCompleted: 0, surveyTarget: 25, earningRate: 0.005,
                  language: 'English (en)', inviteCode: '', unclaimedRevenue: 0,
                  referralEarnings: 0, friendsInvited: 0, totalEarned: 0, emailVerified: false,
                  firstname: '', lastname: '', newsletter: 'Yes',
                },
              }))
            }
          } catch {
            // API call failed - keep cached session
          }
        }
        refreshFromApi()
      } else {
        setHydrated(true)
      }
    } else {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verifyStatus = params.get('verify')

    if (verifyStatus) {
      const messages: Record<string, string> = {
        'success': 'Your email has been verified successfully! You can now log in.',
        'already-verified': 'Your email is already verified.',
        'missing-token': 'Verification token is missing. Please check the link in your email.',
        'invalid-token': 'Invalid verification link. Please request a new verification email.',
        'token-expired': 'Verification link has expired. Please request a new verification email.',
        'error': 'An error occurred during verification. Please try again.',
      }
      setVerifyMessage(messages[verifyStatus] || 'Unknown verification status.')

      if (verifyStatus === 'success') {
        setState(prev => ({
          ...prev,
          user: { ...prev.user, emailVerified: true },
        }))
      }

      window.history.replaceState({}, '', '/')
    }
  }, [])

  const login = (email: string, emailVerified: boolean = false, userData?: Partial<AppState['user']>) => {
    const isAdmin = userData?.role === 'admin' || email === 'admin@xoxosurveys.com'
    const role = userData?.role ?? (isAdmin ? 'admin' : 'user')

    if (typeof window !== 'undefined') {
      localStorage.setItem('userEmail', email)
      localStorage.setItem('userRole', role)
      if (userData?.userId) {
        localStorage.setItem('numericUserId', String(userData.userId))
      }
      localStorage.setItem('userData', JSON.stringify({
        userId: userData?.userId ?? 0,
        balance: userData?.balance ?? 0,
        surveysCompleted: userData?.surveysCompleted ?? 0,
        surveyTarget: userData?.surveyTarget ?? 25,
        earningRate: userData?.earningRate ?? 0.005,
        inviteCode: userData?.inviteCode ?? '',
        unclaimedRevenue: userData?.unclaimedRevenue ?? 0,
        referralEarnings: userData?.referralEarnings ?? 0,
        friendsInvited: userData?.friendsInvited ?? 0,
        totalEarned: userData?.totalEarned ?? 0,
        emailVerified: isAdmin ? true : emailVerified,
        language: userData?.language ?? 'English (en)',
        firstname: userData?.firstname ?? '',
        lastname: userData?.lastname ?? '',
        newsletter: userData?.newsletter ?? 'Yes',
      }))
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
        referralEarnings: userData?.referralEarnings ?? 0,
        friendsInvited: userData?.friendsInvited ?? 0,
        totalEarned: userData?.totalEarned ?? 0,
        emailVerified: isAdmin ? true : emailVerified,
        firstname: userData?.firstname ?? prev.user.firstname,
        lastname: userData?.lastname ?? prev.user.lastname,
        newsletter: userData?.newsletter ?? prev.user.newsletter,
      },
    }))
  }

  const logout = () => {
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('userId')
    localStorage.removeItem('numericUserId')
    localStorage.removeItem('userEmail')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userData')
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
        referralEarnings: 0,
        friendsInvited: 0,
        totalEarned: 0,
        emailVerified: false,
        firstname: '',
        lastname: '',
        newsletter: 'Yes',
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
      const res = await fetch(`/api/user/balance?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        localStorage.setItem('userData', JSON.stringify(data))
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
            referralEarnings: data.referralEarnings ?? prev.user.referralEarnings,
            friendsInvited: data.friendsInvited ?? prev.user.friendsInvited,
            role: data.role ?? prev.user.role,
            firstname: data.firstname ?? prev.user.firstname,
            lastname: data.lastname ?? prev.user.lastname,
            newsletter: data.newsletter ?? prev.user.newsletter,
            language: data.language ?? prev.user.language,
            surveyTarget: data.surveyTarget ?? prev.user.surveyTarget,
          },
        }))
      }
    } catch {
      // Silently fail - user can still use the app with cached data
    }
  }

  return (
    <AppContext.Provider value={{ state, setState, login, logout, setCurrentPage, refreshUser }}>
      {verifyMessage && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center pt-4 px-4">
          <div className={`max-w-md w-full p-4 rounded-xl shadow-lg border text-sm font-medium flex items-center justify-between gap-3 bg-blue-50 border-blue-200 text-blue-800`}>
            <span>{verifyMessage}</span>
            <button
              onClick={() => setVerifyMessage(null)}
              className="text-current opacity-60 hover:opacity-100 transition-opacity text-lg leading-none"
            >
              x
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
