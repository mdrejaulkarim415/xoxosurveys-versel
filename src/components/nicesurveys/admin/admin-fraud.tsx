'use client'

import { useState } from 'react'
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
  Search,
  Plus,
  Trash2,
  Globe,
  Smartphone,
  Activity,
  UserX,
  Clock,
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

interface BlockedEntry {
  id: string
  value: string
  reason: string
  isAutoBlocked: boolean
  createdAt: string
}

const mockFraudEvents: FraudEvent[] = [
  { id: 'fe1', userId: 'u1', userEmail: 'sarah@example.com', eventType: 'vpn_detected', severity: 'high', details: '{"provider":"NordVPN","ip":"45.33.32.156"}', ipAddress: '45.33.32.156', deviceFingerprint: null, country: 'DE', isResolved: false, createdAt: '2025-03-10T14:23:00Z' },
  { id: 'fe2', userId: 'u2', userEmail: 'mike@example.com', eventType: 'fast_completion', severity: 'medium', details: '{"surveyTime":5,"expectedTime":20,"speedRatio":0.25}', ipAddress: '172.16.0.1', deviceFingerprint: 'fp_abc123', country: 'US', isResolved: false, createdAt: '2025-03-10T14:15:00Z' },
  { id: 'fe3', userId: 'u3', userEmail: 'bot_user@example.com', eventType: 'bot_detected', severity: 'critical', details: '{"pattern":"rapid_fire","requestsPerMinute":120}', ipAddress: '45.33.32.156', deviceFingerprint: 'fp_bot_001', country: 'DE', isResolved: false, createdAt: '2025-03-10T13:45:00Z' },
  { id: 'fe4', userId: 'u4', userEmail: 'lisa@example.com', eventType: 'duplicate_ip', severity: 'medium', details: '{"accounts":3,"sameIp":"10.0.0.200"}', ipAddress: '10.0.0.200', deviceFingerprint: null, country: 'US', isResolved: false, createdAt: '2025-03-10T12:30:00Z' },
  { id: 'fe5', userId: 'u5', userEmail: 'dave@example.com', eventType: 'impossible_pattern', severity: 'high', details: '{"completedIn":2,"minPossible":10}', ipAddress: '203.0.113.42', deviceFingerprint: 'fp_xyz789', country: 'US', isResolved: true, createdAt: '2025-03-10T11:00:00Z' },
  { id: 'fe6', userId: 'u6', userEmail: 'anna@example.com', eventType: 'multiple_accounts', severity: 'critical', details: '{"accountCount":5,"sameDevice":"fp_multi_001"}', ipAddress: '198.51.100.7', deviceFingerprint: 'fp_multi_001', country: 'US', isResolved: false, createdAt: '2025-03-10T10:20:00Z' },
  { id: 'fe7', userId: 'u7', userEmail: 'tom@example.com', eventType: 'suspicious_location', severity: 'low', details: '{"prevCountry":"US","currentCountry":"NG","timeDiff":30}', ipAddress: '102.89.23.1', deviceFingerprint: null, country: 'NG', isResolved: false, createdAt: '2025-03-10T09:00:00Z' },
  { id: 'fe8', userId: 'u8', userEmail: 'jerry@example.com', eventType: 'answer_inconsistency', severity: 'medium', details: '{"consistencyScore":0.12,"threshold":0.5}', ipAddress: '10.0.0.55', deviceFingerprint: 'fp_jerry', country: 'US', isResolved: true, createdAt: '2025-03-09T22:00:00Z' },
]

const mockBlockedIps: BlockedEntry[] = [
  { id: 'bi1', value: '45.33.32.156', reason: 'Known VPN exit node', isAutoBlocked: true, createdAt: '2025-03-10' },
  { id: 'bi2', value: '185.220.101.1', reason: 'Tor exit node', isAutoBlocked: true, createdAt: '2025-03-09' },
  { id: 'bi3', value: '103.21.244.0', reason: 'Multiple fraud accounts', isAutoBlocked: false, createdAt: '2025-03-08' },
]

const mockBlockedDevices: BlockedEntry[] = [
  { id: 'bd1', value: 'fp_bot_001', reason: 'Bot automation detected', isAutoBlocked: true, createdAt: '2025-03-10' },
  { id: 'bd2', value: 'fp_multi_001', reason: 'Multiple accounts same device', isAutoBlocked: false, createdAt: '2025-03-09' },
]

const fraudScoreDistribution = [
  { range: '0-10', count: 850 },
  { range: '11-20', count: 320 },
  { range: '21-30', count: 180 },
  { range: '31-40', count: 95 },
  { range: '41-50', count: 65 },
  { range: '51-60', count: 42 },
  { range: '61-70', count: 28 },
  { range: '71-80', count: 15 },
  { range: '81-90', count: 8 },
  { range: '91-100', count: 5 },
]

