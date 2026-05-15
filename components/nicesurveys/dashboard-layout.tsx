'use client'

import { useApp } from '@/app/page'
import { SurveysPage } from './surveys-page'
import { CashoutPage } from './cashout-page'
import { SettingsPage } from './settings-page'
import { HelpPage } from './help-page'
import { FingerprintCollector } from './fingerprint-collector'
import { useState, useRef, useEffect } from 'react'

const sidebarItems = [
  { id: 'surveys' as const, label: 'Surveys', icon: 'survey' },
  { id: 'cashout' as const, label: 'Cashout', icon: 'cashout' },
  { id: 'invite' as const, label: 'Invite Friends', icon: 'invite' },
  { id: 'settings' as const, label: 'Settings', icon: 'settings' },
  { id: 'help' as const, label: 'Help', icon: 'help' },
]

function SidebarIcon({ type, active }: { type: string; active: boolean }) {
  const color = active ? '#0FBCC0' : '#36383A'
  const weight = active ? 2 : 1.5
  switch (type) {
    case 'survey':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      )
    case 'cashout':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      )
    case 'settings':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      )
    case 'help':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      )
    case 'logout':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      )
    case 'invite':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
      )
    case 'admin':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={weight} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      )
    default:
      return null
  }
}

export function DashboardLayout() {
  const { state, setCurrentPage, logout, refreshUser } = useApp()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Refresh user data periodically (check email verification, balance updates)
  useEffect(() => {
    // Initial refresh
    refreshUser()

    // Refresh every 30 seconds to pick up email verification and balance changes
    const interval = setInterval(refreshUser, 30000)
    return () => clearInterval(interval)
  }, [refreshUser])

  const isAdmin = state.user.role === 'admin'

  const handleNavClick = (id: string) => {
    if (id === 'invite') {
      setShowInviteModal(true)
      setMobileMenuOpen(false)
      return
    }
    setCurrentPage(id as typeof state.currentPage)
    setMobileMenuOpen(false)
  }

  const renderPage = () => {
    switch (state.currentPage) {
      case 'surveys': return <SurveysPage />
      case 'cashout': return <CashoutPage />
      case 'settings': return <SettingsPage />
      case 'help': return <HelpPage />
      default: return <SurveysPage />
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Anti-fraud fingerprint collector (invisible) */}
      <FingerprintCollector />

      {/* Header: 60px height, white bg, sticky */}
      <header className="bg-white border-b border-[#E2EAF1] sticky top-0 z-30 h-[60px]">
        <div className="flex items-center justify-between px-4 lg:px-5 h-full">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-[8px] hover:bg-[#F5F5F5] transition-colors"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#36383A" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="XoXoSurveys" className="w-[32px] h-[32px] rounded-full object-cover" />
              <span
                className="text-[18px] font-bold text-[#36383A] hidden sm:block"
                style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
              >
                XoXoSurveys
              </span>
            </div>

            {/* User Stat Badges */}
            <div className="hidden md:flex items-center gap-2 ml-4">
              <div className="flex items-center gap-1.5 bg-[#FFF8E1] text-[#B8860B] px-3 py-1 rounded-full text-[12px] font-bold border border-[#FFD700]/30">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#F9CC28">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {state.user.surveysCompleted}/{state.user.surveyTarget}
              </div>
              <div className="flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] px-3 py-1 rounded-full text-[12px] font-bold">
                +${state.user.earningRate.toFixed(3)}
              </div>
              <div className="flex items-center gap-1 bg-[#F5F5F5] text-[#36383A] px-3 py-1 rounded-full text-[12px] font-bold border border-[#E2EAF1]">
                $ {state.user.balance.toFixed(3)}
              </div>
            </div>
          </div>

          {/* Right side: notification bell, user dropdown */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2 rounded-[8px] hover:bg-[#F5F5F5] transition-colors relative"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#36383A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0FBCC0] rounded-full" />
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-[44px] w-[280px] bg-white rounded-[12px] shadow-[0px_4px_20px_0px_rgba(191,197,209,0.20)] border border-[#E2EAF1] z-50 p-4">
                  <h3 className="text-[14px] font-semibold text-[#36383A] mb-3">Notifications</h3>
                  <div className="space-y-2">
                    <div className="flex gap-2 p-2 rounded-[8px] bg-[#F9FAFB]">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                      <div>
                        <p className="text-[12px] text-[#36383A] font-medium">New surveys available!</p>
                        <p className="text-[11px] text-[#999999]">2 min ago</p>
                      </div>
                    </div>
                    <div className="flex gap-2 p-2 rounded-[8px] hover:bg-[#F9FAFB]">
                      <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center flex-shrink-0">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                      </div>
                      <div>
                        <p className="text-[12px] text-[#36383A] font-medium">Earning rate updated</p>
                        <p className="text-[11px] text-[#999999]">1 hour ago</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-[8px] hover:bg-[#F5F5F5] transition-colors"
              >
                <div
                  className="w-[32px] h-[32px] rounded-full flex items-center justify-center text-white text-[13px] font-bold"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  {state.user.email ? state.user.email[0].toUpperCase() : 'U'}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2" className={`hidden sm:block transition-transform ${showUserDropdown ? 'rotate-180' : ''}`}>
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {showUserDropdown && (
                <div className="absolute right-0 top-[44px] w-[200px] bg-white rounded-[12px] shadow-[0px_4px_20px_0px_rgba(191,197,209,0.20)] border border-[#E2EAF1] z-50 py-1">
                  <div className="px-4 py-3 border-b border-[#E2EAF1]">
                    <p className="text-[13px] font-medium text-[#36383A] truncate">{state.user.email}</p>
                    <p className="text-[11px] text-[#0FBCC0] font-semibold">ID: #{state.user.userId}</p>
                  </div>
                  <button
                    onClick={() => { setCurrentPage('settings'); setShowUserDropdown(false) }}
                    className="w-full text-left px-4 py-2 text-[13px] text-[#4B4B4B] hover:bg-[#F9FAFB] transition-colors"
                  >
                    Settings
                  </button>
                  <button
                    onClick={() => { logout(); setShowUserDropdown(false) }}
                    className="w-full text-left px-4 py-2 text-[13px] text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop: 220px wide, white bg, border-right */}
        <aside className="hidden lg:flex flex-col w-[220px] bg-white border-r border-[#E2EAF1] min-h-[calc(100vh-60px)]">
          <nav className="flex-1 py-6 px-3 space-y-1">
            {sidebarItems.map((item) => {
              const isActive = state.currentPage === item.id || (item.id === 'invite' && showInviteModal)
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium transition-all ${
                    isActive
                      ? 'text-[#0FBCC0] bg-[#F0FDFB]'
                      : 'text-[#4B4B4B] hover:bg-[#F9FAFB]'
                  }`}
                  style={isActive ? { borderLeft: '3px solid #0FBCC0' } : undefined}
                >
                  <SidebarIcon type={item.icon} active={isActive} />
                  {item.label}
                </button>
              )
            })}

            {/* Admin Panel - conditional */}
            {isAdmin && (
              <button
                onClick={() => setCurrentPage('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium transition-all ${
                  state.currentPage === 'admin'
                    ? 'text-[#0FBCC0] bg-[#F0FDFB]'
                    : 'text-[#4B4B4B] hover:bg-[#F9FAFB]'
                }`}
                style={state.currentPage === 'admin' ? { borderLeft: '3px solid #0FBCC0' } : undefined}
              >
                <SidebarIcon type="admin" active={state.currentPage === 'admin'} />
                Admin Panel
              </button>
            )}
          </nav>

          {/* Logout at bottom */}
          <div className="px-3 pb-6">
            <div className="border-t border-[#E2EAF1] pt-3">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium text-[#999999] hover:bg-[#F9FAFB] transition-colors"
              >
                <SidebarIcon type="logout" active={false} />
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <aside className="fixed left-0 top-0 bottom-0 w-[260px] bg-white z-50 shadow-[0px_4px_20px_0px_rgba(191,197,209,0.20)]">
              {/* Mobile sidebar header */}
              <div className="flex items-center justify-between px-5 h-[60px] border-b border-[#E2EAF1]">
                <div className="flex items-center gap-2.5">
                  <img src="/logo.png" alt="XoXoSurveys" className="w-[32px] h-[32px] rounded-full object-cover" />
                  <span className="text-[18px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>XoXoSurveys</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 hover:bg-[#F5F5F5] rounded-[6px]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Mobile stats */}
              <div className="flex items-center gap-2 px-5 py-3 border-b border-[#E2EAF1]">
                <div className="flex items-center gap-1 bg-[#FFF8E1] text-[#B8860B] px-2 py-0.5 rounded-full text-[11px] font-bold">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="#F9CC28"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  {state.user.surveysCompleted}/{state.user.surveyTarget}
                </div>
                <div className="flex items-center gap-1 bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded-full text-[11px] font-bold">
                  +${state.user.earningRate.toFixed(3)}
                </div>
                <div className="flex items-center gap-1 bg-[#F5F5F5] text-[#36383A] px-2 py-0.5 rounded-full text-[11px] font-bold">
                  ${state.user.balance.toFixed(3)}
                </div>
              </div>

              <nav className="px-3 py-4 space-y-1">
                {sidebarItems.map((item) => {
                  const isActive = state.currentPage === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium transition-all ${
                        isActive
                          ? 'text-[#0FBCC0] bg-[#F0FDFB]'
                          : 'text-[#4B4B4B] hover:bg-[#F9FAFB]'
                      }`}
                      style={isActive ? { borderLeft: '3px solid #0FBCC0' } : undefined}
                    >
                      <SidebarIcon type={item.icon} active={isActive} />
                      {item.label}
                    </button>
                  )
                })}
                {isAdmin && (
                  <button
                    onClick={() => { setCurrentPage('admin'); setMobileMenuOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium transition-all ${
                      state.currentPage === 'admin'
                        ? 'text-[#0FBCC0] bg-[#F0FDFB]'
                        : 'text-[#4B4B4B] hover:bg-[#F9FAFB]'
                    }`}
                    style={state.currentPage === 'admin' ? { borderLeft: '3px solid #0FBCC0' } : undefined}
                  >
                    <SidebarIcon type="admin" active={state.currentPage === 'admin'} />
                    Admin Panel
                  </button>
                )}
              </nav>

              <div className="absolute bottom-0 left-0 right-0 px-3 pb-4 border-t border-[#E2EAF1] pt-3">
                <button
                  onClick={() => { logout(); setMobileMenuOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[15px] font-medium text-[#999999] hover:bg-[#F9FAFB] transition-colors"
                >
                  <SidebarIcon type="logout" active={false} />
                  Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 min-h-[calc(100vh-60px)]">
          {renderPage()}
        </main>
      </div>

      {/* Invite Friends Modal */}
      {showInviteModal && <InviteFriendsModal onClose={() => setShowInviteModal(false)} />}
    </div>
  )
}

function InviteFriendsModal({ onClose }: { onClose: () => void }) {
  const { state } = useApp()
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(state.user.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white rounded-[12px] w-full max-w-[440px] p-6 z-10"
        style={{ boxShadow: '0px 4px 20px 0px rgba(191, 197, 209, 0.20)' }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#999999] hover:text-[#36383A] transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-[40px] h-[40px] rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h2 className="text-[20px] font-bold text-[#36383A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>Invite friends</h2>
        </div>

        {/* Benefits */}
        <ul className="space-y-2 mb-5">
          <li className="flex items-start gap-2 text-[14px] text-[#4B4B4B]">
            <span className="text-[#0FBCC0] mt-0.5">&#8226;</span>
            Invite your friends and earn 10% for every completed survey - forever.*
          </li>
          <li className="flex items-start gap-2 text-[14px] text-[#4B4B4B]">
            <span className="text-[#0FBCC0] mt-0.5">&#8226;</span>
            Your friend gets a 10% bonus for 7 days.
          </li>
          <li className="flex items-start gap-2 text-[12px] text-[#999999]">
            <span className="text-[#999999] mt-0.5">*</span>
            You can only have one account and not refer yourself. Brand bidding is also forbidden.
          </li>
        </ul>

        {/* Invitation Code */}
        <div className="mb-5">
          <h3 className="text-[14px] font-semibold text-[#36383A] mb-2">Invitation Code</h3>
          <div className="flex gap-2">
            <div className="flex-1 bg-[#F9FAFB] border border-[#E2EAF1] rounded-[8px] px-4 py-2.5 text-[14px] font-mono text-[#36383A]">
              {state.user.inviteCode}
            </div>
            <button
              onClick={handleCopy}
              className="px-4 rounded-[8px] text-[14px] font-medium text-white transition-all"
              style={{
                background: copied
                  ? '#0FBCC0'
                  : 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)',
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div>
          <h3 className="text-[14px] font-semibold text-[#36383A] mb-3">Statistics</h3>
          <div className="space-y-0">
            <div className="flex justify-between items-center py-2.5 border-b border-[#E2EAF1]">
              <span className="text-[14px] text-[#999999]">Unclaimed Revenue</span>
              <span className="text-[14px] font-semibold text-[#36383A]">{state.user.unclaimedRevenue.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-[#E2EAF1]">
              <span className="text-[14px] text-[#999999]">Friends invited</span>
              <span className="text-[14px] font-semibold text-[#36383A]">{state.user.friendsInvited}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[14px] text-[#999999]">Total Earned</span>
              <span className="text-[14px] font-semibold text-[#0FBCC0]">{state.user.totalEarned.toFixed(2)} USD</span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="ns-btn-primary w-full mt-6 h-[44px]"
        >
          Close
        </button>
      </div>
    </div>
  )
}


