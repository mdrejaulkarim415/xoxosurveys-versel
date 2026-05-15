'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
  LayoutGrid,
  Plus,
  Edit,
  Trash2,
  Wifi,
  WifiOff,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  DollarSign,
  BarChart3,
  ExternalLink,
  Eye,
  EyeOff,
  Save,
} from 'lucide-react'

interface SurveyWall {
  id: string
  name: string
  provider: string
  apiKey: string | null
  apiSecret: string | null
  endpointUrl: string | null
  isActive: boolean
  priority: number
  minPayout: number
  maxPayout: number
  description: string | null
  blockVpn: boolean
  blockProxy: boolean
  minFraudScore: number
  cooldownMinutes: number
  surveysAvailable: number
  completions: number
  revenue: number
  userRevenuePercent: number
  showProviderCard: boolean
  showInIndividualSurveys: boolean
  createdAt: string
}

const emptyWall: Omit<SurveyWall, 'id' | 'surveysAvailable' | 'completions' | 'revenue' | 'createdAt'> = {
  name: '',
  provider: 'cpx-research',
  apiKey: '',
  apiSecret: '',
  endpointUrl: '',
  isActive: true,
  priority: 5,
  minPayout: 0.10,
  maxPayout: 5.00,
  description: '',
  blockVpn: true,
  blockProxy: true,
  minFraudScore: 50,
  cooldownMinutes: 5,
  userRevenuePercent: 0, // 0 = use global default
  showProviderCard: true, // Show in Survey Providers section by default
  showInIndividualSurveys: true, // Show in Individual Surveys by default
}

