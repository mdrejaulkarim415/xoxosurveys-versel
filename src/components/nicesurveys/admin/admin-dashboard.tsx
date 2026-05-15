'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  UserCheck,
  DollarSign,
  Clock,
  ShieldAlert,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  AlertCircle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalRevenue: number
  pendingCashouts: number
  fraudAlerts: number
  usersGrowth: number
  revenueGrowth: number
  activeUsersGrowth: number
  pendingCashoutsGrowth: number
  fraudGrowth: number
  chargebackGrowth: number
  chargebackCount: number
  userGrowth: ChartData[]
  fraudDistribution: FraudDistributionItem[]
  recentAlerts: RecentAlert[]
  pendingCashoutsList: PendingCashout[]
  recentChargebacks: RecentChargeback[]
}

interface ChartData {
  name: string
  users: number
  revenue: number
  surveys: number
}

interface FraudDistributionItem {
  name: string
  value: number
  color: string
}

interface RecentAlert {
  id: string
  type: string
  user: string
  severity: string
  time: string
}

interface PendingCashout {
  id: string
  user: string
  amount: number
  method: string
  time: string
}

interface RecentChargeback {
  id: string
  user: string
  amount: number
  method: string
  reason: string
  time: string
}

const emptyStats: DashboardStats = {
  totalUsers: 0,
  activeUsers: 0,
  totalRevenue: 0,
  pendingCashouts: 0,
  fraudAlerts: 0,
  usersGrowth: 0,
  revenueGrowth: 0,
  activeUsersGrowth: 0,
  pendingCashoutsGrowth: 0,
  fraudGrowth: 0,
  chargebackGrowth: 0,
  chargebackCount: 0,
  userGrowth: [],
  fraudDistribution: [{ name: 'No Data', value: 100, color: '#D1D5DB' }],
  recentAlerts: [],
  pendingCashoutsList: [],
  recentChargebacks: [],
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      change: stats.usersGrowth,
      icon: <Users size={20} />,
      color: '#2DD9B6',
      bg: '#E8F8F5',
    },
    {
      title: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      change: stats.activeUsersGrowth,
      icon: <UserCheck size={20} />,
      color: '#22B9CF',
      bg: '#E0F7FA',
    },
    {
      title: 'Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      change: stats.revenueGrowth,
      icon: <DollarSign size={20} />,
      color: '#10B981',
      bg: '#ECFDF5',
    },
    {
      title: 'Pending Cashouts',
      value: `$${stats.pendingCashouts.toLocaleString()}`,
      change: stats.pendingCashoutsGrowth,
      icon: <Clock size={20} />,
      color: '#F59E0B',
      bg: '#FFF7ED',
    },
    {
      title: 'Fraud Alerts',
      value: stats.fraudAlerts.toString(),
      change: stats.fraudGrowth,
      icon: <ShieldAlert size={20} />,
      color: '#EF4444',
      bg: '#FEF2F2',
    },
    {
      title: 'Chargebacks',
      value: stats.chargebackCount.toString(),
      change: stats.chargebackGrowth,
      icon: <RotateCcw size={20} />,
      color: '#7C3AED',
      bg: '#F5F3FF',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="border-[#E5E7EB] shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[12px] text-[#999999] font-medium">{card.title}</p>
                  <p className="text-[24px] font-bold text-[#1A1A1A] mt-1" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                    {loading ? '...' : card.value}
                  </p>
                </div>
                <div
                  className="w-[40px] h-[40px] rounded-[10px] flex items-center justify-center"
                  style={{ background: card.bg, color: card.color }}
                >
                  {card.icon}
                </div>
              </div>
              <div className="flex items-center gap-1 mt-2">
                {card.change >= 0 ? (
                  <ArrowUpRight size={14} className="text-[#10B981]" />
                ) : (
                  <ArrowDownRight size={14} className="text-[#EF4444]" />
                )}
                <span className={`text-[12px] font-semibold ${card.change >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {Math.abs(card.change)}%
                </span>
                <span className="text-[11px] text-[#999999]">vs last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2 border-[#E5E7EB] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[16px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
              Revenue & User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {loading ? (
                <div className="h-full flex items-center justify-center text-[#999999] text-sm">Loading chart...</div>
              ) : stats.userGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.userGrowth}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2DD9B6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2DD9B6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22B9CF" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22B9CF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#999' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#999' }} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#2DD9B6" strokeWidth={2} fill="url(#colorRevenue)" name="Revenue ($)" />
                    <Area type="monotone" dataKey="users" stroke="#22B9CF" strokeWidth={2} fill="url(#colorUsers)" name="Users" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-[#999999] text-sm">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fraud Distribution */}
        <Card className="border-[#E5E7EB] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-[16px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
              Fraud Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {loading ? (
                <div className="h-full flex items-center justify-center text-[#999999] text-sm">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.fraudDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {stats.fraudDistribution.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-1.5 mt-2">
              {stats.fraudDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-[#555555]">{item.name}</span>
                  </div>
                  <span className="font-semibold text-[#1A1A1A]">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Survey Completions Chart */}
      <Card className="border-[#E5E7EB] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-[16px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            Survey Completions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px]">
            {loading ? (
              <div className="h-full flex items-center justify-center text-[#999999] text-sm">Loading chart...</div>
            ) : stats.userGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#999' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#999' }} />
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  />
                  <Bar dataKey="surveys" fill="#2DD9B6" radius={[4, 4, 0, 0]} name="Completions" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-[#999999] text-sm">No data available</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Chargeback Alert Banner */}
      {stats.recentChargebacks.length > 0 && (
        <Card className="border-[#7C3AED]/30 bg-[#F5F3FF] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-[40px] h-[40px] rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-bold text-[#7C3AED]">Chargeback Alert</h3>
                <p className="text-[12px] text-[#555555]">
                  {stats.recentChargebacks.length} recent chargeback{stats.recentChargebacks.length > 1 ? 's' : ''} detected totaling ${stats.recentChargebacks.reduce((sum, cb) => sum + cb.amount, 0).toFixed(2)}.
                  Review and manage them in the Cashouts section.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Fraud Alerts */}
        <Card className="border-[#E5E7EB] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[16px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                Recent Fraud Alerts
              </CardTitle>
              <Badge variant="secondary" className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2]">
                <AlertTriangle size={12} className="mr-1" />
                {stats.fraudAlerts} new
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[260px] overflow-y-auto">
              {loading ? (
                <div className="text-center text-[#999999] text-sm py-4">Loading alerts...</div>
              ) : stats.recentAlerts.length > 0 ? (
                stats.recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-[8px] bg-[#FAFAFA] hover:bg-[#F0F2F5] transition-colors">
                    <ShieldAlert
                      size={18}
                      className={`mt-0.5 flex-shrink-0 ${
                        alert.severity === 'critical' ? 'text-[#EF4444]' : alert.severity === 'high' ? 'text-[#F59E0B]' : 'text-[#22B9CF]'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#1A1A1A]">{alert.type}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${
                            alert.severity === 'critical'
                              ? 'bg-[#FEF2F2] text-[#EF4444]'
                              : alert.severity === 'high'
                              ? 'bg-[#FFF7ED] text-[#F59E0B]'
                              : 'bg-[#E0F7FA] text-[#22B9CF]'
                          }`}
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-[12px] text-[#999999] mt-0.5">{alert.user}</p>
                    </div>
                    <span className="text-[11px] text-[#999999] whitespace-nowrap">{alert.time}</span>
                  </div>
                ))
              ) : (
                <div className="text-center text-[#999999] text-sm py-4">No fraud alerts</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Cashouts */}
        <Card className="border-[#E5E7EB] shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[16px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                Pending Cashouts
              </CardTitle>
              <Button
                size="sm"
                className="text-[12px] h-8 text-white"
                style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
              >
                <CheckCircle size={14} className="mr-1" />
                Approve All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[260px] overflow-y-auto">
              {loading ? (
                <div className="text-center text-[#999999] text-sm py-4">Loading cashouts...</div>
              ) : stats.pendingCashoutsList.length > 0 ? (
                stats.pendingCashoutsList.map((co) => (
                  <div key={co.id} className="flex items-center gap-3 p-3 rounded-[8px] bg-[#FAFAFA] hover:bg-[#F0F2F5] transition-colors">
                    <div className="w-[38px] h-[38px] rounded-full bg-[#FFF7ED] flex items-center justify-center flex-shrink-0">
                      <DollarSign size={18} className="text-[#F59E0B]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1A1A1A]">{co.user}</p>
                      <p className="text-[12px] text-[#999999]">{co.method} &middot; {co.time}</p>
                    </div>
                    <span className="text-[16px] font-bold text-[#1A1A1A]">${co.amount.toFixed(2)}</span>
                    <Button size="sm" variant="outline" className="text-[11px] h-7 border-[#2DD9B6] text-[#2DD9B6] hover:bg-[#2DD9B6] hover:text-white">
                      Approve
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center text-[#999999] text-sm py-4">No pending cashouts</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Chargebacks */}
      <Card className="border-[#E5E7EB] shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[16px] font-bold text-[#7C3AED]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
              <div className="flex items-center gap-2">
                <RotateCcw size={18} />
                Recent Chargebacks
              </div>
            </CardTitle>
            <Badge className="bg-[#F5F3FF] text-[#7C3AED] hover:bg-[#F5F3FF]">
              <RotateCcw size={12} className="mr-1" />
              {stats.chargebackCount} new
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[260px] overflow-y-auto">
            {loading ? (
              <div className="text-center text-[#999999] text-sm py-4">Loading chargebacks...</div>
            ) : stats.recentChargebacks.length > 0 ? (
              stats.recentChargebacks.map((cb) => (
                <div key={cb.id} className="flex items-center gap-3 p-3 rounded-[8px] bg-[#F5F3FF]/50 hover:bg-[#F5F3FF] transition-colors border border-[#7C3AED]/10">
                  <div className="w-[38px] h-[38px] rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0">
                    <RotateCcw size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1A1A1A]">{cb.user}</p>
                    <p className="text-[12px] text-[#555555] truncate">{cb.reason}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[14px] font-bold text-[#EF4444]">-${cb.amount.toFixed(2)}</p>
                    <p className="text-[11px] text-[#999999]">{cb.method}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-[#999999] text-sm py-4">No chargebacks</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="border-[#E5E7EB] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-[16px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Approve Cashouts', icon: <CheckCircle size={20} />, color: '#10B981', bg: '#ECFDF5' },
              { label: 'Review Flagged', icon: <AlertTriangle size={20} />, color: '#F59E0B', bg: '#FFF7ED' },
              { label: 'Manage Chargebacks', icon: <RotateCcw size={20} />, color: '#7C3AED', bg: '#F5F3FF' },
              { label: 'Export Report', icon: <TrendingUp size={20} />, color: '#22B9CF', bg: '#E0F7FA' },
            ].map((action) => (
              <button
                key={action.label}
                className="flex flex-col items-center gap-2 p-4 rounded-[10px] border border-[#E5E7EB] hover:shadow-md transition-all bg-white"
              >
                <div
                  className="w-[44px] h-[44px] rounded-[10px] flex items-center justify-center"
                  style={{ background: action.bg, color: action.color }}
                >
                  {action.icon}
                </div>
                <span className="text-[13px] font-medium text-[#555555]">{action.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
