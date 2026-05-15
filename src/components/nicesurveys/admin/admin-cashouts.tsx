'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Wallet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  Search,
  Filter,
  Flag,
  CreditCard,
  Banknote,
  RotateCcw,
  ArrowDownRight,
  TrendingDown,
  AlertCircle,
  ShieldAlert,
  Eye,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Copy,
  Check,
} from 'lucide-react'

// Copyable payment detail component - shows address with copy button
function CopyableDetail({ value, type }: { value: string; type: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const getLabel = () => {
    switch (type?.toLowerCase()) {
      case 'binance': return 'Binance ID'
      case 'litecoin': return 'LTC Addr'
      case 'paypal': return 'PayPal'
      default: return 'Detail'
    }
  }

  const getLabelColor = () => {
    switch (type?.toLowerCase()) {
      case 'binance': return '#F0B90B'
      case 'litecoin': return '#345D9D'
      case 'paypal': return '#003087'
      default: return '#555555'
    }
  }

  return (
    <div className="flex items-center gap-1.5 max-w-[180px]">
      <span
        className="text-[9px] font-bold px-1 py-0.5 rounded flex-shrink-0"
        style={{ background: `${getLabelColor()}15`, color: getLabelColor() }}
      >
        {getLabel()}
      </span>
      <span className="font-mono text-[11px] text-[#1A1A1A] truncate" title={value}>
        {value.length > 16 ? value.substring(0, 8) + '...' + value.substring(value.length - 6) : value}
      </span>
      <button
        onClick={handleCopy}
        className="flex-shrink-0 p-0.5 rounded hover:bg-[#F0F2F5] transition-colors"
        title="Copy to clipboard"
      >
        {copied ? (
          <Check size={10} className="text-[#10B981]" />
        ) : (
          <Copy size={10} className="text-[#999999]" />
        )}
      </button>
    </div>
  )
}

interface CashoutRecord {
  id: string
  userId: string
  userEmail: string
  giftCardType: string
  amount: number
  paymentDetail: string | null
  status: string
  isFlagged: boolean
  flagReason: string | null
  ipAddress: string | null
  isChargeback: boolean
  chargebackReason: string | null
  chargebackAmount: number | null
  chargebackBy: string | null
  chargebackAt: string | null
  balanceDeducted: boolean
  createdAt: string
  reviewedAt: string | null
}

export function AdminCashouts() {
  const [cashouts, setCashouts] = useState<CashoutRecord[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Loading & pagination state
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 20

  // Chargeback dialog state
  const [chargebackOpen, setChargebackOpen] = useState(false)
  const [chargebackCashout, setChargebackCashout] = useState<CashoutRecord | null>(null)
  const [chargebackReason, setChargebackReason] = useState('')
  const [chargebackCustomReason, setChargebackCustomReason] = useState('')
  const [deductBalance, setDeductBalance] = useState(true)
  const [chargebackSuccess, setChargebackSuccess] = useState(false)

  // Chargeback detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailCashout, setDetailCashout] = useState<CashoutRecord | null>(null)

  const fetchCashouts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (methodFilter && methodFilter !== 'all') params.set('giftCardType', methodFilter)

      const res = await fetch(`/api/admin/cashouts?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch cashouts')
      const data = await res.json()

      const mapped: CashoutRecord[] = (data.cashouts || []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        userId: (c.userId as string) || (c.user && (c.user as Record<string, unknown>).id as string) || '',
        userEmail: (c.user && (c.user as Record<string, unknown>).email as string) || (c.userEmail as string) || '',
        giftCardType: (c.giftCardType as string) || '',
        amount: typeof c.amount === 'number' ? c.amount : parseFloat(String(c.amount || 0)),
        paymentDetail: (c.paymentDetail as string | null) ?? null,
        status: (c.status as string) || '',
        isFlagged: Boolean(c.isFlagged),
        flagReason: (c.flagReason as string | null) ?? null,
        ipAddress: (c.ipAddress as string | null) ?? null,
        isChargeback: Boolean(c.isChargeback),
        chargebackReason: (c.chargebackReason as string | null) ?? null,
        chargebackAmount: c.chargebackAmount != null ? (typeof c.chargebackAmount === 'number' ? c.chargebackAmount : parseFloat(String(c.chargebackAmount))) : null,
        chargebackBy: (c.chargebackBy as string | null) ?? null,
        chargebackAt: (c.chargebackAt as string | null) ?? null,
        balanceDeducted: Boolean(c.balanceDeducted),
        createdAt: c.createdAt ? new Date(c.createdAt as string).toISOString() : new Date().toISOString(),
        reviewedAt: (c.reviewedAt as string | null) ?? null,
      }))

      setCashouts(mapped)
      setTotal(data.total || 0)
      setTotalPages(Math.ceil((data.total || 0) / limit))
    } catch (err) {
      console.error('Failed to fetch cashouts:', err)
      setCashouts([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, methodFilter])

  useEffect(() => {
    fetchCashouts()
  }, [fetchCashouts])

  // Client-side search filter on top of server-side filters
  const filtered = cashouts.filter((c) => {
    if (search && !c.userEmail.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleAll = () => {
    if (selectedIds.size === filtered.filter((c) => c.status === 'pending').length && filtered.filter((c) => c.status === 'pending').length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.filter((c) => c.status === 'pending').map((c) => c.id)))
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    setActionLoading(id)
    try {
      const body: Record<string, unknown> = { status: newStatus, reviewedBy: 'admin' }
      if (newStatus === 'flagged') {
        body.isFlagged = true
        body.flagReason = 'Flagged by admin'
      }
      const res = await fetch(`/api/admin/cashouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Failed to update cashout status')
      await fetchCashouts()
    } catch (err) {
      console.error('Failed to update cashout status:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const bulkApprove = async () => {
    const idsToApprove = Array.from(selectedIds).filter((id) =>
      cashouts.find((c) => c.id === id && c.status === 'pending')
    )
    if (idsToApprove.length === 0) return

    setActionLoading('bulk')
    try {
      await Promise.all(
        idsToApprove.map((id) =>
          fetch(`/api/admin/cashouts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved', reviewedBy: 'admin' }),
          })
        )
      )
      setSelectedIds(new Set())
      await fetchCashouts()
    } catch (err) {
      console.error('Failed to bulk approve:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const openChargebackDialog = (cashout: CashoutRecord) => {
    setChargebackCashout(cashout)
    setChargebackReason('')
    setChargebackCustomReason('')
    setDeductBalance(true)
    setChargebackSuccess(false)
    setChargebackOpen(true)
  }

  const handleChargeback = async () => {
    if (!chargebackCashout || (!chargebackReason && !chargebackCustomReason)) return

    const finalReason = chargebackReason === 'other' ? chargebackCustomReason : chargebackReason

    setActionLoading(chargebackCashout.id)
    try {
      const res = await fetch(`/api/admin/cashouts/${chargebackCashout.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'chargeback',
          chargebackReason: finalReason,
          chargebackBy: 'admin',
          deductBalance,
        }),
      })
      if (!res.ok) throw new Error('Failed to process chargeback')

      setChargebackSuccess(true)
      await fetchCashouts()
      setTimeout(() => {
        setChargebackOpen(false)
        setChargebackSuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Failed to process chargeback:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-[#FFF7ED] text-[#F59E0B] hover:bg-[#FFF7ED]"><Clock size={10} className="mr-1" />Pending</Badge>
      case 'approved': return <Badge className="bg-[#ECFDF5] text-[#10B981] hover:bg-[#ECFDF5]"><CheckCircle size={10} className="mr-1" />Approved</Badge>
      case 'processed': return <Badge className="bg-[#E0F7FA] text-[#22B9CF] hover:bg-[#E0F7FA]">Processed</Badge>
      case 'rejected': return <Badge className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2]"><XCircle size={10} className="mr-1" />Rejected</Badge>
      case 'flagged': return <Badge className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2]"><AlertTriangle size={10} className="mr-1" />Flagged</Badge>
      case 'chargeback': return <Badge className="bg-[#7C3AED] text-white hover:bg-[#7C3AED]"><RotateCcw size={10} className="mr-1" />Chargeback</Badge>
      default: return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'PayPal': return <CreditCard size={14} className="text-[#003087]" />
      case 'Amazon': return <DollarSign size={14} className="text-[#FF9900]" />
      case 'Binance': return <CreditCard size={14} className="text-[#F0B90B]" />
      case 'Litecoin': return <CreditCard size={14} className="text-[#345D9D]" />
      default: return <Banknote size={14} className="text-[#555555]" />
    }
  }

  const pendingCount = cashouts.filter((c) => c.status === 'pending').length
  const flaggedCount = cashouts.filter((c) => c.isFlagged && c.status !== 'chargeback').length
  const pendingTotal = cashouts.filter((c) => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)
  const chargebackCount = cashouts.filter((c) => c.isChargeback).length
  const chargebackTotal = cashouts.filter((c) => c.isChargeback).reduce((sum, c) => sum + (c.chargebackAmount || c.amount), 0)
  const totalProcessed = cashouts.filter((c) => c.status === 'processed').length
  const chargebackRate = totalProcessed > 0 ? ((chargebackCount / (totalProcessed + chargebackCount)) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-[#E5E7EB] shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-[44px] h-[44px] rounded-[10px] bg-[#FFF7ED] flex items-center justify-center">
              <Clock size={20} className="text-[#F59E0B]" />
            </div>
            <div>
              <p className="text-[12px] text-[#999999]">Pending Cashouts</p>
              <p className="text-[22px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>{pendingCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB] shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-[44px] h-[44px] rounded-[10px] bg-[#ECFDF5] flex items-center justify-center">
              <DollarSign size={20} className="text-[#10B981]" />
            </div>
            <div>
              <p className="text-[12px] text-[#999999]">Pending Total</p>
              <p className="text-[22px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>${pendingTotal.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB] shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-[44px] h-[44px] rounded-[10px] bg-[#F5F3FF] flex items-center justify-center">
              <RotateCcw size={20} className="text-[#7C3AED]" />
            </div>
            <div>
              <p className="text-[12px] text-[#999999]">Chargebacks</p>
              <p className="text-[22px] font-bold text-[#7C3AED]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>{chargebackCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#E5E7EB] shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-[44px] h-[44px] rounded-[10px] bg-[#FEF2F2] flex items-center justify-center">
              <TrendingDown size={20} className="text-[#EF4444]" />
            </div>
            <div>
              <p className="text-[12px] text-[#999999]">Chargeback Rate</p>
              <p className="text-[22px] font-bold text-[#EF4444]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>{chargebackRate}%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chargeback Alert Banner */}
      {chargebackCount > 0 && (
        <Card className="border-[#7C3AED]/30 bg-[#F5F3FF] shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-[40px] h-[40px] rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0">
                <AlertCircle size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-[14px] font-bold text-[#7C3AED]">Chargeback Alert</h3>
                <p className="text-[12px] text-[#555555]">
                  {chargebackCount} chargeback{chargebackCount > 1 ? 's' : ''} detected totaling ${chargebackTotal.toFixed(2)}.
                  {chargebackRate > '5' && ' Chargeback rate is above 5% - review your fraud prevention settings.'}
                </p>
              </div>
              <Button size="sm" variant="outline" className="text-[12px] border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white">
                View Chargebacks
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending">
        <TabsList className="bg-white border border-[#E5E7EB]">
          <TabsTrigger value="pending" className="text-[13px]">
            <Clock size={14} className="mr-1" /> Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="flagged" className="text-[13px]">
            <AlertTriangle size={14} className="mr-1" /> Flagged ({flaggedCount})
          </TabsTrigger>
          <TabsTrigger value="chargebacks" className="text-[13px]">
            <RotateCcw size={14} className="mr-1" /> Chargebacks ({chargebackCount})
          </TabsTrigger>
          <TabsTrigger value="history" className="text-[13px]">
            <Wallet size={14} className="mr-1" /> All History
          </TabsTrigger>
        </TabsList>

        {['pending', 'flagged', 'chargebacks', 'history'].map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            {/* Filters */}
            <Card className="border-[#E5E7EB] shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
                    <Input
                      placeholder="Search by email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9 text-[13px] border-[#E5E7EB]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1) }}>
                    <SelectTrigger className="w-[140px] h-9 text-[13px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="flagged">Flagged</SelectItem>
                      <SelectItem value="chargeback">Chargeback</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={methodFilter} onValueChange={(val) => { setMethodFilter(val); setPage(1) }}>
                    <SelectTrigger className="w-[130px] h-9 text-[13px]"><SelectValue placeholder="Method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Methods</SelectItem>
                      <SelectItem value="PayPal">PayPal</SelectItem>
                      <SelectItem value="Amazon">Amazon</SelectItem>
                      <SelectItem value="Binance">Binance</SelectItem>
                      <SelectItem value="Litecoin">Litecoin</SelectItem>
                    </SelectContent>
                  </Select>
                  {tab === 'pending' && selectedIds.size > 0 && (
                    <Button size="sm" className="text-[12px] text-white bg-[#10B981] hover:bg-[#059669]" onClick={bulkApprove} disabled={actionLoading === 'bulk'}>
                      {actionLoading === 'bulk' ? <Loader2 size={14} className="mr-1 animate-spin" /> : <CheckCircle size={14} className="mr-1" />}
                      Approve {selectedIds.size} Selected
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chargeback-specific detail view */}
            {tab === 'chargebacks' && (
              <Card className="border-[#E5E7EB] shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[16px] font-bold text-[#7C3AED]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                    <div className="flex items-center gap-2">
                      <RotateCcw size={18} />
                      Chargeback Summary
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="p-3 bg-[#F5F3FF] rounded-[8px] text-center">
                      <p className="text-[20px] font-bold text-[#7C3AED]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>${chargebackTotal.toFixed(2)}</p>
                      <p className="text-[11px] text-[#555555]">Total Chargeback Amount</p>
                    </div>
                    <div className="p-3 bg-[#FEF2F2] rounded-[8px] text-center">
                      <p className="text-[20px] font-bold text-[#EF4444]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                        {cashouts.filter((c) => c.isChargeback && c.balanceDeducted).length}
                      </p>
                      <p className="text-[11px] text-[#555555]">Balance Deducted</p>
                    </div>
                    <div className="p-3 bg-[#FFF7ED] rounded-[8px] text-center">
                      <p className="text-[20px] font-bold text-[#F59E0B]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                        {cashouts.filter((c) => c.isChargeback && !c.balanceDeducted).length}
                      </p>
                      <p className="text-[11px] text-[#555555]">Pending Deduction</p>
                    </div>
                  </div>
                  <div className="p-3 bg-[#FAFAFA] rounded-[8px] border border-[#E5E7EB]">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[13px] font-medium text-[#1A1A1A]">How to manage chargebacks:</p>
                        <ul className="text-[12px] text-[#555555] mt-1 space-y-1 list-disc list-inside">
                          <li>When a payment provider reverses a transaction, mark it as a chargeback</li>
                          <li>Choose whether to deduct the amount from the user balance</li>
                          <li>Users with repeated chargebacks will be automatically flagged</li>
                          <li>Monitor the chargeback rate - if it exceeds 5%, review your fraud settings</li>
                          <li>Click on any processed/approved cashout to mark it as chargeback</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cashouts Table */}
            <Card className="border-[#E5E7EB] shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#E5E7EB]">
                        {tab === 'pending' && (
                          <TableHead className="w-[40px]">
                            <input type="checkbox" checked={selectedIds.size === filtered.filter((c) => c.status === 'pending').length && filtered.filter((c) => c.status === 'pending').length > 0} onChange={toggleAll} className="w-4 h-4 rounded accent-[#2DD9B6]" />
                          </TableHead>
                        )}
                        <TableHead className="text-[12px] text-[#999999]">User</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">Method</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">Amount</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">Send To</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">Status</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">Flag</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">IP</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">Date</TableHead>
                        <TableHead className="w-[120px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={tab === 'pending' ? 10 : 9} className="text-center py-12">
                            <Loader2 size={24} className="animate-spin mx-auto text-[#999999]" />
                            <p className="text-[13px] text-[#999999] mt-2">Loading cashouts...</p>
                          </TableCell>
                        </TableRow>
                      ) : filtered
                        .filter((c) => {
                          if (tab === 'pending') return c.status === 'pending'
                          if (tab === 'flagged') return c.isFlagged && c.status !== 'chargeback'
                          if (tab === 'chargebacks') return c.isChargeback
                          return true
                        })
                        .length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={tab === 'pending' ? 10 : 9} className="text-center py-12">
                            <p className="text-[13px] text-[#999999]">No cashouts found</p>
                          </TableCell>
                        </TableRow>
                      ) : filtered
                        .filter((c) => {
                          if (tab === 'pending') return c.status === 'pending'
                          if (tab === 'flagged') return c.isFlagged && c.status !== 'chargeback'
                          if (tab === 'chargebacks') return c.isChargeback
                          return true
                        })
                        .map((cashout) => (
                        <TableRow key={cashout.id} className={`border-b border-[#F0F2F5] hover:bg-[#FAFAFA] ${cashout.isChargeback ? 'bg-[#F5F3FF]/50' : ''}`}>
                          {tab === 'pending' && (
                            <TableCell>
                              <input type="checkbox" checked={selectedIds.has(cashout.id)} onChange={() => toggleSelect(cashout.id)} className="w-4 h-4 rounded accent-[#2DD9B6]" />
                            </TableCell>
                          )}
                          <TableCell className="text-[13px] font-medium text-[#1A1A1A]">{cashout.userEmail}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-[12px]">
                              {getMethodIcon(cashout.giftCardType)}
                              {cashout.giftCardType}
                            </div>
                          </TableCell>
                          <TableCell className="text-[14px] font-bold text-[#1A1A1A]">${cashout.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-[11px]">
                            {cashout.paymentDetail ? (
                              <div className="flex items-center gap-1">
                                <CopyableDetail value={cashout.paymentDetail} type={cashout.giftCardType} />
                              </div>
                            ) : (
                              <span className="text-[#999999]">—</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(cashout.status)}</TableCell>
                          <TableCell>
                            {cashout.isChargeback ? (
                              <Badge className="bg-[#F5F3FF] text-[#7C3AED] hover:bg-[#F5F3FF]">
                                <RotateCcw size={10} className="mr-1" />{cashout.chargebackReason ? cashout.chargebackReason.substring(0, 25) + (cashout.chargebackReason.length > 25 ? '...' : '') : 'Chargeback'}
                              </Badge>
                            ) : cashout.isFlagged ? (
                              <Badge className="bg-[#FEF2F2] text-[#EF4444]"><Flag size={10} className="mr-1" />{cashout.flagReason || 'Flagged'}</Badge>
                            ) : (
                              <span className="text-[11px] text-[#999999]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-[11px] font-mono text-[#999999]">{cashout.ipAddress || '—'}</TableCell>
                          <TableCell className="text-[11px] text-[#999999]">{new Date(cashout.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {actionLoading === cashout.id ? (
                                <Loader2 size={14} className="animate-spin text-[#999999]" />
                              ) : (
                                <>
                                  {cashout.status === 'pending' && (
                                    <>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[#10B981]" onClick={() => updateStatus(cashout.id, 'approved')}>
                                        <CheckCircle size={14} />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[#EF4444]" onClick={() => updateStatus(cashout.id, 'rejected')}>
                                        <XCircle size={14} />
                                      </Button>
                                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[#F59E0B]" onClick={() => updateStatus(cashout.id, 'flagged')}>
                                        <Flag size={14} />
                                      </Button>
                                    </>
                                  )}
                                  {(cashout.status === 'approved' || cashout.status === 'processed') && !cashout.isChargeback && (
                                    <>
                                      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => updateStatus(cashout.id, 'processed')}>
                                        Process
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-[#7C3AED]"
                                        title="Mark as Chargeback"
                                        onClick={() => openChargebackDialog(cashout)}
                                      >
                                        <RotateCcw size={14} />
                                      </Button>
                                    </>
                                  )}
                                  {cashout.isChargeback && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[11px] border-[#7C3AED] text-[#7C3AED]"
                                      onClick={() => { setDetailCashout(cashout); setDetailOpen(true) }}
                                    >
                                      <Eye size={12} className="mr-1" /> Details
                                    </Button>
                                  )}
                                  {cashout.status === 'flagged' && (
                                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => updateStatus(cashout.id, 'processed')}>
                                      Process
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB]">
                    <p className="text-[12px] text-[#999999]">
                      Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft size={14} />
                      </Button>
                      <span className="text-[12px] text-[#555555]">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Chargeback Dialog */}
      <Dialog open={chargebackOpen} onOpenChange={setChargebackOpen}>
        <DialogContent className="max-w-[480px]">
          {chargebackCashout && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[18px] font-bold text-[#7C3AED]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                  <div className="flex items-center gap-2">
                    <RotateCcw size={20} />
                    Mark as Chargeback
                  </div>
                </DialogTitle>
              </DialogHeader>

              {chargebackSuccess ? (
                <div className="text-center py-6">
                  <div
                    className="w-[56px] h-[56px] rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: '#7C3AED' }}
                  >
                    <RotateCcw size={28} className="text-white" />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#1A1A1A] mb-1">Chargeback Recorded!</h3>
                  <p className="text-[13px] text-[#999999]">
                    The cashout has been marked as chargeback.
                    {deductBalance && ' User balance has been deducted.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Cashout Info */}
                  <div className="flex items-center gap-3 p-3 bg-[#F5F3FF] rounded-[10px] border border-[#7C3AED]/20">
                    <div className="w-[40px] h-[40px] rounded-full bg-[#7C3AED] flex items-center justify-center flex-shrink-0">
                      <RotateCcw size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[14px] font-semibold text-[#1A1A1A]">{chargebackCashout.userEmail}</p>
                      <p className="text-[12px] text-[#555555]">
                        {chargebackCashout.giftCardType} · {new Date(chargebackCashout.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[18px] font-bold text-[#EF4444]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                        -${chargebackCashout.amount.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-[#999999]">Original Amount</p>
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="p-3 bg-[#FEF2F2] rounded-[8px] border border-[#EF4444]/20">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-[#EF4444] mt-0.5 flex-shrink-0" />
                      <p className="text-[12px] text-[#555555]">
                        This action marks the cashout as a chargeback. The user&apos;s payment was reversed by the payment provider.
                        {deductBalance && ' The chargeback amount will be deducted from the user\'s balance.'}
                      </p>
                    </div>
                  </div>

                  {/* Chargeback Reason */}
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-[#36383A]">Chargeback Reason <span className="text-[#EF4444]">*</span></label>
                    <Select value={chargebackReason} onValueChange={setChargebackReason}>
                      <SelectTrigger className="h-9 text-[13px] border-[#E2EAF1]">
                        <SelectValue placeholder="Select a reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="payment_reversed">Payment Reversed by Provider</SelectItem>
                        <SelectItem value="buyer_dispute">Buyer Dispute / User Complaint</SelectItem>
                        <SelectItem value="fraudulent_transaction">Fraudulent Transaction</SelectItem>
                        <SelectItem value="unauthorized_payment">Unauthorized Payment</SelectItem>
                        <SelectItem value="duplicate_payment">Duplicate Payment</SelectItem>
                        <SelectItem value="service_not_received">Service Not Received</SelectItem>
                        <SelectItem value="other">Other (specify below)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Custom Reason */}
                  {chargebackReason === 'other' && (
                    <div className="space-y-2">
                      <label className="text-[13px] font-medium text-[#36383A]">Custom Reason <span className="text-[#EF4444]">*</span></label>
                      <Input
                        value={chargebackCustomReason}
                        onChange={(e) => setChargebackCustomReason(e.target.value)}
                        placeholder="Describe the chargeback reason..."
                        className="h-9 text-[13px] border-[#E2EAF1]"
                      />
                    </div>
                  )}

                  {/* Deduct Balance Option */}
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-[#36383A]">Balance Action</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setDeductBalance(true)}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-[8px] text-[13px] font-medium transition-all border"
                        style={{
                          background: deductBalance ? '#EF4444' : '#FFFFFF',
                          color: deductBalance ? '#FFFFFF' : '#4B4B4B',
                          borderColor: deductBalance ? 'transparent' : '#E2EAF1',
                        }}
                      >
                        <ArrowDownRight size={14} /> Deduct from Balance
                      </button>
                      <button
                        onClick={() => setDeductBalance(false)}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-[8px] text-[13px] font-medium transition-all border"
                        style={{
                          background: !deductBalance ? '#22B9CF' : '#FFFFFF',
                          color: !deductBalance ? '#FFFFFF' : '#4B4B4B',
                          borderColor: !deductBalance ? 'transparent' : '#E2EAF1',
                        }}
                      >
                        <AlertCircle size={14} /> Don&apos;t Deduct
                      </button>
                    </div>
                    {deductBalance && (
                      <p className="text-[12px] text-[#EF4444]">
                        ${chargebackCashout.amount.toFixed(2)} will be deducted from the user&apos;s balance
                      </p>
                    )}
                    {!deductBalance && (
                      <p className="text-[12px] text-[#22B9CF]">
                        User balance will remain unchanged - record only
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleChargeback}
                    disabled={!chargebackReason || (chargebackReason === 'other' && !chargebackCustomReason) || actionLoading === chargebackCashout.id}
                    className="w-full h-[44px] text-white disabled:opacity-50"
                    style={{ background: '#7C3AED' }}
                  >
                    {actionLoading === chargebackCashout.id ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <RotateCcw size={16} className="mr-2" />
                    )}
                    Confirm Chargeback
                  </Button>
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Chargeback Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[520px]">
          {detailCashout && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[18px] font-bold text-[#7C3AED]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                  <div className="flex items-center gap-2">
                    <RotateCcw size={20} />
                    Chargeback Details
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* User & Amount */}
              <div className="flex items-center gap-3 p-4 bg-[#F5F3FF] rounded-[10px]">
                <div className="w-[48px] h-[48px] rounded-full bg-[#7C3AED] flex items-center justify-center">
                  <RotateCcw size={22} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-[16px] font-bold text-[#1A1A1A]">{detailCashout.userEmail}</h3>
                  <p className="text-[12px] text-[#555555]">{detailCashout.giftCardType} Cashout</p>
                </div>
                <div className="text-right">
                  <p className="text-[24px] font-bold text-[#EF4444]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                    -${detailCashout.chargebackAmount?.toFixed(2) || detailCashout.amount.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-[#999999]">Chargeback Amount</p>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[#FAFAFA] rounded-[8px]">
                  <p className="text-[11px] text-[#999999]">Original Amount</p>
                  <p className="text-[14px] font-bold text-[#1A1A1A]">${detailCashout.amount.toFixed(2)}</p>
                </div>
                <div className="p-3 bg-[#FAFAFA] rounded-[8px]">
                  <p className="text-[11px] text-[#999999]">Cashout Method</p>
                  <p className="text-[14px] font-bold text-[#1A1A1A]">{detailCashout.giftCardType}</p>
                </div>
                <div className="p-3 bg-[#FAFAFA] rounded-[8px]">
                  <p className="text-[11px] text-[#999999]">Original Date</p>
                  <p className="text-[14px] font-bold text-[#1A1A1A]">{new Date(detailCashout.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="p-3 bg-[#FAFAFA] rounded-[8px]">
                  <p className="text-[11px] text-[#999999]">Chargeback Date</p>
                  <p className="text-[14px] font-bold text-[#1A1A1A]">
                    {detailCashout.chargebackAt ? new Date(detailCashout.chargebackAt).toLocaleDateString() : '—'}
                  </p>
                </div>
              </div>

              {/* Reason */}
              <div className="p-3 bg-[#FEF2F2] rounded-[8px] border border-[#EF4444]/20">
                <p className="text-[11px] text-[#999999] mb-1">Chargeback Reason</p>
                <p className="text-[13px] font-medium text-[#1A1A1A]">{detailCashout.chargebackReason || 'No reason provided'}</p>
              </div>

              {/* Balance Deduction Status */}
              <div className="p-3 rounded-[8px] border" style={{
                background: detailCashout.balanceDeducted ? '#ECFDF5' : '#FFF7ED',
                borderColor: detailCashout.balanceDeducted ? '#10B981/30' : '#F59E0B/30',
              }}>
                <div className="flex items-center gap-2">
                  {detailCashout.balanceDeducted ? (
                    <CheckCircle size={16} className="text-[#10B981]" />
                  ) : (
                    <AlertCircle size={16} className="text-[#F59E0B]" />
                  )}
                  <div>
                    <p className="text-[13px] font-medium text-[#1A1A1A]">
                      {detailCashout.balanceDeducted ? 'Balance Deducted' : 'Balance Not Deducted'}
                    </p>
                    <p className="text-[11px] text-[#555555]">
                      {detailCashout.balanceDeducted
                        ? `$${detailCashout.chargebackAmount?.toFixed(2) || detailCashout.amount.toFixed(2)} has been deducted from user's balance`
                        : 'The chargeback was recorded but user balance was not affected'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin & IP Info */}
              <div className="flex items-center justify-between text-[12px] text-[#999999] pt-2 border-t border-[#E5E7EB]">
                <div className="flex items-center gap-1">
                  <ShieldAlert size={12} />
                  <span>Processed by: {detailCashout.chargebackBy || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>IP: {detailCashout.ipAddress || '—'}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
