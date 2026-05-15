'use client'

import { useState } from 'react'
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
  createdAt: string
}

const mockWalls: SurveyWall[] = [
  {
    id: 'wall_1',
    name: 'CPX Research',
    provider: 'cpx-research',
    apiKey: 'cpx_live_abc123',
    apiSecret: 'cpx_secret_xyz789',
    endpointUrl: 'https://api.cpx-research.com/v1',
    isActive: true,
    priority: 10,
    minPayout: 0.10,
    maxPayout: 5.00,
    description: 'CPX Research - High quality surveys with good completion rates',
    blockVpn: true,
    blockProxy: true,
    minFraudScore: 50,
    cooldownMinutes: 5,
    surveysAvailable: 24,
    completions: 1520,
    revenue: 3420.50,
    createdAt: '2024-06-15',
  },
  {
    id: 'wall_2',
    name: 'Bitlabs',
    provider: 'bitlabs',
    apiKey: 'bit_live_def456',
    apiSecret: 'bit_secret_uvW321',
    endpointUrl: 'https://api.bitlabs.com/v2',
    isActive: true,
    priority: 8,
    minPayout: 0.05,
    maxPayout: 3.00,
    description: 'Bitlabs - Wide variety of surveys globally',
    blockVpn: true,
    blockProxy: false,
    minFraudScore: 40,
    cooldownMinutes: 3,
    surveysAvailable: 18,
    completions: 980,
    revenue: 1890.25,
    createdAt: '2024-08-20',
  },
  {
    id: 'wall_3',
    name: 'Inbrain',
    provider: 'inbrain',
    apiKey: 'inb_live_ghi789',
    apiSecret: 'inb_secret_rst654',
    endpointUrl: 'https://api.inbrain.ai/v1',
    isActive: false,
    priority: 5,
    minPayout: 0.20,
    maxPayout: 4.00,
    description: 'Inbrain - Premium market research surveys',
    blockVpn: true,
    blockProxy: true,
    minFraudScore: 60,
    cooldownMinutes: 10,
    surveysAvailable: 0,
    completions: 420,
    revenue: 980.75,
    createdAt: '2024-10-05',
  },
  {
    id: 'wall_4',
    name: 'Revtoo',
    provider: 'revtoo',
    apiKey: '8wq03m1vsqq5xvfq9ejxaxz2v7vfzy',
    apiSecret: null,
    endpointUrl: 'https://revtoo.com/api/offers/',
    isActive: true,
    priority: 15,
    minPayout: 0.05,
    maxPayout: 10.00,
    description: 'Revtoo - Survey provider with offer ID 56443 (Revtoo Surveys). Available worldwide on all platforms.',
    blockVpn: false,
    blockProxy: false,
    minFraudScore: 70,
    cooldownMinutes: 0,
    surveysAvailable: 1,
    completions: 0,
    revenue: 0,
    createdAt: '2025-05-14',
  },
]

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
}

export function AdminSurveyWalls() {
  const [walls, setWalls] = useState(mockWalls)
  const [showForm, setShowForm] = useState(false)
  const [editWall, setEditWall] = useState<SurveyWall | null>(null)
  const [formData, setFormData] = useState(emptyWall)
  const [testing, setTesting] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'fail' | null>>({})

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
    })
    setEditWall(wall)
    setShowForm(true)
  }

  const handleSave = () => {
    if (editWall) {
      setWalls((prev) =>
        prev.map((w) =>
          w.id === editWall.id
            ? { ...w, ...formData }
            : w
        )
      )
    } else {
      const newWall: SurveyWall = {
        id: `wall_${Date.now()}`,
        ...formData,
        surveysAvailable: 0,
        completions: 0,
        revenue: 0,
        createdAt: new Date().toISOString().split('T')[0],
      }
      setWalls((prev) => [...prev, newWall])
    }
    setShowForm(false)
  }

  const toggleActive = (id: string) => {
    setWalls((prev) =>
      prev.map((w) => (w.id === id ? { ...w, isActive: !w.isActive } : w))
    )
  }

  const deleteWall = (id: string) => {
    setWalls((prev) => prev.filter((w) => w.id !== id))
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

              {/* Anti-Fraud */}
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-[#999999]">Fraud threshold:</span>
                <span className="font-medium text-[#1A1A1A]">{wall.minFraudScore}/100</span>
              </div>

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
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-[12px]" onClick={() => toggleActive(wall.id)}>
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
                <DollarSign size={14} className="text-[#10B981]" /> Payout Settings
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
                disabled={!formData.name}
              >
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
