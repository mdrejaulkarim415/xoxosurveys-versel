'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  MoreHorizontal,
  Ban,
  CheckCircle,
  ShieldAlert,
  Eye,
  Download,
  Trash2,
  Flag,
  UserCheck,
  RefreshCw,
  XCircle,
  Users,
  Mail,
  Globe,
  Smartphone,
  DollarSign,
  Plus,
  Minus,
} from 'lucide-react'

interface UserRecord {
  id: string
  userId: number
  email: string
  name: string | null
  role: string
  balance: number
  totalEarned: number
  surveysCompleted: number
  fraudScore: number
  isFlagged: boolean
  isBanned: boolean
  emailVerified: boolean
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  lastLoginIp: string | null
  loginCount: number
}

const mockUsers: UserRecord[] = [
  { id: '1', userId: 100, email: 'john@example.com', name: 'John Doe', role: 'user', balance: 45.50, totalEarned: 120.00, surveysCompleted: 34, fraudScore: 5, isFlagged: false, isBanned: false, emailVerified: true, isActive: true, createdAt: '2025-01-15', lastLoginAt: '2025-03-10', lastLoginIp: '192.168.1.1', loginCount: 45 },
  { id: '2', userId: 101, email: 'sarah@example.com', name: 'Sarah Smith', role: 'user', balance: 22.30, totalEarned: 78.50, surveysCompleted: 22, fraudScore: 75, isFlagged: true, isBanned: false, emailVerified: true, isActive: true, createdAt: '2025-02-01', lastLoginAt: '2025-03-09', lastLoginIp: '10.0.0.55', loginCount: 30 },
  { id: '3', userId: 102, email: 'mike@example.com', name: 'Mike Johnson', role: 'user', balance: 0, totalEarned: 15.00, surveysCompleted: 5, fraudScore: 90, isFlagged: true, isBanned: true, emailVerified: false, isActive: false, createdAt: '2025-02-15', lastLoginAt: '2025-02-28', lastLoginIp: '172.16.0.1', loginCount: 8 },
  { id: '4', userId: 103, email: 'emma@example.com', name: 'Emma Wilson', role: 'user', balance: 88.90, totalEarned: 210.00, surveysCompleted: 56, fraudScore: 2, isFlagged: false, isBanned: false, emailVerified: true, isActive: true, createdAt: '2024-11-20', lastLoginAt: '2025-03-10', lastLoginIp: '203.0.113.42', loginCount: 120 },
  { id: '5', userId: 104, email: 'alex@example.com', name: 'Alex Brown', role: 'user', balance: 12.00, totalEarned: 45.00, surveysCompleted: 12, fraudScore: 45, isFlagged: false, isBanned: false, emailVerified: true, isActive: true, createdAt: '2025-01-30', lastLoginAt: '2025-03-08', lastLoginIp: '198.51.100.7', loginCount: 25 },
  { id: '6', userId: 105, email: 'lisa@example.com', name: 'Lisa Davis', role: 'user', balance: 5.50, totalEarned: 30.00, surveysCompleted: 8, fraudScore: 60, isFlagged: true, isBanned: false, emailVerified: false, isActive: true, createdAt: '2025-03-01', lastLoginAt: '2025-03-09', lastLoginIp: '10.0.0.200', loginCount: 12 },
  { id: '7', userId: 106, email: 'admin@xoxosurveys.com', name: 'Admin User', role: 'admin', balance: 0, totalEarned: 0, surveysCompleted: 0, fraudScore: 0, isFlagged: false, isBanned: false, emailVerified: true, isActive: true, createdAt: '2024-01-01', lastLoginAt: '2025-03-10', lastLoginIp: '127.0.0.1', loginCount: 999 },
  { id: '8', userId: 107, email: 'bot_user@example.com', name: 'Bot Account', role: 'user', balance: 0, totalEarned: 2.50, surveysCompleted: 150, fraudScore: 95, isFlagged: true, isBanned: true, emailVerified: false, isActive: false, createdAt: '2025-02-20', lastLoginAt: '2025-02-25', lastLoginIp: '45.33.32.156', loginCount: 3 },
]

