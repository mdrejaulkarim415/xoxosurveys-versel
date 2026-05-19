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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ClipboardList,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react'

interface Survey {
  id: string
  wallId: string
  externalId: string | null
  title: string
  description: string | null
  timeMinutes: number
  reward: number
  rating: number
  available: number
  category: string | null
  country: string | null
  language: string | null
  maxCompletions: number
  currentCompletions: number
  isActive: boolean
  startsAt: string | null
  expiresAt: string | null
  createdAt: string
  wall?: { id: string; name: string; provider: string } | null
}

interface SurveyStats {
  activeSurveys: number
  totalCompletions: number
  avgCompletionRate: number
}

const emptySurvey: Omit<Survey, 'id' | 'createdAt' | 'wall' | 'currentCompletions'> = {
  wallId: '',
  externalId: '',
  title: '',
  description: '',
  timeMinutes: 10,
  reward: 0.5,
  rating: 5.0,
  available: 1,
  category: '',
  country: '',
  language: '',
  maxCompletions: -1,
  isActive: true,
  startsAt: null,
  expiresAt: null,
}

export function AdminSurveys() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [stats, setStats] = useState<SurveyStats>({ activeSurveys: 0, totalCompletions: 0, avgCompletionRate: 0 })
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [wallIdFilter, setWallIdFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editSurvey, setEditSurvey] = useState<Survey | null>(null)
  const [formData, setFormData] = useState(emptySurvey)
  const [saving, setSaving] = useState(false)
  const [walls, setWalls] = useState<{ id: string; name: string }[]>([])

  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (wallIdFilter && wallIdFilter !== 'all') params.set('wallId', wallIdFilter)
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/admin/surveys?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setSurveys(data.surveys || [])
        setTotal(data.total || 0)

        // Compute stats from the data
        const activeCount = (data.surveys || []).filter((s: Survey) => s.isActive).length
        const totalCompletions = (data.surveys || []).reduce((sum: number, s: Survey) => sum + s.currentCompletions, 0)
        const withMax = (data.surveys || []).filter((s: Survey) => s.maxCompletions > 0)
        const avgRate = withMax.length > 0
          ? withMax.reduce((sum: number, s: Survey) => sum + (s.maxCompletions > 0 ? (s.currentCompletions / s.maxCompletions) * 100 : 0), 0) / withMax.length
          : 0
        setStats({
          activeSurveys: activeCount,
          totalCompletions,
          avgCompletionRate: Math.round(avgRate * 10) / 10,
        })
      }
    } catch (err) {
      console.error('Failed to fetch surveys:', err)
    } finally {
      setLoading(false)
    }
  }, [page, limit, wallIdFilter, statusFilter, searchQuery])

  const fetchWalls = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/survey-walls')
      if (res.ok) {
        const data = await res.json()
        setWalls(Array.isArray(data) ? data.map((w: { id: string; name: string }) => ({ id: w.id, name: w.name })) : [])
      }
    } catch (err) {
      console.error('Failed to fetch walls:', err)
    }
  }, [])

  useEffect(() => {
    fetchWalls()
  }, [fetchWalls])

  useEffect(() => {
    fetchSurveys()
  }, [fetchSurveys])

  const openCreate = () => {
    setFormData(emptySurvey)
    setEditSurvey(null)
    setShowForm(true)
  }

  const openEdit = (survey: Survey) => {
    setFormData({
      wallId: survey.wallId,
      externalId: survey.externalId || '',
      title: survey.title,
      description: survey.description || '',
      timeMinutes: survey.timeMinutes,
      reward: survey.reward,
      rating: survey.rating,
      available: survey.available,
      category: survey.category || '',
      country: survey.country || '',
      language: survey.language || '',
      maxCompletions: survey.maxCompletions,
      isActive: survey.isActive,
      startsAt: survey.startsAt,
      expiresAt: survey.expiresAt,
    })
    setEditSurvey(survey)
    setShowForm(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const payload = {
        ...formData,
        description: formData.description || null,
        externalId: formData.externalId || null,
        category: formData.category || null,
        country: formData.country || null,
        language: formData.language || null,
        startsAt: formData.startsAt || null,
        expiresAt: formData.expiresAt || null,
      }

      if (editSurvey) {
        const res = await fetch(`/api/admin/surveys/${editSurvey.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update survey')
      } else {
        const res = await fetch('/api/admin/surveys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to create survey')
      }
      setShowForm(false)
      await fetchSurveys()
    } catch (err) {
      console.error('Save survey error:', err)
    } finally {
      setSaving(false)
    }
  }

  const deleteSurvey = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/surveys/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete survey')
      await fetchSurveys()
    } catch (err) {
      console.error('Delete survey error:', err)
    }
  }

  const toggleActive = async (survey: Survey) => {
    try {
      const res = await fetch(`/api/admin/surveys/${survey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !survey.isActive }),
      })
      if (!res.ok) throw new Error('Failed to toggle survey')
      await fetchSurveys()
    } catch (err) {
      console.error('Toggle survey error:', err)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
          Surveys Management
        </h2>
        <Button
          className="text-white text-[14px]"
          style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
          onClick={openCreate}
        >
          <Plus size={16} className="mr-1" /> Add Survey
        </Button>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#F0FDF4] rounded-[10px] p-4">
            <p className="text-[12px] text-[#16A34A] font-semibold mb-1">Active Surveys</p>
            <p className="text-[28px] font-bold text-[#1A1A1A]">{stats.activeSurveys.toLocaleString()}</p>
          </div>
          <div className="bg-[#EFF6FF] rounded-[10px] p-4">
            <p className="text-[12px] text-[#2563EB] font-semibold mb-1">Total Completions</p>
            <p className="text-[28px] font-bold text-[#1A1A1A]">{stats.totalCompletions.toLocaleString()}</p>
          </div>
          <div className="bg-[#FFF7ED] rounded-[10px] p-4">
            <p className="text-[12px] text-[#D97706] font-semibold mb-1">Avg. Completion Rate</p>
            <p className="text-[28px] font-bold text-[#1A1A1A]">{stats.avgCompletionRate}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]" />
            <Input
              placeholder="Search surveys..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
              className="h-9 text-[13px] pl-9"
            />
          </div>
          <Select value={wallIdFilter} onValueChange={(v) => { setWallIdFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[180px] h-9 text-[13px]">
              <SelectValue placeholder="All Walls" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Walls</SelectItem>
              {walls.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[130px] h-9 text-[13px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#2DD9B6]" />
          </div>
        ) : surveys.length === 0 ? (
          <div className="text-center py-12 text-[#999999]">
            <ClipboardList size={40} className="mx-auto text-[#D1D5DB] mb-3" />
            <p className="text-[16px]">No surveys found</p>
            <p className="text-[14px] mt-2">Create your first survey or adjust filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#E5E7EB]">
                    <TableHead className="text-[12px] text-[#999999]">Title</TableHead>
                    <TableHead className="text-[12px] text-[#999999]">Wall</TableHead>
                    <TableHead className="text-[12px] text-[#999999]">Reward</TableHead>
                    <TableHead className="text-[12px] text-[#999999]">Time</TableHead>
                    <TableHead className="text-[12px] text-[#999999]">Completions</TableHead>
                    <TableHead className="text-[12px] text-[#999999]">Status</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {surveys.map((survey) => (
                    <TableRow key={survey.id} className={`border-b border-[#F0F2F5] hover:bg-[#FAFAFA] ${!survey.isActive ? 'opacity-60' : ''}`}>
                      <TableCell>
                        <div>
                          <p className="text-[13px] font-medium text-[#1A1A1A]">{survey.title}</p>
                          {survey.category && <p className="text-[11px] text-[#999999]">{survey.category}</p>}
                        </div>
                      </TableCell>
                      <TableCell className="text-[12px] text-[#555555]">{survey.wall?.name || '—'}</TableCell>
                      <TableCell className="text-[13px] font-medium text-[#2DD9B6]">${survey.reward.toFixed(2)}</TableCell>
                      <TableCell className="text-[12px] text-[#555555]">{survey.timeMinutes} min</TableCell>
                      <TableCell className="text-[12px] text-[#555555]">{survey.currentCompletions}{survey.maxCompletions > 0 ? `/${survey.maxCompletions}` : ''}</TableCell>
                      <TableCell>
                        <Badge className={survey.isActive ? 'bg-[#ECFDF5] text-[#10B981] hover:bg-[#ECFDF5]' : 'bg-[#F5F5F5] text-[#999999] hover:bg-[#F5F5F5]'}>
                          {survey.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleActive(survey)}>
                            {survey.isActive ? <XCircle size={14} className="text-[#999999]" /> : <CheckCircle size={14} className="text-[#10B981]" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(survey)}>
                            <Edit size={14} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-[#EF4444]" onClick={() => deleteSurvey(survey.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E5E7EB]">
                <p className="text-[12px] text-[#999999]">
                  Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft size={14} />
                  </Button>
                  <span className="text-[12px] text-[#555555]">Page {page} of {totalPages}</span>
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[18px] font-bold" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
              {editSurvey ? 'Edit Survey' : 'Add Survey'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Survey Wall</Label>
                <Select value={formData.wallId} onValueChange={(v) => setFormData((p) => ({ ...p, wallId: v }))}>
                  <SelectTrigger className="h-9 text-[13px]">
                    <SelectValue placeholder="Select wall" />
                  </SelectTrigger>
                  <SelectContent>
                    {walls.map((w) => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[12px]">Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Survey title"
                  className="h-9 text-[13px]"
                />
              </div>
            </div>

            <div>
              <Label className="text-[12px]">Description</Label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description"
                className="h-9 text-[13px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-[12px]">Reward ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.reward}
                  onChange={(e) => setFormData((p) => ({ ...p, reward: Number(e.target.value) }))}
                  className="h-9 text-[13px]"
                />
              </div>
              <div>
                <Label className="text-[12px]">Time (min)</Label>
                <Input
                  type="number"
                  value={formData.timeMinutes}
                  onChange={(e) => setFormData((p) => ({ ...p, timeMinutes: Number(e.target.value) }))}
                  className="h-9 text-[13px]"
                />
              </div>
              <div>
                <Label className="text-[12px]">Max Completions</Label>
                <Input
                  type="number"
                  value={formData.maxCompletions}
                  onChange={(e) => setFormData((p) => ({ ...p, maxCompletions: Number(e.target.value) }))}
                  className="h-9 text-[13px]"
                  placeholder="-1 = unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[12px]">Category</Label>
                <Input
                  value={formData.category || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                  placeholder="e.g. Technology"
                  className="h-9 text-[13px]"
                />
              </div>
              <div>
                <Label className="text-[12px]">Country</Label>
                <Input
                  value={formData.country || ''}
                  onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                  placeholder="e.g. US"
                  className="h-9 text-[13px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
              <div>
                <p className="text-[13px] font-medium">Active</p>
                <p className="text-[11px] text-[#999999]">Make this survey available to users</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, isActive: v }))}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                className="flex-1 text-white"
                style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
                onClick={handleSave}
                disabled={!formData.title || !formData.wallId || saving}
              >
                {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : null}
                {editSurvey ? 'Save Changes' : 'Create Survey'}
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
