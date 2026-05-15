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

  // Handle email verification redirect from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const verifyStatus = params.get('verify')

    if (verifyStatus === 'success') {
      // Mark email as verified in the current session
      setState(prev => ({
        ...prev,
        user: { ...prev.user, emailVerified: true },
      }))
      // Clean up URL
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const login = (email: string, emailVerified: boolean = false, userData?: Partial<AppState['user']>) => {
    const isAdmin = userData?.role === 'admin' || email === 'admin@xoxosurveys.com'
    setState(prev => ({
      ...prev,
      isLoggedIn: true,
      currentPage: isAdmin ? 'admin' : 'surveys',
      user: {
        ...prev.user,
        userId: userData?.userId ?? prev.user.userId,
        email,
        role: userData?.role ?? (isAdmin ? 'admin' : 'user'),
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
  }

  const logout = () => {
    localStorage.removeItem('sessionToken')
    localStorage.removeItem('userId')
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
      const res = await fetch(`/api/user/balance?userId=${userId}`)
      if (res.ok) {
        const data = await res.json()
        setState(prev => ({
          ...prev,
          user: {
            ...prev.user,
            balance: data.balance ?? prev.user.balance,
            emailVerified: data.emailVerified ?? prev.user.emailVerified,
            totalEarned: data.totalEarned ?? prev.user.totalEarned,
            surveysCompleted: data.surveysCompleted ?? prev.user.surveysCompleted,
          },
        }))
      }
    } catch {
      // Silently fail - user can still use the app with cached data
    }
  }

  return (
    <AppContext.Provider value={{ state, setState, login, logout, setCurrentPage, refreshUser }}>
      {!state.isLoggedIn ? (
        <AuthPage />
      ) : state.currentPage === 'admin' ? (
        <AdminLayout />
      ) : (
        <DashboardLayout />
      )}
    </AppContext.Provider>
  )
}