export function AdminSurveyWalls() {
  const [walls, setWalls] = useState<SurveyWall[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editWall, setEditWall] = useState<SurveyWall | null>(null)
  const [formData, setFormData] = useState(emptyWall)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'fail' | null>>({})
  const [savingCard, setSavingCard] = useState<string | null>(null)
  const [cardSaved, setCardSaved] = useState<string | null>(null)

  const fetchWalls = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/survey-walls')
      if (res.ok) {
        const data = await res.json()
        setWalls(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch walls:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWalls()
  }, [fetchWalls])

  const openCreate = () => {
    setFormData(emptyWall)
    setEditWall(null)
    setShowForm(true)
  }

  const openEdit = (wall: SurveyWall) => {
    setFormData({
      name: wall.name,
      provider: wall.provider,
      apiKey: wall.apiKey || '',
      apiSecret: wall.apiSecret || '',
      endpointUrl: wall.endpointUrl || '',
      isActive: wall.isActive,
      priority: wall.priority,
      minPayout: wall.minPayout,
      maxPayout: wall.maxPayout,
      description: wall.description || '',
      blockVpn: wall.blockVpn,
      blockProxy: wall.blockProxy,
      minFraudScore: wall.minFraudScore,
      cooldownMinutes: wall.cooldownMinutes,
      userRevenuePercent: wall.userRevenuePercent || 0,
      showProviderCard: wall.showProviderCard ?? true,
      showInIndividualSurveys: wall.showInIndividualSurveys ?? true,
    })
    setEditWall(wall)
    setShowForm(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      if (editWall) {
        const res = await fetch(`/api/admin/survey-walls/${editWall.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error('Failed to update wall')
      } else {
        const res = await fetch('/api/admin/survey-walls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error('Failed to create wall')
      }
      setShowForm(false)
      await fetchWalls()
    } catch (err) {
      console.error('Save wall error:', err)
    } finally {
      setSaving(false)
    }
  }

  // Quick save for card-level toggles (isActive, showProviderCard, userRevenuePercent)
  const quickSaveCard = async (wall: SurveyWall, updates: Partial<SurveyWall>) => {
    try {
      setSavingCard(wall.id)
      const res = await fetch(`/api/admin/survey-walls/${wall.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to save')
      setCardSaved(wall.id)
      setTimeout(() => setCardSaved(null), 2000)
      await fetchWalls()
    } catch (err) {
      console.error('Quick save error:', err)
    } finally {
      setSavingCard(null)
    }
  }

  const toggleActive = async (wall: SurveyWall) => {
    await quickSaveCard(wall, { isActive: !wall.isActive })
  }

  const toggleShowProviderCard = async (wall: SurveyWall) => {
    await quickSaveCard(wall, { showProviderCard: !wall.showProviderCard })
  }

  const toggleShowInIndividualSurveys = async (wall: SurveyWall) => {
    await quickSaveCard(wall, { showInIndividualSurveys: !wall.showInIndividualSurveys })
  }

  const deleteWall = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/survey-walls/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete wall')
      await fetchWalls()
    } catch (err) {
      console.error('Delete wall error:', err)
    }
  }

  const testConnection = async (wall: SurveyWall) => {
    setTesting(wall.id)
    setTestResults((prev) => ({ ...prev, [wall.id]: null }))
    // Simulate API test
    await new Promise((r) => setTimeout(r, 1500))
    const success = Math.random() > 0.3
    setTestResults((prev) => ({ ...prev, [wall.id]: success ? 'success' : 'fail' }))
    setTesting(null)
  }

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'cpx-research': return '#2DD9B6'
      case 'bitlabs': return '#22B9CF'
      case 'inbrain': return '#F59E0B'
      case 'revtoo': return '#7C3AED'
      default: return '#8B5CF6'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD9B6]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
            Survey Wall Providers
          </h3>
          <p className="text-[13px] text-[#999999]">Manage your survey providers and API connections</p>
        </div>
        <Button
          className="text-white text-[13px]"
          style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
          onClick={openCreate}
        >
          <Plus size={16} className="mr-1" /> Add Wall
        </Button>
      </div>

      {/* Wall Cards */}
      {walls.length === 0 ? (
        <Card className="border-[#E5E7EB] shadow-sm">
          <CardContent className="py-16 text-center">
            <LayoutGrid size={40} className="mx-auto text-[#D1D5DB] mb-3" />
            <p className="text-[14px] text-[#999999]">No survey walls configured</p>
            <p className="text-[12px] text-[#CCCCCC] mt-1">Click &quot;Add Wall&quot; to create your first survey wall provider</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {walls.map((wall) => (
            <Card key={wall.id} className={`border-[#E5E7EB] shadow-sm ${!wall.isActive ? 'opacity-70' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center"
                      style={{ background: `${getProviderColor(wall.provider)}15`, color: getProviderColor(wall.provider) }}
                    >
                      <LayoutGrid size={20} />
                    </div>
                    <div>
                      <CardTitle className="text-[15px] font-bold text-[#1A1A1A]">{wall.name}</CardTitle>
                      <p className="text-[12px] text-[#999999]">{wall.provider}</p>
                    </div>
                  </div>
                  <Badge className={wall.isActive ? 'bg-[#ECFDF5] text-[#10B981] hover:bg-[#ECFDF5]' : 'bg-[#F5F5F5] text-[#999999] hover:bg-[#F5F5F5]'}>
                    {wall.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-[#F8FAFB] rounded-[6px] text-center">
                    <p className="text-[14px] font-bold text-[#1A1A1A]">{wall.surveysAvailable}</p>
                    <p className="text-[10px] text-[#999999]">Available</p>
                  </div>
                  <div className="p-2 bg-[#F8FAFB] rounded-[6px] text-center">
                    <p className="text-[14px] font-bold text-[#1A1A1A]">{wall.completions.toLocaleString()}</p>
                    <p className="text-[10px] text-[#999999]">Completions</p>
                  </div>
                  <div className="p-2 bg-[#F8FAFB] rounded-[6px] text-center">
                    <p className="text-[14px] font-bold text-[#2DD9B6]">${wall.revenue.toLocaleString()}</p>
                    <p className="text-[10px] text-[#999999]">Revenue</p>
                  </div>
                </div>

                {/* Payout Range */}
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#999999]">Payout range:</span>
                  <span className="font-medium text-[#1A1A1A]">${wall.minPayout.toFixed(2)} — ${wall.maxPayout.toFixed(2)}</span>
                </div>

                {/* Revenue Share */}
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#999999]">Revenue share:</span>
                  <span className="font-medium text-[#10B981]">User {wall.userRevenuePercent || 'Default'}% / Admin {wall.userRevenuePercent ? (100 - wall.userRevenuePercent) + '%' : 'Default'}</span>
                </div>

                {/* Anti-Fraud */}
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#999999]">Fraud threshold:</span>
                  <span className="font-medium text-[#1A1A1A]">{wall.minFraudScore}/100</span>
                </div>

                {/* ===== Toggle 1: Show in Survey Providers Section ===== */}
                <div className="flex items-center justify-between p-2.5 bg-[#F0FDFB] rounded-[8px] border border-[#0FBCC0]/20">
                  <div className="flex items-center gap-2">
                    {wall.showProviderCard ? (
                      <Eye size={14} className="text-[#0FBCC0]" />
                    ) : (
                      <EyeOff size={14} className="text-[#999999]" />
                    )}
                    <div>
                      <p className="text-[12px] font-medium text-[#065F46]">Survey Providers</p>
                      <p className="text-[10px] text-[#047857]">
                        {wall.showProviderCard
                          ? 'Card visible in Survey Providers'
                          : 'Card hidden from Survey Providers'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={wall.showProviderCard ?? true}
                    onCheckedChange={() => toggleShowProviderCard(wall)}
                    disabled={savingCard === wall.id}
                  />
                </div>

                {/* ===== Toggle 2: Show in Individual Surveys ===== */}
                <div className="flex items-center justify-between p-2.5 bg-[#EFF6FF] rounded-[8px] border border-[#3B82F6]/20">
                  <div className="flex items-center gap-2">
                    {wall.showInIndividualSurveys ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    )}
                    <div>
                      <p className="text-[12px] font-medium text-[#1E40AF]">Individual Surveys</p>
                      <p className="text-[10px] text-[#3B82F6]">
                        {wall.showInIndividualSurveys
                          ? 'Surveys visible in Individual Surveys'
                          : 'Surveys hidden from Individual Surveys'
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={wall.showInIndividualSurveys ?? true}
                    onCheckedChange={() => toggleShowInIndividualSurveys(wall)}
                    disabled={savingCard === wall.id}
                  />
                </div>

                {/* Admin Revenue Percent (per wall) */}
                <div className="flex items-center justify-between p-2.5 bg-[#FDF4FF] rounded-[8px] border border-[#A855F7]/20">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-[#A855F7]" />
                    <div>
                      <p className="text-[12px] font-medium text-[#581C87]">Admin Revenue %</p>
                      <p className="text-[10px] text-[#7C3AED]">
                        {wall.userRevenuePercent > 0
                          ? `User: ${wall.userRevenuePercent}% / Admin: ${100 - wall.userRevenuePercent}%`
                          : 'Using global default'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input
                      type="number"
                      min={0}
                      max={95}
                      value={wall.userRevenuePercent || 0}
                      onChange={(e) => {
                        const val = Math.min(95, Math.max(0, Number(e.target.value)))
                        // Optimistic update
                        setWalls(prev => prev.map(w =>
                          w.id === wall.id ? { ...w, userRevenuePercent: val } : w
                        ))
                      }}
                      onBlur={(e) => {
                        const val = Math.min(95, Math.max(0, Number(e.target.value)))
                        quickSaveCard(wall, { userRevenuePercent: val })
                      }}
                      className="h-7 text-[12px] w-[60px] text-center p-1"
                    />
                    <span className="text-[11px] text-[#999999]">%</span>
                  </div>
                </div>

                {/* Saved indicator */}
                {cardSaved === wall.id && (
                  <div className="flex items-center gap-1 text-[11px] text-[#10B981]">
                    <CheckCircle size={12} />
                    <span>Saved!</span>
                  </div>
                )}

                {/* API Status */}
                <div className="flex items-center gap-2">
                  {testResults[wall.id] === 'success' ? (
                    <Badge className="bg-[#ECFDF5] text-[#10B981]"><CheckCircle size={12} className="mr-1" /> Connected</Badge>
                  ) : testResults[wall.id] === 'fail' ? (
                    <Badge className="bg-[#FEF2F2] text-[#EF4444]"><XCircle size={12} className="mr-1" /> Failed</Badge>
                  ) : (
                    <Badge className="bg-[#F5F5F5] text-[#999999]">{wall.endpointUrl ? 'Not tested' : 'No endpoint'}</Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#E5E7EB]">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-[12px]"
                    onClick={() => testConnection(wall)}
                    disabled={testing === wall.id}
                  >
                    {testing === wall.id ? (
                      <Loader2 size={14} className="mr-1 animate-spin" />
                    ) : (
                      <TestTube size={14} className="mr-1" />
                    )}
                    Test
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-[12px]" onClick={() => toggleActive(wall)}>
                    {wall.isActive ? <WifiOff size={14} /> : <Wifi size={14} />}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-[12px]" onClick={() => openEdit(wall)}>
                    <Edit size={14} />
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-[12px] border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white" onClick={() => deleteWall(wall.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
              {editWall ? 'Edit Survey Wall' : 'Add Survey Wall'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="text-[13px] font-bold text-[#1A1A1A] flex items-center gap-2">
                <LayoutGrid size={14} className="text-[#2DD9B6]" /> Basic Information
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[12px]">Wall Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. CPX Research"
                    className="h-9 text-[13px]"
                  />
                </div>
                <div>
                  <Label className="text-[12px]">Provider</Label>
                  <Select value={formData.provider} onValueChange={(v) => setFormData((p) => ({ ...p, provider: v }))}>
                    <SelectTrigger className="h-9 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpx-research">CPX Research</SelectItem>
                      <SelectItem value="bitlabs">Bitlabs</SelectItem>
                      <SelectItem value="inbrain">Inbrain</SelectItem>
                      <SelectItem value="revtoo">Revtoo</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-[12px]">Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Brief description of this survey wall"
                  className="h-9 text-[13px]"
                />
              </div>
              <div>
                <Label className="text-[12px]">Priority</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData((p) => ({ ...p, priority: Number(e.target.value) }))}
                  className="h-9 text-[13px] w-[120px]"
                />
              </div>
            </div>

            {/* API Configuration */}
            <div className="space-y-3">
              <h4 className="text-[13px] font-bold text-[#1A1A1A] flex items-center gap-2">
                <ExternalLink size={14} className="text-[#22B9CF]" /> API Configuration
              </h4>
              <div>
                <Label className="text-[12px]">Endpoint URL</Label>
                <Input
                  value={formData.endpointUrl}
                  onChange={(e) => setFormData((p) => ({ ...p, endpointUrl: e.target.value }))}
                  placeholder="https://api.provider.com/v1"
                  className="h-9 text-[13px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[12px]">API Key</Label>
                  <Input
                    value={formData.apiKey}
                    onChange={(e) => setFormData((p) => ({ ...p, apiKey: e.target.value }))}
                    placeholder="Your API key"
                    className="h-9 text-[13px]"
                    type="password"
                  />
                </div>
                <div>
                  <Label className="text-[12px]">API Secret</Label>
                  <Input
                    value={formData.apiSecret}
                    onChange={(e) => setFormData((p) => ({ ...p, apiSecret: e.target.value }))}
                    placeholder="Your API secret"
                    className="h-9 text-[13px]"
                    type="password"
                  />
                </div>
              </div>
            </div>

            {/* Payout Settings */}
            <div className="space-y-3">
              <h4 className="text-[13px] font-bold text-[#1A1A1A] flex items-center gap-2">
                <DollarSign size={14} className="text-[#10B981]" /> Payout & Revenue Settings
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[12px]">Min Payout ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.minPayout}
                    onChange={(e) => setFormData((p) => ({ ...p, minPayout: Number(e.target.value) }))}
                    className="h-9 text-[13px]"
                  />
                </div>
                <div>
                  <Label className="text-[12px]">Max Payout ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.maxPayout}
                    onChange={(e) => setFormData((p) => ({ ...p, maxPayout: Number(e.target.value) }))}
                    className="h-9 text-[13px]"
                  />
                </div>
              </div>
              <div>
                <Label className="text-[12px]">User Revenue % (0 = use global default)</Label>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    type="range"
                    min={0}
                    max={95}
                    step={1}
                    value={formData.userRevenuePercent}
                    onChange={(e) => setFormData((p) => ({ ...p, userRevenuePercent: Number(e.target.value) }))}
                    className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: formData.userRevenuePercent === 0
                        ? '#E5E7EB'
                        : `linear-gradient(to right, #10B981 ${formData.userRevenuePercent}%, #E5E7EB ${formData.userRevenuePercent}%)`
                    }}
                  />
                  <Input
                    type="number"
                    min={0}
                    max={95}
                    value={formData.userRevenuePercent}
                    onChange={(e) => setFormData((p) => ({ ...p, userRevenuePercent: Math.min(95, Math.max(0, Number(e.target.value))) }))}
                    className="h-9 text-[13px] w-[70px] text-center"
                  />
                </div>
                <p className="text-[10px] text-[#999999] mt-1">
                  {formData.userRevenuePercent === 0
                    ? 'Using global default (set in Settings page)'
                    : `User gets ${formData.userRevenuePercent}% — Admin keeps ${100 - formData.userRevenuePercent}%`
                  }
                </p>
              </div>
            </div>

            {/* ===== Toggle 1: Show in Survey Providers ===== */}
            <div className="flex items-center justify-between p-3 bg-[#F0FDFB] rounded-[8px] border border-[#0FBCC0]/20">
              <div>
                <p className="text-[13px] font-medium text-[#065F46]">Show in Survey Providers</p>
                <p className="text-[11px] text-[#047857]">
                  {formData.showProviderCard
                    ? 'Provider card will appear in Survey Providers section'
                    : 'Provider card will be hidden from Survey Providers'
                  }
                </p>
              </div>
              <Switch
                checked={formData.showProviderCard}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, showProviderCard: v }))}
              />
            </div>

            {/* ===== Toggle 2: Show in Individual Surveys ===== */}
            <div className="flex items-center justify-between p-3 bg-[#EFF6FF] rounded-[8px] border border-[#3B82F6]/20">
              <div>
                <p className="text-[13px] font-medium text-[#1E40AF]">Show in Individual Surveys</p>
                <p className="text-[11px] text-[#3B82F6]">
                  {formData.showInIndividualSurveys
                    ? 'Surveys from this provider will appear in Individual Surveys section'
                    : 'Surveys from this provider will be hidden from Individual Surveys'
                  }
                </p>
              </div>
              <Switch
                checked={formData.showInIndividualSurveys}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, showInIndividualSurveys: v }))}
              />
            </div>

            {/* Anti-Fraud Settings */}
            <div className="space-y-3">
              <h4 className="text-[13px] font-bold text-[#1A1A1A] flex items-center gap-2">
                <Shield size={14} className="text-[#F59E0B]" /> Anti-Fraud Settings
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
                  <span className="text-[13px]">Block VPN</span>
                  <Switch
                    checked={formData.blockVpn}
                    onCheckedChange={(v) => setFormData((p) => ({ ...p, blockVpn: v }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
                  <span className="text-[13px]">Block Proxy</span>
                  <Switch
                    checked={formData.blockProxy}
                    onCheckedChange={(v) => setFormData((p) => ({ ...p, blockProxy: v }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[12px]">Min Fraud Score to Block</Label>
                  <Input
                    type="number"
                    value={formData.minFraudScore}
                    onChange={(e) => setFormData((p) => ({ ...p, minFraudScore: Number(e.target.value) }))}
                    className="h-9 text-[13px]"
                  />
                </div>
                <div>
                  <Label className="text-[12px]">Cooldown (minutes)</Label>
                  <Input
                    type="number"
                    value={formData.cooldownMinutes}
                    onChange={(e) => setFormData((p) => ({ ...p, cooldownMinutes: Number(e.target.value) }))}
                    className="h-9 text-[13px]"
                  />
                </div>
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
              <div>
                <p className="text-[13px] font-medium">Active</p>
                <p className="text-[11px] text-[#999999]">Enable this wall to show surveys to users</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, isActive: v }))}
              />
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                className="flex-1 text-white"
                style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                onClick={handleSave}
                disabled={!formData.name || saving}
              >
                {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
                {editWall ? 'Save Changes' : 'Create Wall'}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