export function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>(mockUsers)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [fraudFilter, setFraudFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [balanceUser, setBalanceUser] = useState<UserRecord | null>(null)
  const [balanceAction, setBalanceAction] = useState<'add' | 'subtract' | 'set'>('add')
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceReason, setBalanceReason] = useState('')
  const [balanceSuccess, setBalanceSuccess] = useState(false)

  const filteredUsers = users.filter((u) => {
    if (search && !u.email.toLowerCase().includes(search.toLowerCase()) && !(u.name || '').toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (statusFilter === 'active' && (!u.isActive || u.isBanned)) return false
    if (statusFilter === 'banned' && !u.isBanned) return false
    if (statusFilter === 'flagged' && !u.isFlagged) return false
    if (fraudFilter === 'low' && u.fraudScore >= 30) return false
    if (fraudFilter === 'medium' && (u.fraudScore < 30 || u.fraudScore >= 70)) return false
    if (fraudFilter === 'high' && u.fraudScore < 70) return false
    return true
  })

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleAll = () => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredUsers.map((u) => u.id)))
    }
  }

  const handleBalanceAdjust = () => {
    if (!balanceUser || !balanceAmount) return
    const amount = parseFloat(balanceAmount)
    if (isNaN(amount) || amount < 0) return

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== balanceUser!.id) return u
        let newBalance = u.balance
        switch (balanceAction) {
          case 'add': newBalance = u.balance + amount; break
          case 'subtract': newBalance = Math.max(0, u.balance - amount); break
          case 'set': newBalance = amount; break
        }
        return { ...u, balance: Math.round(newBalance * 100) / 100 }
      })
    )
    setBalanceSuccess(true)
    setTimeout(() => {
      setBalanceSuccess(false)
      setBalanceOpen(false)
      setBalanceAmount('')
      setBalanceReason('')
    }, 1500)
  }

  const openBalanceDialog = (user: UserRecord) => {
    setBalanceUser(user)
    setBalanceAction('add')
    setBalanceAmount('')
    setBalanceReason('')
    setBalanceSuccess(false)
    setBalanceOpen(true)
  }

  const handleAction = (userId: string, action: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u
        switch (action) {
          case 'ban': return { ...u, isBanned: true, isActive: false }
          case 'unban': return { ...u, isBanned: false, isActive: true }
          case 'verify': return { ...u, emailVerified: true }
          case 'reset_fraud': return { ...u, fraudScore: 0, isFlagged: false }
          case 'flag': return { ...u, isFlagged: true }
          case 'unflag': return { ...u, isFlagged: false }
          case 'delete': return u
          default: return u
        }
      })
    )
  }

  const getFraudBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2]">High ({score})</Badge>
    if (score >= 30) return <Badge className="bg-[#FFF7ED] text-[#F59E0B] hover:bg-[#FFF7ED]">Medium ({score})</Badge>
    return <Badge className="bg-[#ECFDF5] text-[#10B981] hover:bg-[#ECFDF5]">Low ({score})</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="border-[#E5E7EB] shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
              <Input
                placeholder="Search by email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-[13px] border-[#E5E7EB]"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[130px] h-9 text-[13px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9 text-[13px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fraudFilter} onValueChange={setFraudFilter}>
              <SelectTrigger className="w-[140px] h-9 text-[13px]">
                <SelectValue placeholder="Fraud Score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="low">Low (0-29)</SelectItem>
                <SelectItem value="medium">Medium (30-69)</SelectItem>
                <SelectItem value="high">High (70-100)</SelectItem>
              </SelectContent>
            </Select>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#999999]">{selectedIds.size} selected</span>
                <Button size="sm" variant="outline" className="h-8 text-[12px] border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white">
                  <Ban size={14} className="mr-1" /> Ban Selected
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-[12px]">
                  <Download size={14} className="mr-1" /> Export
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-[#E5E7EB] shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-[#E5E7EB]">
                  <TableHead className="w-[40px]">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded accent-[#2DD9B6]"
                    />
                  </TableHead>
                  <TableHead className="text-[12px] text-[#999999]">User</TableHead>
                  <TableHead className="text-[12px] text-[#999999]">ID</TableHead>
                  <TableHead className="text-[12px] text-[#999999]">Role</TableHead>
                  <TableHead className="text-[12px] text-[#999999]">Balance</TableHead>
                  <TableHead className="text-[12px] text-[#999999]">Surveys</TableHead>
                  <TableHead className="text-[12px] text-[#999999]">Fraud Score</TableHead>
                  <TableHead className="text-[12px] text-[#999999]">Status</TableHead>
                  <TableHead className="text-[12px] text-[#999999]">Joined</TableHead>
                  <TableHead className="w-[40px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-b border-[#F0F2F5] hover:bg-[#FAFAFA] cursor-pointer">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(user.id)}
                        onChange={() => toggleSelect(user.id)}
                        className="w-4 h-4 rounded accent-[#2DD9B6]"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                        >
                          {(user.name || user.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-[#1A1A1A]">{user.name || '—'}</p>
                          <p className="text-[11px] text-[#999999]">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[13px] font-semibold text-[#0FBCC0]">#{user.userId}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={user.role === 'admin' ? 'bg-[#E0F7FA] text-[#22B9CF]' : 'bg-[#F5F5F5] text-[#999999]'}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[13px] font-medium">${user.balance.toFixed(2)}</TableCell>
                    <TableCell className="text-[13px]">{user.surveysCompleted}</TableCell>
                    <TableCell>{getFraudBadge(user.fraudScore)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {user.isBanned && <Badge className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2]">Banned</Badge>}
                        {user.isFlagged && !user.isBanned && <Badge className="bg-[#FFF7ED] text-[#F59E0B] hover:bg-[#FFF7ED]">Flagged</Badge>}
                        {!user.isBanned && !user.isFlagged && user.isActive && (
                          <Badge className="bg-[#ECFDF5] text-[#10B981] hover:bg-[#ECFDF5]">Active</Badge>
                        )}
                        {!user.emailVerified && (
                          <Badge className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2]">Unverified</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-[12px] text-[#999999]">{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setDetailOpen(true) }}>
                            <Eye size={14} className="mr-2" /> View Details
                          </DropdownMenuItem>
                          {user.isBanned ? (
                            <DropdownMenuItem onClick={() => handleAction(user.id, 'unban')}>
                              <UserCheck size={14} className="mr-2" /> Unban
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleAction(user.id, 'ban')}>
                              <Ban size={14} className="mr-2" /> Ban
                            </DropdownMenuItem>
                          )}
                          {!user.emailVerified && (
                            <DropdownMenuItem onClick={() => handleAction(user.id, 'verify')}>
                              <CheckCircle size={14} className="mr-2" /> Verify Email
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => openBalanceDialog(user)}>
                            <DollarSign size={14} className="mr-2" /> Adjust Balance
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction(user.id, 'reset_fraud')}>
                            <RefreshCw size={14} className="mr-2" /> Reset Fraud Score
                          </DropdownMenuItem>
                          {user.isFlagged ? (
                            <DropdownMenuItem onClick={() => handleAction(user.id, 'unflag')}>
                              <Flag size={14} className="mr-2" /> Unflag
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleAction(user.id, 'flag')}>
                              <Flag size={14} className="mr-2" /> Flag
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem className="text-[#EF4444]" onClick={() => handleAction(user.id, 'delete')}>
                            <Trash2 size={14} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-[#E5E7EB]">
            <p className="text-[12px] text-[#999999]">Showing {filteredUsers.length} of {users.length} users</p>
          </div>
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[700px] max-h-[90vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[18px] font-bold" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                  User Details
                </DialogTitle>
              </DialogHeader>

              {/* Profile Card */}
              <div className="flex items-center gap-4 p-4 bg-[#F8FAFB] rounded-[10px]">
                <div
                  className="w-[56px] h-[56px] rounded-full flex items-center justify-center text-white text-[20px] font-bold"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                >
                  {(selectedUser.name || selectedUser.email)[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-[16px] font-bold text-[#1A1A1A]">{selectedUser.name || 'Unknown'}</h3>
                  <p className="text-[13px] text-[#999999]">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] font-semibold text-[#0FBCC0] bg-[#F0FDFB] px-2 py-0.5 rounded-full">ID: #{selectedUser.userId}</span>
                    {getFraudBadge(selectedUser.fraudScore)}
                    {selectedUser.isBanned && <Badge className="bg-[#FEF2F2] text-[#EF4444]">Banned</Badge>}
                    {selectedUser.emailVerified ? (
                      <Badge className="bg-[#ECFDF5] text-[#10B981]">Verified</Badge>
                    ) : (
                      <Badge className="bg-[#FEF2F2] text-[#EF4444]">Unverified</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[22px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                    ${selectedUser.balance.toFixed(2)}
                  </p>
                  <p className="text-[12px] text-[#999999]">Balance</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Total Earned', value: `$${selectedUser.totalEarned.toFixed(2)}`, icon: <DollarSign size={16} /> },
                  { label: 'Surveys Done', value: selectedUser.surveysCompleted.toString(), icon: <Users size={16} /> },
                  { label: 'Login Count', value: selectedUser.loginCount.toString(), icon: <Globe size={16} /> },
                  { label: 'Role', value: selectedUser.role, icon: <Smartphone size={16} /> },
                ].map((stat) => (
                  <div key={stat.label} className="p-3 bg-[#F8FAFB] rounded-[8px] text-center">
                    <div className="flex items-center justify-center text-[#22B9CF] mb-1">{stat.icon}</div>
                    <p className="text-[14px] font-bold text-[#1A1A1A]">{stat.value}</p>
                    <p className="text-[11px] text-[#999999]">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Activity Log */}
              <div>
                <h4 className="text-[14px] font-bold text-[#1A1A1A] mb-2">Recent Activity</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {[
                    { action: 'Survey completed', detail: 'Consumer Preferences Survey', time: '2 hours ago' },
                    { action: 'Cashout requested', detail: '$25.50 via PayPal', time: '1 day ago' },
                    { action: 'Login', detail: `IP: ${selectedUser.lastLoginIp || 'Unknown'}`, time: '2 days ago' },
                    { action: 'Survey started', detail: 'Market Research 2025', time: '3 days ago' },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-[6px] hover:bg-[#F8FAFB] text-[13px]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#2DD9B6]" />
                      <span className="font-medium text-[#1A1A1A]">{log.action}</span>
                      <span className="text-[#999999]">— {log.detail}</span>
                      <span className="ml-auto text-[11px] text-[#999999]">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* IP History */}
              <div>
                <h4 className="text-[14px] font-bold text-[#1A1A1A] mb-2">IP History</h4>
                <div className="space-y-1.5">
                  {[
                    { ip: selectedUser.lastLoginIp || '192.168.1.1', country: 'US', city: 'New York', isVpn: false },
                    { ip: '10.0.0.55', country: 'US', city: 'Chicago', isVpn: false },
                    { ip: '45.33.32.156', country: 'DE', city: 'Berlin', isVpn: true },
                  ].map((ip, i) => (
                    <div key={i} className="flex items-center gap-2 text-[12px] p-2 rounded-[6px] hover:bg-[#F8FAFB]">
                      <Globe size={14} className="text-[#999999]" />
                      <span className="font-mono text-[#1A1A1A]">{ip.ip}</span>
                      <span className="text-[#999999]">{ip.city}, {ip.country}</span>
                      {ip.isVpn && <Badge className="bg-[#FEF2F2] text-[#EF4444] text-[10px]">VPN</Badge>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#E5E7EB]">
                <Button
                  size="sm"
                  className="text-[12px] text-white"
                  style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                  onClick={() => { openBalanceDialog(selectedUser); setDetailOpen(false) }}
                >
                  <DollarSign size={14} className="mr-1" /> Adjust Balance
                </Button>
                {selectedUser.isBanned ? (
                  <Button size="sm" className="text-[12px] bg-[#10B981] hover:bg-[#059669] text-white" onClick={() => { handleAction(selectedUser.id, 'unban'); setDetailOpen(false) }}>
                    <UserCheck size={14} className="mr-1" /> Unban User
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" className="text-[12px] border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white" onClick={() => { handleAction(selectedUser.id, 'ban'); setDetailOpen(false) }}>
                    <Ban size={14} className="mr-1" /> Ban User
                  </Button>
                )}
                {!selectedUser.emailVerified && (
                  <Button size="sm" variant="outline" className="text-[12px]" onClick={() => { handleAction(selectedUser.id, 'verify'); setDetailOpen(false) }}>
                    <Mail size={14} className="mr-1" /> Verify Email
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-[12px]" onClick={() => { handleAction(selectedUser.id, 'reset_fraud'); setDetailOpen(false) }}>
                  <RefreshCw size={14} className="mr-1" /> Reset Fraud Score
                </Button>
                <Button size="sm" variant="outline" className="text-[12px]" onClick={() => { handleAction(selectedUser.id, selectedUser.isFlagged ? 'unflag' : 'flag'); setDetailOpen(false) }}>
                  <Flag size={14} className="mr-1" /> {selectedUser.isFlagged ? 'Unflag' : 'Flag'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog open={balanceOpen} onOpenChange={setBalanceOpen}>
        <DialogContent className="max-w-[420px]">
          {balanceUser && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[18px] font-bold" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                  Adjust Balance
                </DialogTitle>
              </DialogHeader>

              {balanceSuccess ? (
                <div className="text-center py-6">
                  <div
                    className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                  >
                    <CheckCircle size={28} className="text-white" />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-1">Balance Updated!</h3>
                  <p className="text-[13px] text-[#999999]">{balanceUser.name || balanceUser.email}'s balance has been adjusted.</p>
                </div>
              ) : (
                <>
                  {/* User Info */}
                  <div className="flex items-center gap-3 p-3 bg-[#F8FAFB] rounded-[10px]">
                    <div
                      className="w-[40px] h-[40px] rounded-full flex items-center justify-center text-white text-[14px] font-bold"
                      style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                    >
                      {(balanceUser.name || balanceUser.email)[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold text-[#1A1A1A]">{balanceUser.name || 'Unknown'}</p>
                      <p className="text-[12px] text-[#999999]">{balanceUser.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[16px] font-bold text-[#1A1A1A]">${balanceUser.balance.toFixed(2)}</p>
                      <p className="text-[11px] text-[#999999]">Current</p>
                    </div>
                  </div>

                  {/* Action Type */}
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-[#36383A]">Action</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setBalanceAction('add')}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-[8px] text-[13px] font-medium transition-all border"
                        style={{
                          background: balanceAction === 'add' ? 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' : '#FFFFFF',
                          color: balanceAction === 'add' ? '#FFFFFF' : '#4B4B4B',
                          borderColor: balanceAction === 'add' ? 'transparent' : '#E2EAF1',
                        }}
                      >
                        <Plus size={14} /> Add
                      </button>
                      <button
                        onClick={() => setBalanceAction('subtract')}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-[8px] text-[13px] font-medium transition-all border"
                        style={{
                          background: balanceAction === 'subtract' ? '#EF4444' : '#FFFFFF',
                          color: balanceAction === 'subtract' ? '#FFFFFF' : '#4B4B4B',
                          borderColor: balanceAction === 'subtract' ? 'transparent' : '#E2EAF1',
                        }}
                      >
                        <Minus size={14} /> Subtract
                      </button>
                      <button
                        onClick={() => setBalanceAction('set')}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-[8px] text-[13px] font-medium transition-all border"
                        style={{
                          background: balanceAction === 'set' ? '#F59E0B' : '#FFFFFF',
                          color: balanceAction === 'set' ? '#FFFFFF' : '#4B4B4B',
                          borderColor: balanceAction === 'set' ? 'transparent' : '#E2EAF1',
                        }}
                      >
                        <DollarSign size={14} /> Set
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-[#36383A]">Amount ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999] text-[14px]">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-7 h-[44px] text-[16px] font-semibold border-[#E2EAF1]"
                      />
                    </div>
                    {balanceAction === 'add' && balanceAmount && (
                      <p className="text-[12px] text-[#2DD9B6]">
                        New balance: <span className="font-bold">${(balanceUser.balance + parseFloat(balanceAmount || '0')).toFixed(2)}</span>
                      </p>
                    )}
                    {balanceAction === 'subtract' && balanceAmount && (
                      <p className="text-[12px] text-[#EF4444]">
                        New balance: <span className="font-bold">${Math.max(0, balanceUser.balance - parseFloat(balanceAmount || '0')).toFixed(2)}</span>
                      </p>
                    )}
                    {balanceAction === 'set' && balanceAmount && (
                      <p className="text-[12px] text-[#F59E0B]">
                        New balance: <span className="font-bold">${parseFloat(balanceAmount || '0').toFixed(2)}</span>
                      </p>
                    )}
                  </div>

                  {/* Reason */}
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-[#36383A]">Reason <span className="text-[#999999] font-normal">(optional)</span></label>
                    <Input
                      value={balanceReason}
                      onChange={(e) => setBalanceReason(e.target.value)}
                      placeholder="e.g. Bonus reward, correction, refund..."
                      className="h-9 text-[13px] border-[#E2EAF1]"
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleBalanceAdjust}
                    disabled={!balanceAmount || parseFloat(balanceAmount) < 0 || isNaN(parseFloat(balanceAmount))}
                    className="w-full h-[44px] text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                  >
                    {balanceAction === 'add' && 'Add Balance'}
                    {balanceAction === 'subtract' && 'Subtract Balance'}
                    {balanceAction === 'set' && 'Set Balance'}
                  </Button>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}


