'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  emailTemplateCashoutApproved: `Hi {name},\n\nYour cashout of ${'{amount}'} has been approved and will be processed shortly.\n\nThank you for using XoXoSurveys!\n\nBest regards,\nXoXoSurveys Team`,
  emailTemplateCashoutRejected: `Hi {name},\n\nYour cashout request of ${'{amount}'} has been rejected. Reason: {reason}.\n\nIf you believe this is an error, please contact our support team.\n\nBest regards,\nXoXoSurveys Team`,
  emailTemplateFraudWarning: `Hi {name},\n\nWe have detected suspicious activity on your account. Please verify your identity to continue using XoXoSurveys.\n\nIf you did not initiate this activity, please contact support immediately.\n\nBest regards,\nXoXoSurveys Team`,
  emailTemplateWelcome: `Hi {name},\n\nWelcome to XoXoSurveys! Start earning money by completing surveys.\n\nHere's what you can do:\n- Complete surveys and earn rewards\n- Invite friends and earn 10% bonus\n- Cash out via PayPal, Amazon, and more\n\nBest regards,\nXoXoSurveys Team`,
}

export function AdminSettings() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings)
  const [saved, setSaved] = useState(false)

  const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleReset = () => {
    setSettings(defaultSettings)
    setSaved(false)
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
            >
              <Save size={14} className="mr-1" /> Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
