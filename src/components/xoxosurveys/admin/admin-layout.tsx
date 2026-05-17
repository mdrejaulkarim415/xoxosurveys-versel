'use client'

import { useState } from 'react'
import { useApp } from '@/app/page'
import { AdminDashboard } from './admin-dashboard'
import { AdminUsers } from './admin-users'
import { AdminSurveyWalls } from './admin-survey-walls'
import { AdminSurveys } from './admin-surveys'
import { AdminFraud } from './admin-fraud'
import { AdminCashouts } from './admin-cashouts'
import { AdminSettings } from './admin-settings'
import { AdminSupport } from './admin-support'
import {
  LayoutDashboard,
  Users,
  LayoutGrid,
  ClipboardList,
  ShieldAlert,
  Wallet,
  Settings,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react'

export type AdminPage = 'dashboard' | 'users' | 'survey-walls' | 'surveys' | 'fraud' | 'cashouts' | 'support' | 'settings'

const navItems: { id: AdminPage; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { id: 'users', label: 'Users', icon: <Users size={20} /> },
  { id: 'survey-walls', label: 'Survey Walls', icon: <LayoutGrid size={20} /> },
  { id: 'surveys', label: 'Surveys', icon: <ClipboardList size={20} /> },
  { id: 'fraud', label: 'Fraud Monitor', icon: <ShieldAlert size={20} /> },
  { id: 'cashouts', label: 'Cashouts', icon: <Wallet size={20} /> },
  { id: 'support', label: 'Support', icon: <MessageSquare size={20} /> },
  { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
]

export function AdminLayout() {
  const { state, logout, setCurrentPage } = useApp()
  const [activePage, setActivePage] = useState<AdminPage>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <AdminDashboard />
      case 'users': return <AdminUsers />
      case 'survey-walls': return <AdminSurveyWalls />
      case 'surveys': return <AdminSurveys />
      case 'fraud': return <AdminFraud />
      case 'cashouts': return <AdminCashouts />
      case 'support': return <AdminSupport />
      case 'settings': return <AdminSettings />
    }
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-[260px] bg-white border-r border-[#E5E7EB] min-h-screen">
        {/* Brand */}
        <div className="h-[64px] flex items-center gap-3 px-5 border-b border-[#E5E7EB]">
          <img src="/logo.png" alt="XoXoSurveys" className="w-[36px] h-[36px] rounded-[10px] object-cover" />
          <div>
            <h1
              className="text-[16px] font-bold text-[#1A1A1A] leading-tight"
              style={{ fontFamily: 'var(--font-outfit), sans-serif' }}
            >
              XoXoSurveys
            </h1>
            <p className="text-[11px] text-[#999999] leading-tight">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium transition-all ${
                activePage === item.id
                  ? 'text-white shadow-sm'
                  : 'text-[#555555] hover:bg-[#F5F7FA]'
              }`}
              style={
                activePage === item.id
                  ? { background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }
                  : undefined
              }
            >
              {item.icon}
              {item.label}
              {activePage === item.id && <ChevronRight size={16} className="ml-auto opacity-70" />}
            </button>
          ))}

          {/* Back to Dashboard */}
          <div className="pt-3 mt-3 border-t border-[#E5E7EB]">
            <button
              onClick={() => setCurrentPage('surveys')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium text-[#555555] hover:bg-[#F5F7FA] transition-all"
            >
              <ArrowLeft size={20} />
              Back to Dashboard
            </button>
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-[#E5E7EB] p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-white text-[14px] font-bold"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{state.user.email || 'admin@xoxosurveys.com'}</p>
              <p className="text-[11px] text-[#999999]">Administrator</p>
            </div>
            <button onClick={logout} className="text-[#999999] hover:text-[#EF4444] transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-white z-50 shadow-xl">
            <div className="h-[64px] flex items-center justify-between px-5 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <img src="/logo.png" alt="XoXoSurveys" className="w-[36px] h-[36px] rounded-[10px] object-cover" />
                <div>
                  <h1 className="text-[16px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                    XoXoSurveys
                  </h1>
                  <p className="text-[11px] text-[#999999]">Admin Panel</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-[#999999]">
                <X size={22} />
              </button>
            </div>
            <nav className="py-4 px-3 space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActivePage(item.id); setSidebarOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium transition-all ${
                    activePage === item.id
                      ? 'text-white shadow-sm'
                      : 'text-[#555555] hover:bg-[#F5F7FA]'
                  }`}
                  style={
                    activePage === item.id
                      ? { background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }
                      : undefined
                  }
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              <div className="pt-3 mt-3 border-t border-[#E5E7EB]">
                <button
                  onClick={() => { setCurrentPage('surveys'); setSidebarOpen(false) }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[14px] font-medium text-[#555555] hover:bg-[#F5F7FA] transition-all"
                >
                  <ArrowLeft size={20} />
                  Back to Dashboard
                </button>
              </div>
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-[#E5E7EB] p-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-white text-[14px] font-bold"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  A
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#1A1A1A] truncate">{state.user.email || 'admin@xoxosurveys.com'}</p>
                  <p className="text-[11px] text-[#999999]">Administrator</p>
                </div>
                <button onClick={logout} className="text-[#999999] hover:text-[#EF4444]">
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-[64px] bg-white border-b border-[#E5E7EB] flex items-center justify-between px-5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-[8px] hover:bg-[#F5F7FA] text-[#555555]"
            >
              <Menu size={22} />
            </button>
            <div>
              <h2 className="text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                {navItems.find(i => i.id === activePage)?.label}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-[#FFF7ED] text-[#D97706] px-3 py-1.5 rounded-full text-[12px] font-semibold">
              <ShieldAlert size={14} />
              Admin Mode
            </div>
            <div
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white text-[13px] font-bold cursor-pointer"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
            >
              A
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}