const suspiciousUsers = [
  { email: 'bot_user@example.com', fraudScore: 95, events: 12, isBanned: true },
  { email: 'mike@example.com', fraudScore: 90, events: 8, isBanned: true },
  { email: 'anna@example.com', fraudScore: 85, events: 6, isBanned: false },
  { email: 'sarah@example.com', fraudScore: 75, events: 4, isBanned: false },
  { email: 'lisa@example.com', fraudScore: 60, events: 3, isBanned: false },
]

export function AdminFraud() {
  const [events, setEvents] = useState(mockFraudEvents)
  const [blockedIps, setBlockedIps] = useState(mockBlockedIps)
  const [blockedDevices, setBlockedDevices] = useState(mockBlockedDevices)
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

  const filteredEvents = events.filter((e) => {
    if (severityFilter !== 'all' && e.severity !== severityFilter) return false
    if (typeFilter !== 'all' && e.eventType !== typeFilter) return false
    if (resolvedFilter === 'unresolved' && e.isResolved) return false
    if (resolvedFilter === 'resolved' && !e.isResolved) return false
    return true
  })

  const resolveEvent = (id: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, isResolved: true } : e)))
  }

  const dismissEvent = (id: string) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, isResolved: true } : e)))
  }

  const addBlockedIp = () => {
    if (!newIp || !newIpReason) return
    setBlockedIps((prev) => [...prev, { id: `bi_${Date.now()}`, value: newIp, reason: newIpReason, isAutoBlocked: false, createdAt: new Date().toISOString().split('T')[0] }])
    setNewIp('')
    setNewIpReason('')
  }

  const addBlockedDevice = () => {
    if (!newDevice || !newDeviceReason) return
    setBlockedDevices((prev) => [...prev, { id: `bd_${Date.now()}`, value: newDevice, reason: newDeviceReason, isAutoBlocked: false, createdAt: new Date().toISOString().split('T')[0] }])
    setNewDevice('')
    setNewDeviceReason('')
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
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-[130px] h-9 text-[13px]"><SelectValue placeholder="Severity" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severity</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
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
                <Select value={resolvedFilter} onValueChange={setResolvedFilter}>
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
                <Button size="sm" className="text-white text-[12px]" style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }} onClick={addBlockedIp}>
                  <Plus size={14} className="mr-1" /> Block
                </Button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {blockedIps
                  .filter((ip) => !ipSearch || ip.value.includes(ipSearch))
                  .map((ip) => (
                  <div key={ip.id} className="flex items-center gap-3 p-3 bg-[#F8FAFB] rounded-[8px]">
                    <Globe size={16} className="text-[#EF4444]" />
                    <span className="font-mono text-[13px] font-medium text-[#1A1A1A]">{ip.value}</span>
                    <span className="text-[12px] text-[#999999]">{ip.reason}</span>
                    {ip.isAutoBlocked && <Badge className="bg-[#E0F7FA] text-[#22B9CF] text-[10px]">Auto</Badge>}
                    <span className="text-[11px] text-[#999999] ml-auto">{ip.createdAt}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#EF4444]" onClick={() => setBlockedIps((prev) => prev.filter((i) => i.id !== ip.id))}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
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
                <Button size="sm" className="text-white text-[12px]" style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }} onClick={addBlockedDevice}>
                  <Plus size={14} className="mr-1" /> Block
                </Button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {blockedDevices
                  .filter((d) => !deviceSearch || d.value.includes(deviceSearch))
                  .map((device) => (
                  <div key={device.id} className="flex items-center gap-3 p-3 bg-[#F8FAFB] rounded-[8px]">
                    <Smartphone size={16} className="text-[#EF4444]" />
                    <span className="font-mono text-[13px] font-medium text-[#1A1A1A]">{device.value}</span>
                    <span className="text-[12px] text-[#999999]">{device.reason}</span>
                    {device.isAutoBlocked && <Badge className="bg-[#E0F7FA] text-[#22B9CF] text-[10px]">Auto</Badge>}
                    <span className="text-[11px] text-[#999999] ml-auto">{device.createdAt}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-[#EF4444]" onClick={() => setBlockedDevices((prev) => prev.filter((d2) => d2.id !== device.id))}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                ))}
              </div>
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
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {suspiciousUsers.map((user) => (
                    <div key={user.email} className="flex items-center gap-3 p-3 bg-[#F8FAFB] rounded-[8px]">
                      <div
                        className="w-[36px] h-[36px] rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
                        style={{
                          background: user.fraudScore >= 80 ? '#EF4444' : user.fraudScore >= 60 ? '#F59E0B' : '#22B9CF',
                        }}
                      >
                        {user.fraudScore}
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
                    {JSON.stringify(JSON.parse(detailEvent.details), null, 2)}
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
