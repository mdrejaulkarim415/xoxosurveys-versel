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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShieldAlert,
  AlertTriangle,
  Ban,
  CheckCircle,
  XCircle,
  Eye,
  Plus,
  Trash2,
  Globe,
  Smartphone,
  Activity,
  UserX,
  Clock,
  Loader2,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface FraudEvent {
  id: string
  userId: string | null
  userEmail: string
  eventType: string
  severity: string
  details: string
  ipAddress: string | null
  deviceFingerprint: string | null
  country: string | null
  isResolved: boolean
  createdAt: string
}

interface BlockedIp {
  id: string
  ipAddress: string
  reason: string
  isAutoBlocked: boolean
  createdAt: string
}

interface BlockedDevice {
  id: string
  fingerprint: string
  reason: string
  isAutoBlocked: boolean
  createdAt: string
}

interface SuspiciousUser {
  email: string
  fraudScore: number
  events: number
  isBanned: boolean
}

export function AdminFraud() {
  const [events, setEvents] = useState<FraudEvent[]>([])
  const [eventsTotal, setEventsTotal] = useState(0)
  const [eventsPage, setEventsPage] = useState(1)
  const [eventsLimit] = useState(20)
  const [blockedIps, setBlockedIps] = useState<BlockedIp[]>([])
  const [blockedDevices, setBlockedDevices] = useState<BlockedDevice[]>([])
  const [suspiciousUsers, setSuspiciousUsers] = useState<SuspiciousUser[]>([])
  const [fraudScoreDistribution, setFraudScoreDistribution] = useState<{ range: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [resolvedFilter, setResolvedFilter] = useState('unresolved')
  const [detailEvent, setDetailEvent] = useState<FraudEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [newIp, setNewIp] = useState('')
  const [newIpReason, setNewIpReason] = useState('')
  const [newDevice, setNewDevice] = useState('')
  const [newDeviceReason, setNewDeviceReason] = useState('')
  const [ipSearch, setIpSearch] = useState('')
  const [deviceSearch, setDeviceSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      params.set('page', String(eventsPage))
      params.set('limit', String(eventsLimit))
      if (severityFilter && severityFilter !== 'all') params.set('severity', severityFilter)
      if (typeFilter && typeFilter !== 'all') params.set('eventType', typeFilter)
      if (resolvedFilter === 'unresolved') params.set('resolved', 'false')
      else if (resolvedFilter === 'resolved') params.set('resolved', 'true')

      const res = await fetch(`/api/admin/fraud/events?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const mappedEvents: FraudEvent[] = (data.events || []).map((e: Record<string, unknown>) => ({
          id: e.id as string,
          userId: (e.userId as string) || null,
          userEmail: (e.user as Record<string, string>)?.email || 'Unknown',
          eventType: e.eventType as string,
          severity: e.severity as string,
          details: typeof e.details === 'string' ? e.details : JSON.stringify(e.details || {}),
          ipAddress: (e.ipAddress as string) || null,
          deviceFingerprint: (e.deviceFingerprint as string) || null,
          country: (e.country as string) || null,
          isResolved: e.isResolved as boolean,
          createdAt: e.createdAt as string,
        }))
        setEvents(mappedEvents)
        setEventsTotal(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch fraud events:', err)
    }
  }, [eventsPage, eventsLimit, severityFilter, typeFilter, resolvedFilter])

  const fetchBlockedIps = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/fraud/blocked-ips')
      if (res.ok) {
        const data = await res.json()
        setBlockedIps(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch blocked IPs:', err)
    }
  }, [])

  const fetchBlockedDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/fraud/blocked-devices')
      if (res.ok) {
        const data = await res.json()
        setBlockedDevices(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch blocked devices:', err)
    }
  }, [])

  const fetchSuspiciousUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users?fraudMin=50&limit=10')
      if (res.ok) {
        const data = await res.json()
        const users: SuspiciousUser[] = (data.users || []).map((u: Record<string, unknown>) => ({
          email: u.email as string,
          fraudScore: u.fraudScore as number,
          events: 0, // Will be computed from fraud events if available
          isBanned: u.isBanned as boolean,
        }))
        setSuspiciousUsers(users)
      }
    } catch (err) {
      console.error('Failed to fetch suspicious users:', err)
    }
  }, [])

  const computeDistribution = useCallback(async () => {
    try {
      // Fetch all fraud events to compute distribution from user fraudScores
      // Since the API returns fraud events, we compute distribution from user data
      const res = await fetch('/api/admin/users?limit=100')
      if (res.ok) {
        const data = await res.json()
        const users: { fraudScore: number }[] = (data.users || [])
        const ranges = [
          { range: '0-10', min: 0, max: 10 },
          { range: '11-20', min: 11, max: 20 },
          { range: '21-30', min: 21, max: 30 },
          { range: '31-40', min: 31, max: 40 },
          { range: '41-50', min: 41, max: 50 },
          { range: '51-60', min: 51, max: 60 },
          { range: '61-70', min: 61, max: 70 },
          { range: '71-80', min: 71, max: 80 },
          { range: '81-90', min: 81, max: 90 },
          { range: '91-100', min: 91, max: 100 },
        ]
        const distribution = ranges.map((r) => ({
          range: r.range,
          count: users.filter((u) => u.fraudScore >= r.min && u.fraudScore <= r.max).length,
        }))
        setFraudScoreDistribution(distribution)
      }
    } catch (err) {
      console.error('Failed to compute fraud distribution:', err)
      setFraudScoreDistribution([
        { range: '0-10', count: 0 }, { range: '11-20', count: 0 }, { range: '21-30', count: 0 },
        { range: '31-40', count: 0 }, { range: '41-50', count: 0 }, { range: '51-60', count: 0 },
        { range: '61-70', count: 0 }, { range: '71-80', count: 0 }, { range: '81-90', count: 0 },
        { range: '91-100', count: 0 },
      ])
    }
  }, [])

  // Initial load - only runs once on mount
  const [initialLoaded, setInitialLoaded] = useState(false)

  useEffect(() => {
    if (!initialLoaded) {
      const doLoad = async () => {
        setLoading(true)
        await Promise.all([fetchEvents(), fetchBlockedIps(), fetchBlockedDevices(), fetchSuspiciousUsers(), computeDistribution()])
        setLoading(false)
        setInitialLoaded(true)
      }
      doLoad()
    }
  }, [initialLoaded, fetchEvents, fetchBlockedIps, fetchBlockedDevices, fetchSuspiciousUsers, computeDistribution])

  // Refetch events when filters change (after initial load)
  useEffect(() => {
    if (initialLoaded) {
      fetchEvents()
    }
  }, [severityFilter, typeFilter, resolvedFilter, eventsPage, initialLoaded, fetchEvents])

  const resolveEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/fraud/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved: true, resolution: 'Resolved by admin' }),
      })
      if (!res.ok) throw new Error('Failed to resolve event')
      await fetchEvents()
    } catch (err) {
      console.error('Resolve event error:', err)
    }
  }

  const dismissEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/fraud/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isResolved: true, resolution: 'Dismissed by admin' }),
      })
      if (!res.ok) throw new Error('Failed to dismiss event')
      await fetchEvents()
    } catch (err) {
      console.error('Dismiss event error:', err)
    }
  }

  const addBlockedIp = async () => {
    if (!newIp || !newIpReason) return
    try {
      setSaving(true)
      const res = await fetch('/api/admin/fraud/blocked-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress: newIp, reason: newIpReason }),
      })
      if (!res.ok) throw new Error('Failed to block IP')
      setNewIp('')
      setNewIpReason('')
      await fetchBlockedIps()
    } catch (err) {
      console.error('Block IP error:', err)
    } finally {
      setSaving(false)
    }
  }

  const removeBlockedIp = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/fraud/blocked-ips/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to unblock IP')
      await fetchBlockedIps()
    } catch (err) {
      console.error('Unblock IP error:', err)
    }
  }

  const addBlockedDevice = async () => {
    if (!newDevice || !newDeviceReason) return
    try {
      setSaving(true)
      const res = await fetch('/api/admin/fraud/blocked-devices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint: newDevice, reason: newDeviceReason }),
      })
      if (!res.ok) throw new Error('Failed to block device')
      setNewDevice('')
      setNewDeviceReason('')
      await fetchBlockedDevices()
    } catch (err) {
      console.error('Block device error:', err)
    } finally {
      setSaving(false)
    }
  }

  const removeBlockedDevice = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/fraud/blocked-devices/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to unblock device')
      await fetchBlockedDevices()
    } catch (err) {
      console.error('Unblock device error:', err)
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge className="bg-[#FEF2F2] text-[#EF4444] hover:bg-[#FEF2F2]"><AlertTriangle size={10} className="mr-1" />Critical</Badge>
      case 'high': return <Badge className="bg-[#FFF7ED] text-[#F59E0B] hover:bg-[#FFF7ED]">High</Badge>
      case 'medium': return <Badge className="bg-[#E0F7FA] text-[#22B9CF] hover:bg-[#E0F7FA]">Medium</Badge>
      case 'low': return <Badge className="bg-[#ECFDF5] text-[#10B981] hover:bg-[#ECFDF5]">Low</Badge>
      default: return <Badge variant="secondary">{severity}</Badge>
    }
  }

  const getEventTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const filteredEvents = events
  const eventsTotalPages = Math.ceil(eventsTotal / eventsLimit)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD9B6]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="events">
        <TabsList className="bg-white border border-[#E5E7EB]">
          <TabsTrigger value="events" className="text-[13px]">
            <Activity size={14} className="mr-1" /> Events
          </TabsTrigger>
          <TabsTrigger value="ips" className="text-[13px]">
            <Globe size={14} className="mr-1" /> Blocked IPs
          </TabsTrigger>
          <TabsTrigger value="devices" className="text-[13px]">
            <Smartphone size={14} className="mr-1" /> Blocked Devices
          </TabsTrigger>
          <TabsTrigger value="distribution" className="text-[13px]">
            <ShieldAlert size={14} className="mr-1" /> Distribution
          </TabsTrigger>
        </TabsList>

        {/* Fraud Events */}
        <TabsContent value="events" className="space-y-4">
          {/* Filters */}
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Select value={severityFilter} onValueChange={(v) => { setSeverityFilter(v); setEventsPage(1) }}>
                  <SelectTrigger className="w-[130px] h-9 text-[13px]"><SelectValue placeholder="Severity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setEventsPage(1) }}>
                  <SelectTrigger className="w-[160px] h-9 text-[13px]"><SelectValue placeholder="Event Type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="vpn_detected">VPN Detected</SelectItem>
                    <SelectItem value="fast_completion">Fast Completion</SelectItem>
                    <SelectItem value="bot_detected">Bot Detected</SelectItem>
                    <SelectItem value="duplicate_ip">Duplicate IP</SelectItem>
                    <SelectItem value="multiple_accounts">Multiple Accounts</SelectItem>
                    <SelectItem value="impossible_pattern">Impossible Pattern</SelectItem>
                    <SelectItem value="suspicious_location">Suspicious Location</SelectItem>
                    <SelectItem value="answer_inconsistency">Answer Inconsistency</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={resolvedFilter} onValueChange={(v) => { setResolvedFilter(v); setEventsPage(1) }}>
                  <SelectTrigger className="w-[140px] h-9 text-[13px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unresolved">Unresolved</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <div className="ml-auto flex items-center gap-2">
                  <Badge className="bg-[#FEF2F2] text-[#EF4444]">
                    <AlertTriangle size={12} className="mr-1" /> {events.filter((e) => !e.isResolved).length} unresolved
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardContent className="p-0">
              {filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-[#999999]">
                  <ShieldAlert size={40} className="mx-auto text-[#D1D5DB] mb-3" />
                  <p className="text-[14px]">No fraud events found</p>
                  <p className="text-[12px] mt-1">Events will appear here when suspicious activity is detected</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-[#E5E7EB]">
                        <TableHead className="text-[12px] text-[#999999]">Type</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">User</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">Severity</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">IP</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">Country</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">Time</TableHead>
                        <TableHead className="text-[12px] text-[#999999]">Status</TableHead>
                        <TableHead className="w-[120px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map((event) => (
                        <TableRow key={event.id} className={`border-b border-[#F0F2F5] hover:bg-[#FAFAFA] ${event.isResolved ? 'opacity-60' : ''}`}>
                          <TableCell>
                            <span className="text-[13px] font-medium text-[#1A1A1A]">{getEventTypeLabel(event.eventType)}</span>
                          </TableCell>
                          <TableCell className="text-[12px] text-[#555555]">{event.userEmail}</TableCell>
                          <TableCell>{getSeverityBadge(event.severity)}</TableCell>
                          <TableCell className="text-[12px] font-mono text-[#555555]">{event.ipAddress || '—'}</TableCell>
                          <TableCell className="text-[12px] text-[#555555]">{event.country || '—'}</TableCell>
                          <TableCell className="text-[11px] text-[#999999]">
                            <div className="flex items-center gap-1"><Clock size={10} />{new Date(event.createdAt).toLocaleString()}</div>
                          </TableCell>
                          <TableCell>
                            {event.isResolved ? (
                              <Badge className="bg-[#ECFDF5] text-[#10B981]"><CheckCircle size={10} className="mr-1" />Resolved</Badge>
                            ) : (
                              <Badge className="bg-[#FFF7ED] text-[#F59E0B]">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setDetailEvent(event); setDetailOpen(true) }}>
                                <Eye size={14} />
                              </Button>
                              {!event.isResolved && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-[#10B981]" onClick={() => resolveEvent(event.id)}>
                                    <CheckCircle size={14} />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-[#EF4444]" onClick={() => dismissEvent(event.id)}>
                                    <XCircle size={14} />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {/* Pagination */}
              {eventsTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB]">
                  <p className="text-[12px] text-[#999999]">
                    Showing {((eventsPage - 1) * eventsLimit) + 1}–{Math.min(eventsPage * eventsLimit, eventsTotal)} of {eventsTotal}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setEventsPage((p) => Math.max(1, p - 1))} disabled={eventsPage === 1}>
                      ‹
                    </Button>
                    <span className="text-[12px] text-[#555555]">{eventsPage}/{eventsTotalPages}</span>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => setEventsPage((p) => Math.min(eventsTotalPages, p + 1))} disabled={eventsPage === eventsTotalPages}>
                      ›
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocked IPs */}
        <TabsContent value="ips" className="space-y-4">
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] font-bold text-[#1A1A1A]">Blocked IP Addresses</CardTitle>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search IP..."
                    value={ipSearch}
                    onChange={(e) => setIpSearch(e.target.value)}
                    className="h-8 text-[12px] w-[180px] border-[#E5E7EB]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Add new */}
              <div className="flex items-center gap-2 mb-4">
                <Input placeholder="IP Address" value={newIp} onChange={(e) => setNewIp(e.target.value)} className="h-9 text-[13px] w-[180px]" />
                <Input placeholder="Reason" value={newIpReason} onChange={(e) => setNewIpReason(e.target.value)} className="h-9 text-[13px] flex-1" />
                <Button size="sm" className="text-white text-[12px]" style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }} onClick={addBlockedIp} disabled={saving}>
                  {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
                  Block
                </Button>
              </div>
              {blockedIps.length === 0 ? (
                <div className="text-center py-8 text-[#999999]">
                  <Globe size={32} className="mx-auto text-[#D1D5DB] mb-2" />
                  <p className="text-[13px]">No blocked IPs</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {blockedIps
                    .filter((ip) => !ipSearch || ip.ipAddress.includes(ipSearch))
                    .map((ip) => (
                    <div key={ip.id} className="flex items-center gap-3 p-3 bg-[#F8FAFB] rounded-[8px]">
                      <Globe size={16} className="text-[#EF4444]" />
                      <span className="font-mono text-[13px] font-medium text-[#1A1A1A]">{ip.ipAddress}</span>
                      <span className="text-[12px] text-[#999999]">{ip.reason}</span>
                      {ip.isAutoBlocked && <Badge className="bg-[#E0F7FA] text-[#22B9CF] text-[10px]">Auto</Badge>}
                      <span className="text-[11px] text-[#999999] ml-auto">{new Date(ip.createdAt).toLocaleDateString()}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[#EF4444]" onClick={() => removeBlockedIp(ip.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocked Devices */}
        <TabsContent value="devices" className="space-y-4">
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[15px] font-bold text-[#1A1A1A]">Blocked Devices</CardTitle>
                <Input
                  placeholder="Search fingerprint..."
                  value={deviceSearch}
                  onChange={(e) => setDeviceSearch(e.target.value)}
                  className="h-8 text-[12px] w-[200px] border-[#E5E7EB]"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Input placeholder="Device Fingerprint" value={newDevice} onChange={(e) => setNewDevice(e.target.value)} className="h-9 text-[13px] w-[220px]" />
                <Input placeholder="Reason" value={newDeviceReason} onChange={(e) => setNewDeviceReason(e.target.value)} className="h-9 text-[13px] flex-1" />
                <Button size="sm" className="text-white text-[12px]" style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }} onClick={addBlockedDevice} disabled={saving}>
                  {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
                  Block
                </Button>
              </div>
              {blockedDevices.length === 0 ? (
                <div className="text-center py-8 text-[#999999]">
                  <Smartphone size={32} className="mx-auto text-[#D1D5DB] mb-2" />
                  <p className="text-[13px]">No blocked devices</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {blockedDevices
                    .filter((d) => !deviceSearch || d.fingerprint.includes(deviceSearch))
                    .map((device) => (
                    <div key={device.id} className="flex items-center gap-3 p-3 bg-[#F8FAFB] rounded-[8px]">
                      <Smartphone size={16} className="text-[#EF4444]" />
                      <span className="font-mono text-[13px] font-medium text-[#1A1A1A]">{device.fingerprint}</span>
                      <span className="text-[12px] text-[#999999]">{device.reason}</span>
                      {device.isAutoBlocked && <Badge className="bg-[#E0F7FA] text-[#22B9CF] text-[10px]">Auto</Badge>}
                      <span className="text-[11px] text-[#999999] ml-auto">{new Date(device.createdAt).toLocaleDateString()}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-[#EF4444]" onClick={() => removeBlockedDevice(device.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fraud Score Distribution */}
        <TabsContent value="distribution" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-[#E5E7EB] shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-[15px] font-bold text-[#1A1A1A]">Fraud Score Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fraudScoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#999' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#999' }} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="count" fill="#2DD9B6" radius={[4, 4, 0, 0]} name="Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#E5E7EB] shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] font-bold text-[#1A1A1A]">Suspicious Users (by Fraud Score)</CardTitle>
              </CardHeader>
              <CardContent>
                {suspiciousUsers.length === 0 ? (
                  <div className="text-center py-8 text-[#999999]">
                    <UserX size={32} className="mx-auto text-[#D1D5DB] mb-2" />
                    <p className="text-[13px]">No suspicious users</p>
                    <p className="text-[11px] mt-1">Users with fraud score ≥ 50 will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {suspiciousUsers.map((user) => (
                      <div key={user.email} className="flex items-center gap-3 p-3 bg-[#F8FAFB] rounded-[8px]">
                        <div
                          className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
                          style={{
                            background: user.fraudScore >= 80 ? '#EF4444' : user.fraudScore >= 60 ? '#F59E0B' : '#22B9CF',
                          }}
                        >
                          {Math.round(user.fraudScore)}
                        </div>
                        <div className="flex-1">
                          <p className="text-[13px] font-semibold text-[#1A1A1A]">{user.email}</p>
                          <p className="text-[11px] text-[#999999]">{user.events} fraud events</p>
                        </div>
                        {user.isBanned ? (
                          <Badge className="bg-[#FEF2F2] text-[#EF4444]"><UserX size={10} className="mr-1" />Banned</Badge>
                        ) : (
                          <Badge className="bg-[#FFF7ED] text-[#F59E0B]"><AlertTriangle size={10} className="mr-1" />Active</Badge>
                        )}
                        <Button size="sm" variant="outline" className="h-7 text-[11px]">
                          <Eye size={12} className="mr-1" /> View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Event Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[500px]">
          {detailEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[16px] font-bold flex items-center gap-2" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                  <ShieldAlert size={18} className="text-[#EF4444]" />
                  {getEventTypeLabel(detailEvent.eventType)}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {getSeverityBadge(detailEvent.severity)}
                  {detailEvent.isResolved ? (
                    <Badge className="bg-[#ECFDF5] text-[#10B981]"><CheckCircle size={10} className="mr-1" />Resolved</Badge>
                  ) : (
                    <Badge className="bg-[#FFF7ED] text-[#F59E0B]">Pending</Badge>
                  )}
                </div>
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-[#999999]">User</span><span className="font-medium">{detailEvent.userEmail}</span></div>
                  <div className="flex justify-between"><span className="text-[#999999]">IP Address</span><span className="font-mono">{detailEvent.ipAddress || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[#999999]">Device</span><span className="font-mono">{detailEvent.deviceFingerprint || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[#999999]">Country</span><span className="font-medium">{detailEvent.country || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-[#999999]">Time</span><span className="font-medium">{new Date(detailEvent.createdAt).toLocaleString()}</span></div>
                </div>
                <div>
                  <p className="text-[12px] text-[#999999] mb-1">Event Details</p>
                  <pre className="text-[12px] bg-[#F8FAFB] p-3 rounded-[8px] overflow-x-auto font-mono">
                    {(() => { try { return JSON.stringify(JSON.parse(detailEvent.details), null, 2) } catch { return detailEvent.details } })()}
                  </pre>
                </div>
                {!detailEvent.isResolved && (
                  <div className="flex gap-2 pt-2 border-t border-[#E5E7EB]">
                    <Button size="sm" className="text-[12px] bg-[#10B981] hover:bg-[#059669] text-white" onClick={() => { resolveEvent(detailEvent.id); setDetailOpen(false) }}>
                      <CheckCircle size={14} className="mr-1" /> Resolve
                    </Button>
                    <Button size="sm" variant="outline" className="text-[12px] border-[#EF4444] text-[#EF4444]">
                      <Ban size={14} className="mr-1" /> Ban User
                    </Button>
                    <Button size="sm" variant="outline" className="text-[12px] border-[#F59E0B] text-[#F59E0B]">
                      <Globe size={14} className="mr-1" /> Block IP
                    </Button>
                    <Button size="sm" variant="outline" className="text-[12px] border-[#22B9CF] text-[#22B9CF]">
                      <Smartphone size={14} className="mr-1" /> Block Device
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
