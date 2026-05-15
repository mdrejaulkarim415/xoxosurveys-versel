'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Settings,
  Shield,
  DollarSign,
  Mail,
  Save,
  RotateCcw,
  Globe,
  Clock,
  AlertTriangle,
  LayoutGrid,
  Loader2,
  Star,
} from 'lucide-react'

interface SettingsState {
  siteName: string
  minCashout: number
  referralBonusPercent: number
  vpnBlockThreshold: number
  completionSpeedThreshold: number
  fraudScoreBlockThreshold: number
  autoBlockVpn: boolean
  autoBlockProxy: boolean
  autoBlockTor: boolean
  autoFlagFastCompletion: boolean
  defaultBlockVpn: boolean
  defaultBlockProxy: boolean
  defaultMinFraudScore: number
  defaultCooldown: number
  featuredOfferEnabled: boolean
  featuredOfferTitle: string
  featuredOfferDescription: string
  featuredOfferBadge: string
  featuredOfferId: number
  featuredOfferTime: string
  featuredOfferPayout: string
  featuredOfferApiKey: string
  featuredOfferApiUrl: string
  featuredOfferApiSecret: string
  emailTemplateCashoutApproved: string
  emailTemplateCashoutRejected: string
  emailTemplateFraudWarning: string
  emailTemplateWelcome: string
}

const defaultSettings: SettingsState = {
  siteName: 'XoXoSurveys',
  minCashout: 5.00,
  referralBonusPercent: 10,
  vpnBlockThreshold: 70,
  completionSpeedThreshold: 0.3,
  fraudScoreBlockThreshold: 50,
  autoBlockVpn: true,
  autoBlockProxy: true,
  autoBlockTor: true,
  autoFlagFastCompletion: true,
  defaultBlockVpn: true,
  defaultBlockProxy: true,
  defaultMinFraudScore: 50,
  defaultCooldown: 5,
  featuredOfferEnabled: true,
  featuredOfferTitle: '',
  featuredOfferDescription: '',
  featuredOfferBadge: 'Featured',
  featuredOfferId: 56443,
  featuredOfferTime: '5-20 Min',
  featuredOfferPayout: '',
  featuredOfferApiKey: '',
  featuredOfferApiUrl: '',
  featuredOfferApiSecret: '',
  emailTemplateCashoutApproved: `Hi {name},\n\nYour cashout of {amount} has been approved and will be processed shortly.\n\nThank you for using XoXoSurveys!\n\nBest regards,\nXoXoSurveys Team`,
  emailTemplateCashoutRejected: `Hi {name},\n\nYour cashout request of {amount} has been rejected. Reason: {reason}.\n\nIf you believe this is an error, please contact our support team.\n\nBest regards,\nXoXoSurveys Team`,
  emailTemplateFraudWarning: `Hi {name},\n\nWe have detected suspicious activity on your account. Please verify your identity to continue using XoXoSurveys.\n\nIf you did not initiate this activity, please contact support immediately.\n\nBest regards,\nXoXoSurveys Team`,
  emailTemplateWelcome: `Hi {name},\n\nWelcome to XoXoSurveys! Start earning money by completing surveys.\n\nHere's what you can do:\n- Complete surveys and earn rewards\n- Invite friends and earn 10% bonus\n- Cash out via PayPal, Amazon, and more\n\nBest regards,\nXoXoSurveys Team`,
}

function parseSettingsFromApi(apiData: Record<string, string>): SettingsState {
  const parsed = { ...defaultSettings }
  for (const [key, value] of Object.entries(apiData)) {
    if (key in parsed) {
      const currentValue = parsed[key as keyof SettingsState]
      if (typeof currentValue === 'boolean') {
        ;(parsed as Record<string, unknown>)[key] = value === 'true'
      } else if (typeof currentValue === 'number') {
        ;(parsed as Record<string, unknown>)[key] = Number(value)
      } else {
        ;(parsed as Record<string, unknown>)[key] = value
      }
    }
  }
  return parsed
}

