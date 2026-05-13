import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Input } from '@/app/components/ui/Input'
import { whitelabelService } from '@/lib/whitelabel.service'
import { Palette, Globe, FileText } from 'lucide-react'

interface WhitelabelConfigurationProps {
  organizationId: string
  currentRole: 'owner' | 'manager' | 'agent' | 'analyst' | null
}

export default function WhitelabelConfiguration({
  organizationId,
  currentRole,
}: WhitelabelConfigurationProps) {
  const [branding, setBranding] = useState<any>(null)
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const canManage = currentRole === 'owner' || currentRole === 'manager'

  const [formData, setFormData] = useState({
    primary_color: '#3B82F6',
    secondary_color: '#1F2937',
    accent_color: '#10B981',
    custom_domain: '',
    email_from_address: '',
    email_reply_to: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [brandingData, settingsData] = await Promise.all([
        whitelabelService.getBranding(organizationId),
        whitelabelService.getSettings(organizationId)
      ])
      
      setBranding(brandingData)
      setSettings(settingsData)
      setFormData({
        primary_color: brandingData?.primary_color || '#3B82F6',
        secondary_color: brandingData?.secondary_color || '#1F2937',
        accent_color: brandingData?.accent_color || '#10B981',
        custom_domain: brandingData?.custom_domain || '',
        email_from_address: brandingData?.email_from_address || '',
        email_reply_to: brandingData?.email_reply_to || ''
      })
    } catch (error) {
      console.error('Failed to load branding:', error)
      toast.error("We couldn't load white-label settings.")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!canManage) {
      toast.error('Only owners and managers can update branding.')
      return
    }

    setSaving(true)
    try {
      await whitelabelService.updateBranding(organizationId, formData)
      toast.success('Branding updated successfully.')
      await loadData()
    } catch (error) {
      console.error('Failed to save branding:', error)
      toast.error("We couldn't save branding changes.")
    } finally {
      setSaving(false)
    }
  }

  const handleDomainCheck = async () => {
    try {
      const available = await whitelabelService.checkDomainAvailable(formData.custom_domain)
      toast.success(available ? 'Domain is available.' : 'Domain is already taken.')
    } catch (error) {
      console.error('Failed to check domain availability:', error)
      toast.error("We couldn't check domain availability.")
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">White-Label Configuration</h1>
        <p className="text-muted-foreground mt-2">Customize your platform branding and domain</p>
      </div>

      {/* Color Customization */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Palette className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Brand Colors</h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="primary-color-picker" className="text-sm font-medium">Primary Color</label>
            <div className="flex gap-2 mt-2">
              <input
                id="primary-color-picker"
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-12 h-10 rounded border"
                aria-label="Primary color picker"
                title="Primary color picker"
              />
              <Input
                aria-label="Primary color hex value"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                placeholder="#000000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="secondary-color-picker" className="text-sm font-medium">Secondary Color</label>
            <div className="flex gap-2 mt-2">
              <input
                id="secondary-color-picker"
                type="color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="w-12 h-10 rounded border"
                aria-label="Secondary color picker"
                title="Secondary color picker"
              />
              <Input
                aria-label="Secondary color hex value"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                placeholder="#000000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="accent-color-picker" className="text-sm font-medium">Accent Color</label>
            <div className="flex gap-2 mt-2">
              <input
                id="accent-color-picker"
                type="color"
                value={formData.accent_color}
                onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                className="w-12 h-10 rounded border"
                aria-label="Accent color picker"
                title="Accent color picker"
              />
              <Input
                aria-label="Accent color hex value"
                value={formData.accent_color}
                onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                placeholder="#000000"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-3 mt-6 p-4 bg-secondary/50 rounded md:grid-cols-3">
          <div className="rounded border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">Primary</p>
            <p className="mt-1 font-mono text-sm">{formData.primary_color}</p>
          </div>
          <div className="rounded border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">Secondary</p>
            <p className="mt-1 font-mono text-sm">{formData.secondary_color}</p>
          </div>
          <div className="rounded border bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">Accent</p>
            <p className="mt-1 font-mono text-sm">{formData.accent_color}</p>
          </div>
        </div>
      </Card>

      {/* Custom Domain */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Custom Domain</h2>
        </div>

        <div>
          <label className="text-sm font-medium">Domain Name</label>
          <div className="flex gap-2 mt-2">
            <Input
              value={formData.custom_domain}
              onChange={(e) => setFormData({ ...formData, custom_domain: e.target.value })}
              placeholder="properties.yourbrand.com"
              disabled={!canManage}
            />
            <Button variant="outline" onClick={handleDomainCheck} disabled={!canManage}>
              Check Availability
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Your platform will be accessible at this domain after DNS configuration
          </p>
        </div>
      </Card>

      {/* Email Configuration */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Email Configuration</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">From Address</label>
            <Input
              value={formData.email_from_address}
              onChange={(e) => setFormData({ ...formData, email_from_address: e.target.value })}
              placeholder="noreply@yourbrand.com"
              className="mt-2"
              disabled={!canManage}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Reply-To Address</label>
            <Input
              value={formData.email_reply_to}
              onChange={(e) => setFormData({ ...formData, email_reply_to: e.target.value })}
              placeholder="support@yourbrand.com"
              className="mt-2"
              disabled={!canManage}
            />
          </div>
        </div>
      </Card>

      {/* Feature Toggles */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-6">Enabled Features</h2>
        <div className="space-y-3">
          {settings?.enabled_features?.map((feature: string) => (
            <div key={feature} className="flex items-center justify-between p-3 border rounded">
              <span className="font-medium capitalize">{feature}</span>
              <Button size="sm" variant="outline">Manage</Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={saving || !canManage}
          size="lg"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button variant="outline" size="lg" onClick={() => loadData()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
