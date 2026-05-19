'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  Eye,
  Download,
  Trash2,
  Flag,
  UserCheck,
  RefreshCw,
  Mail,
  Globe,
  Smartphone,
  DollarSign,
  Plus,
  Minus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Users,
  ShieldAlert,
  Unlock,
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
  isUnderReview: boolean
  reviewReason: string | null
  emailVerified: boolean
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
  lastLoginIp: string | null
  loginCount: number
}

interface ActivityLogRecord {
  id: string
  action: string
  details: string
  ipAddress: string | null
  createdAt: string
}

interface UserIpRecord {
  id: string
  ipAddress: string
  country: string | null
  city: string | null
  isVpn: boolean
  lastSeen: string
}

interface UserDetail extends UserRecord {
  activityLogs: ActivityLogRecord[]
  ips: UserIpRecord[]
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [totalUsers, setTotalUsers] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [fraudFilter, setFraudFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [userDetail, setUserDetail] = useState<UserDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [balanceOpen, setBalanceOpen] = useState(false)
  const [balanceUser, setBalanceUser] = useState<UserRecord | null>(null)
  const [balanceAction, setBalanceAction] = useState<'add' | 'subtract' | 'set'>('add')
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceReason, setBalanceReason] = useState('')
  const [balanceSuccess, setBalanceSuccess] = useState(false)
  const [balanceSubmitting, setBalanceSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [reviewLoading, setReviewLoading] = useState<string | null>(null)
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce search input
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [search])

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', limit.toString())
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)

      // Map fraud filter to fraudMin/fraudMax
      if (fraudFilter === 'low') {
        params.set('fraudMin', '0')
        params.set('fraudMax', '29')
      } else if (fraudFilter === 'medium') {
        params.set('fraudMin', '30')
        params.set('fraudMax', '69')
      } else if (fraudFilter === 'high') {
        params.set('fraudMin', '70')
        params.set('fraudMax', '100')
      }

      const res = await fetch(`/api/admin/users?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
        setTotalUsers(data.total || 0)
      } else {
        console.error('Failed to fetch users')
        setUsers([])
        setTotalUsers(0)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
      setUsers([])
      setTotalUsers(0)
    } finally {
      setLoading(false)
    }
  }, [page, limit, debouncedSearch, roleFilter, statusFilter, fraudFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [roleFilter, statusFilter, fraudFilter])

  // Fetch user detail from API
  const fetchUserDetail = useCallback(async (userId: string) => {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (res.ok) {
        const data = await res.json()
        setUserDetail(data)
        setSelectedUser({
          id: data.id,
          userId: data.userId,
          email: data.email,
          name: data.name,
          role: data.role,
          balance: data.balance,
          totalEarned: data.totalEarned,
          surveysCompleted: data.surveysCompleted,
          fraudScore: data.fraudScore,
          isFlagged: data.isFlagged,
          isBanned: data.isBanned,
          isUnderReview: data.isUnderReview,
          reviewReason: data.reviewReason,
          emailVerified: data.emailVerified,
          isActive: data.isActive,
          createdAt: data.createdAt,
          lastLoginAt: data.lastLoginAt,
          lastLoginIp: data.lastLoginIp,
          loginCount: data.loginCount,
        })
      } else {
        console.error('Failed to fetch user detail')
      }
    } catch (err) {
      console.error('Failed to fetch user detail:', err)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const totalPages = Math.max(1, Math.ceil(totalUsers / limit))

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleAll = () => {
    if (selectedIds.size === users.length && users.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)))
    }
  }

  const handleBalanceAdjust = async () => {
    if (!balanceUser || !balanceAmount) return
    const amount = parseFloat(balanceAmount)
    if (isNaN(amount) || amount < 0) return

    setBalanceSubmitting(true)
    try {
      let newBalance = balanceUser.balance
      switch (balanceAction) {
        case 'add': newBalance = balanceUser.balance + amount; break
        case 'subtract': newBalance = Math.max(0, balanceUser.balance - amount); break
        case 'set': newBalance = amount; break
      }
      newBalance = Math.round(newBalance * 100) / 100

      const res = await fetch(`/api/admin/users/${balanceUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ balance: newBalance }),
      })

      if (res.ok) {
        setBalanceSuccess(true)
        setTimeout(() => {
          setBalanceSuccess(false)
          setBalanceOpen(false)
          setBalanceAmount('')
          setBalanceReason('')
        }, 1500)
        fetchUsers()
      } else {
        console.error('Failed to adjust balance')
      }
    } catch (err) {
      console.error('Failed to adjust balance:', err)
    } finally {
      setBalanceSubmitting(false)
    }
  }

  const openBalanceDialog = (user: UserRecord) => {
    setBalanceUser(user)
    setBalanceAction('add')
    setBalanceAmount('')
    setBalanceReason('')
    setBalanceSuccess(false)
    setBalanceOpen(true)
  }

  const handleAction = async (userId: string, action: string) => {
    setActionLoading(userId + '-' + action)
    try {
      let res: Response | null = null

      switch (action) {
        case 'ban':
          res = await fetch(`/api/admin/users/${userId}/ban`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: 'Violation of terms of service' }),
          })
          break
        case 'unban':
          res = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isBanned: false, isActive: true }),
          })
          break
        case 'verify':
          res = await fetch(`/api/admin/users/${userId}/verify`, {
            method: 'POST',
          })
          break
        case 'reset_fraud':
          res = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fraudScore: 0, isFlagged: false }),
          })
          break
        case 'flag':
          res = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isFlagged: true }),
          })
          break
        case 'unflag':
          res = await fetch(`/api/admin/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isFlagged: false }),
          })
          break
        case 'delete':
          res = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
          })
          break
        case 'review':
          res = await fetch('/api/admin/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, reason: 'manual_admin', adminId: localStorage.getItem('userId') || 'admin' }),
          })
          break
        case 'release_review':
          // Find the pending review for this user and release it
          const reviewsRes = await fetch(`/api/admin/reviews?status=pending&limit=50`)
          if (reviewsRes.ok) {
            const reviewsData = await reviewsRes.json()
            const pendingReview = reviewsData.reviews?.find((r: any) => r.userId === userId && r.status === 'pending')
            if (pendingReview) {
              res = await fetch('/api/admin/reviews', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reviewId: pendingReview.id, action: 'release', adminId: localStorage.getItem('userId') || 'admin', note: 'Released by admin from Users page' }),
              })
            } else {
              // No pending review found, just clear the flag
              res = await fetch(`/api/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isUnderReview: false, reviewReason: null }),
              })
            }
          } else {
            // Failed to fetch reviews, just clear the flag directly
            res = await fetch(`/api/admin/users/${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ isUnderReview: false, reviewReason: null }),
            })
          }
          break
        default:
          return
      }

      if (res && res.ok) {
        fetchUsers()
      } else if (res) {
        const data = await res.json().catch(() => ({}))
        console.error(`Action ${action} failed:`, data.error || 'Unknown error')
      }
    } catch (err) {
      console.error(`Action ${action} failed:`, err)
    } finally {
      setActionLoading(null)
    }
  }

  const openDetailDialog = (user: UserRecord) => {
    setSelectedUser(user)
    setDetailOpen(true)
    fetchUserDetail(user.id)
  }

  const getFraudBadge = (score: number) => {
    if (score >= 70) return <Badge className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2]">High ({Math.round(score)})</Badge>
    if (score >= 30) return <Badge className="bg-[#FFF7ED] text-[#F59E0B] hover:bg-[#FFF7ED]">Medium ({Math.round(score)})</Badge>
    return <Badge className="bg-[#ECFDF5] text-[#10B981] hover:bg-[#ECFDF5]">Low ({Math.round(score)})</Badge>
  }

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const actionLabelMap: Record<string, string> = {
    login: 'Login',
    survey_start: 'Survey started',
    survey_complete: 'Survey completed',
    cashout_request: 'Cashout requested',
    password_change: 'Password changed',
    email_change: 'Email changed',
    profile_update: 'Profile updated',
  }

  const parseDetails = (detailsStr: string): string => {
    try {
      const parsed = JSON.parse(detailsStr)
      if (typeof parsed === 'string') return parsed
      return Object.values(parsed).join(', ')
    } catch {
      return detailsStr
    }
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
                <SelectItem value="under_review">Under Review</SelectItem>
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
                      checked={selectedIds.size === users.length && users.length > 0}
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
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <div className="flex items-center justify-center gap-2 text-[#999999]">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="text-[13px]">Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12">
                      <p className="text-[13px] text-[#999999]">No users found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {user.isUnderReview && <Badge className="bg-[#EDE9FE] text-[#7C3AED] hover:bg-[#EDE9FE]">Under Review</Badge>}
                          {user.isBanned && <Badge className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2]">Banned</Badge>}
                          {user.isFlagged && !user.isBanned && !user.isUnderReview && <Badge className="bg-[#FFF7ED] text-[#F59E0B] hover:bg-[#FFF7ED]">Flagged</Badge>}
                          {!user.isBanned && !user.isFlagged && !user.isUnderReview && user.isActive && (
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
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!!actionLoading}>
                              {actionLoading && actionLoading.startsWith(user.id) ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <MoreHorizontal size={16} />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailDialog(user)}>
                              <Eye size={14} className="mr-2" /> View Details
                            </DropdownMenuItem>
                            {user.isUnderReview ? (
                              <DropdownMenuItem onClick={() => handleAction(user.id, 'release_review')}>
                                <Unlock size={14} className="mr-2" /> Release from Review
                              </DropdownMenuItem>
                            ) : !user.isBanned && (
                              <DropdownMenuItem onClick={() => handleAction(user.id, 'review')}>
                                <ShieldAlert size={14} className="mr-2" /> Put Under Review
                              </DropdownMenuItem>
                            )}
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between p-4 border-t border-[#E5E7EB]">
            <p className="text-[12px] text-[#999999]">
              Showing {users.length} of {totalUsers} users
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-[12px] text-[#666666] min-w-[80px] text-center">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
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

              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-[#2DD9B6]" />
                  <span className="ml-2 text-[13px] text-[#999999]">Loading details...</span>
                </div>
              ) : (
                <>
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
                      {userDetail && userDetail.activityLogs && userDetail.activityLogs.length > 0 ? (
                        userDetail.activityLogs.map((log) => (
                          <div key={log.id} className="flex items-center gap-3 p-2 rounded-[6px] hover:bg-[#F8FAFB] text-[13px]">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#2DD9B6]" />
                            <span className="font-medium text-[#1A1A1A]">{actionLabelMap[log.action] || log.action}</span>
                            <span className="text-[#999999]">— {parseDetails(log.details)}</span>
                            <span className="ml-auto text-[11px] text-[#999999]">{formatTimeAgo(log.createdAt)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[12px] text-[#999999] py-2">No activity logs found</p>
                      )}
                    </div>
                  </div>

                  {/* IP History */}
                  <div>
                    <h4 className="text-[14px] font-bold text-[#1A1A1A] mb-2">IP History</h4>
                    <div className="space-y-1.5">
                      {userDetail && userDetail.ips && userDetail.ips.length > 0 ? (
                        userDetail.ips.map((ip) => (
                          <div key={ip.id} className="flex items-center gap-2 text-[12px] p-2 rounded-[6px] hover:bg-[#F8FAFB]">
                            <Globe size={14} className="text-[#999999]" />
                            <span className="font-mono text-[#1A1A1A]">{ip.ipAddress}</span>
                            <span className="text-[#999999]">{ip.city || 'Unknown'}, {ip.country || '??'}</span>
                            {ip.isVpn && <Badge className="bg-[#FEF2F2] text-[#EF4444] text-[10px]">VPN</Badge>}
                          </div>
                        ))
                      ) : (
                        <p className="text-[12px] text-[#999999] py-2">No IP history found</p>
                      )}
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
                  <p className="text-[13px] text-[#999999]">{balanceUser.name || balanceUser.email}&apos;s balance has been adjusted.</p>
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
                        New balance: <span className="font-bold">${(balanceUser.balance + (parseFloat(balanceAmount) || 0)).toFixed(2)}</span>
                      </p>
                    )}
                    {balanceAction === 'subtract' && balanceAmount && (
                      <p className="text-[12px] text-[#EF4444]">
                        New balance: <span className="font-bold">${Math.max(0, balanceUser.balance - (parseFloat(balanceAmount) || 0)).toFixed(2)}</span>
                      </p>
                    )}
                    {balanceAction === 'set' && balanceAmount && (
                      <p className="text-[12px] text-[#F59E0B]">
                        New balance: <span className="font-bold">${(parseFloat(balanceAmount) || 0).toFixed(2)}</span>
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
                    disabled={!balanceAmount || parseFloat(balanceAmount) < 0 || isNaN(parseFloat(balanceAmount)) || balanceSubmitting}
                    className="w-full h-[44px] text-white disabled:opacity-50"
                    style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                  >
                    {balanceSubmitting ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" /> Processing...</>
                    ) : (
                      <>
                        {balanceAction === 'add' && 'Add Balance'}
                        {balanceAction === 'subtract' && 'Subtract Balance'}
                        {balanceAction === 'set' && 'Set Balance'}
                      </>
                    )}
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