export function AdminSettings() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          setSettings(parseSettingsFromApi(data as Record<string, string>))
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('Failed to save settings')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Save settings error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setSettings(defaultSettings)
    setSaved(false)
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
      <Tabs defaultValue="general">
        <TabsList className="bg-white border border-[#E5E7EB]">
          <TabsTrigger value="general" className="text-[13px]">
            <Settings size={14} className="mr-1" /> General
          </TabsTrigger>
          <TabsTrigger value="antifraud" className="text-[13px]">
            <Shield size={14} className="mr-1" /> Anti-Fraud
          </TabsTrigger>
          <TabsTrigger value="surveydefaults" className="text-[13px]">
            <LayoutGrid size={14} className="mr-1" /> Survey Wall Defaults
          </TabsTrigger>
          <TabsTrigger value="emails" className="text-[13px]">
            <Mail size={14} className="mr-1" /> Email Templates
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[16px] font-bold text-[#1A1A1A] flex items-center gap-2" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                <Globe size={18} className="text-[#2DD9B6]" /> General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-[13px] font-medium">Site Name</Label>
                <Input
                  value={settings.siteName}
                  onChange={(e) => updateSetting('siteName', e.target.value)}
                  className="h-9 text-[13px] mt-1.5 max-w-[300px]"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium">Minimum Cashout Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.minCashout}
                  onChange={(e) => updateSetting('minCashout', Number(e.target.value))}
                  className="h-9 text-[13px] mt-1.5 max-w-[200px]"
                />
                <p className="text-[11px] text-[#999999] mt-1">Minimum amount required before users can request a cashout</p>
              </div>
              <div>
                <Label className="text-[13px] font-medium">Referral Bonus (%)</Label>
                <Input
                  type="number"
                  value={settings.referralBonusPercent}
                  onChange={(e) => updateSetting('referralBonusPercent', Number(e.target.value))}
                  className="h-9 text-[13px] mt-1.5 max-w-[200px]"
                />
                <p className="text-[11px] text-[#999999] mt-1">Percentage of referral earnings that the referrer receives</p>
              </div>

              {/* Featured Offer Section */}
              <div className="border-t border-[#E5E7EB] pt-5">
                <h4 className="text-[13px] font-bold text-[#1A1A1A] flex items-center gap-2 mb-3">
                  <Star size={14} className="text-[#0FBCC0]" /> Featured Offer
                </h4>

                {/* Toggle */}
                <div className="flex items-center justify-between p-3 bg-[#F0FDFB] rounded-[8px] border border-[#0FBCC0]/20 mb-3">
                  <div>
                    <p className="text-[13px] font-medium text-[#065F46]">Show Featured Offer</p>
                    <p className="text-[11px] text-[#047857]">
                      {settings.featuredOfferEnabled
                        ? 'Featured offer is visible to users'
                        : 'Featured offer is hidden from users'
                      }
                    </p>
                  </div>
                  <Switch
                    checked={settings.featuredOfferEnabled}
                    onCheckedChange={(v) => updateSetting('featuredOfferEnabled', v)}
                  />
                </div>

                {/* Customization Fields */}
                {settings.featuredOfferEnabled && (
                  <div className="space-y-3 pl-1">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[12px] font-medium">Custom Title</Label>
                        <Input
                          value={settings.featuredOfferTitle}
                          onChange={(e) => updateSetting('featuredOfferTitle', e.target.value)}
                          placeholder="Leave empty to use API title"
                          className="h-9 text-[13px] mt-1"
                        />
                        <p className="text-[10px] text-[#999999] mt-0.5">Override the offer title shown to users</p>
                      </div>
                      <div>
                        <Label className="text-[12px] font-medium">Badge Text</Label>
                        <Input
                          value={settings.featuredOfferBadge}
                          onChange={(e) => updateSetting('featuredOfferBadge', e.target.value)}
                          placeholder="Featured"
                          className="h-9 text-[13px] mt-1 max-w-[140px]"
                        />
                        <p className="text-[10px] text-[#999999] mt-0.5">Badge label (e.g. Featured, Hot, New)</p>
                      </div>
                    </div>
                    <div>
                      <Label className="text-[12px] font-medium">Custom Description</Label>
                      <Input
                        value={settings.featuredOfferDescription}
                        onChange={(e) => updateSetting('featuredOfferDescription', e.target.value)}
                        placeholder="Leave empty to use API description"
                        className="h-9 text-[13px] mt-1"
                      />
                      <p className="text-[10px] text-[#999999] mt-0.5">Override the offer description</p>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[12px] font-medium">Offer ID</Label>
                        <Input
                          type="number"
                          value={settings.featuredOfferId}
                          onChange={(e) => updateSetting('featuredOfferId', Number(e.target.value))}
                          className="h-9 text-[13px] mt-1"
                        />
                        <p className="text-[10px] text-[#999999] mt-0.5">RevToo offer ID</p>
                      </div>
                      <div>
                        <Label className="text-[12px] font-medium">Est. Time</Label>
                        <Input
                          value={settings.featuredOfferTime}
                          onChange={(e) => updateSetting('featuredOfferTime', e.target.value)}
                          placeholder="5-20 Min"
                          className="h-9 text-[13px] mt-1"
                        />
                        <p className="text-[10px] text-[#999999] mt-0.5">Estimated completion time</p>
                      </div>
                      <div>
                        <Label className="text-[12px] font-medium">Payout Text</Label>
                        <Input
                          value={settings.featuredOfferPayout}
                          onChange={(e) => updateSetting('featuredOfferPayout', e.target.value)}
                          placeholder="Leave empty for API value"
                          className="h-9 text-[13px] mt-1"
                        />
                        <p className="text-[10px] text-[#999999] mt-0.5">e.g. Up to $5.00</p>
                      </div>
                    </div>

                    {/* API Configuration */}
                    <div className="border-t border-[#E5E7EB] pt-3 mt-3">
                      <h5 className="text-[12px] font-bold text-[#1A1A1A] flex items-center gap-1.5 mb-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        API Configuration
                      </h5>
                      <div>
                        <Label className="text-[12px] font-medium">API URL</Label>
                        <Input
                          value={settings.featuredOfferApiUrl}
                          onChange={(e) => updateSetting('featuredOfferApiUrl', e.target.value)}
                          placeholder="https://revtoo.com/api/offers/"
                          className="h-9 text-[13px] mt-1"
                        />
                        <p className="text-[10px] text-[#999999] mt-0.5">Leave empty to use default RevToo URL</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <Label className="text-[12px] font-medium">API Key</Label>
                          <Input
                            value={settings.featuredOfferApiKey}
                            onChange={(e) => updateSetting('featuredOfferApiKey', e.target.value)}
                            placeholder="Enter API key"
                            className="h-9 text-[13px] mt-1"
                            type="password"
                          />
                          <p className="text-[10px] text-[#999999] mt-0.5">RevToo API key</p>
                        </div>
                        <div>
                          <Label className="text-[12px] font-medium">API Secret</Label>
                          <Input
                            value={settings.featuredOfferApiSecret}
                            onChange={(e) => updateSetting('featuredOfferApiSecret', e.target.value)}
                            placeholder="Enter API secret"
                            className="h-9 text-[13px] mt-1"
                            type="password"
                          />
                          <p className="text-[10px] text-[#999999] mt-0.5">RevToo API secret (optional)</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Survey Provider Management Note */}
              <div className="pt-3">
                <div className="flex items-center justify-between p-3 bg-[#F0FDFB] rounded-[8px] border border-[#0FBCC0]/20">
                  <div>
                    <p className="text-[13px] font-medium text-[#065F46] flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0FBCC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                      Survey Provider Management
                    </p>
                    <p className="text-[11px] text-[#047857]">Manage API keys, URLs & advanced settings from the Survey Walls page</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anti-Fraud Settings */}
        <TabsContent value="antifraud">
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[16px] font-bold text-[#1A1A1A] flex items-center gap-2" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                <Shield size={18} className="text-[#EF4444]" /> Anti-Fraud Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-[13px] font-medium flex items-center gap-2">
                    <AlertTriangle size={14} className="text-[#F59E0B]" /> VPN Block Threshold
                  </Label>
                  <Input
                    type="number"
                    value={settings.vpnBlockThreshold}
                    onChange={(e) => updateSetting('vpnBlockThreshold', Number(e.target.value))}
                    className="h-9 text-[13px] mt-1.5"
                  />
                  <p className="text-[11px] text-[#999999] mt-1">Confidence threshold (0-100) for blocking VPN connections</p>
                </div>
                <div>
                  <Label className="text-[13px] font-medium flex items-center gap-2">
                    <Clock size={14} className="text-[#22B9CF]" /> Completion Speed Threshold
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={settings.completionSpeedThreshold}
                    onChange={(e) => updateSetting('completionSpeedThreshold', Number(e.target.value))}
                    className="h-9 text-[13px] mt-1.5"
                  />
                  <p className="text-[11px] text-[#999999] mt-1">Ratio below which completions are flagged as suspicious (e.g. 0.3 = completed in &lt;30% of expected time)</p>
                </div>
                <div>
                  <Label className="text-[13px] font-medium flex items-center gap-2">
                    <Shield size={14} className="text-[#EF4444]" /> Fraud Score Block Threshold
                  </Label>
                  <Input
                    type="number"
                    value={settings.fraudScoreBlockThreshold}
                    onChange={(e) => updateSetting('fraudScoreBlockThreshold', Number(e.target.value))}
                    className="h-9 text-[13px] mt-1.5"
                  />
                  <p className="text-[11px] text-[#999999] mt-1">Users above this fraud score are automatically blocked</p>
                </div>
              </div>

              <div className="border-t border-[#E5E7EB] pt-5">
                <h4 className="text-[13px] font-bold text-[#1A1A1A] mb-3">Automatic Actions</h4>
                <div className="space-y-3">
                  {[
                    { key: 'autoBlockVpn' as const, label: 'Auto-block VPN connections', desc: 'Automatically block users connecting through VPN' },
                    { key: 'autoBlockProxy' as const, label: 'Auto-block Proxy connections', desc: 'Automatically block users connecting through proxy servers' },
                    { key: 'autoBlockTor' as const, label: 'Auto-block Tor connections', desc: 'Automatically block users connecting through Tor network' },
                    { key: 'autoFlagFastCompletion' as const, label: 'Auto-flag fast completions', desc: 'Automatically flag surveys completed suspiciously fast' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
                      <div>
                        <p className="text-[13px] font-medium text-[#1A1A1A]">{item.label}</p>
                        <p className="text-[11px] text-[#999999]">{item.desc}</p>
                      </div>
                      <Switch
                        checked={settings[item.key]}
                        onCheckedChange={(v) => updateSetting(item.key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Survey Wall Defaults */}
        <TabsContent value="surveydefaults">
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[16px] font-bold text-[#1A1A1A] flex items-center gap-2" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                <LayoutGrid size={18} className="text-[#22B9CF]" /> Survey Wall Default Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-[13px] text-[#999999]">These settings are applied by default when creating new survey walls. Individual walls can override these.</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
                  <div>
                    <p className="text-[13px] font-medium text-[#1A1A1A]">Block VPN by Default</p>
                    <p className="text-[11px] text-[#999999]">New survey walls will block VPN users</p>
                  </div>
                  <Switch checked={settings.defaultBlockVpn} onCheckedChange={(v) => updateSetting('defaultBlockVpn', v)} />
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F8FAFB] rounded-[8px]">
                  <div>
                    <p className="text-[13px] font-medium text-[#1A1A1A]">Block Proxy by Default</p>
                    <p className="text-[11px] text-[#999999]">New survey walls will block proxy users</p>
                  </div>
                  <Switch checked={settings.defaultBlockProxy} onCheckedChange={(v) => updateSetting('defaultBlockProxy', v)} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-[13px] font-medium">Default Min Fraud Score</Label>
                  <Input
                    type="number"
                    value={settings.defaultMinFraudScore}
                    onChange={(e) => updateSetting('defaultMinFraudScore', Number(e.target.value))}
                    className="h-9 text-[13px] mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-[13px] font-medium">Default Cooldown (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.defaultCooldown}
                    onChange={(e) => updateSetting('defaultCooldown', Number(e.target.value))}
                    className="h-9 text-[13px] mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates */}
        <TabsContent value="emails">
          <Card className="border-[#E5E7EB] shadow-sm">
            <CardHeader>
              <CardTitle className="text-[16px] font-bold text-[#1A1A1A] flex items-center gap-2" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
                <Mail size={18} className="text-[#2DD9B6]" /> Email Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-[12px] text-[#999999]">Available variables: {'{name}'}, {'{amount}'}, {'{reason}'}, {'{site_name}'}</p>
              <div>
                <Label className="text-[13px] font-medium text-[#10B981]">Cashout Approved</Label>
                <Textarea
                  value={settings.emailTemplateCashoutApproved}
                  onChange={(e) => updateSetting('emailTemplateCashoutApproved', e.target.value)}
                  className="mt-1.5 text-[13px] min-h-[120px] font-mono"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium text-[#EF4444]">Cashout Rejected</Label>
                <Textarea
                  value={settings.emailTemplateCashoutRejected}
                  onChange={(e) => updateSetting('emailTemplateCashoutRejected', e.target.value)}
                  className="mt-1.5 text-[13px] min-h-[120px] font-mono"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium text-[#F59E0B]">Fraud Warning</Label>
                <Textarea
                  value={settings.emailTemplateFraudWarning}
                  onChange={(e) => updateSetting('emailTemplateFraudWarning', e.target.value)}
                  className="mt-1.5 text-[13px] min-h-[120px] font-mono"
                />
              </div>
              <div>
                <Label className="text-[13px] font-medium text-[#2DD9B6]">Welcome Email</Label>
                <Textarea
                  value={settings.emailTemplateWelcome}
                  onChange={(e) => updateSetting('emailTemplateWelcome', e.target.value)}
                  className="mt-1.5 text-[13px] min-h-[120px] font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save / Reset */}
      <Card className="border-[#E5E7EB] shadow-sm">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {saved && (
              <Badge className="bg-[#ECFDF5] text-[#10B981]">
                <Save size={12} className="mr-1" /> Settings saved successfully
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="text-[13px]" onClick={handleReset}>
              <RotateCcw size={14} className="mr-1" /> Reset to Defaults
            </Button>
            <Button
              className="text-white text-[13px]"
              style={{ background: 'linear-gradient(270deg, #2DD9B6 19.17%, #22B9CF 86.28%)' }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
