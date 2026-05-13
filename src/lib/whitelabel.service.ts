import { supabase } from './supabase'

export const whitelabelService = {
  // Get organization branding
  async getBranding(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_branding')
      .select('*')
      .eq('organization_id', organizationId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    
    // Return defaults if not found
    return data || {
      primary_color: '#3B82F6',
      secondary_color: '#1F2937',
      accent_color: '#10B981',
      theme_name: 'default'
    }
  },

  // Update organization branding
  async updateBranding(
    organizationId: string,
    branding: Record<string, any>
  ) {
    const { data, error } = await supabase
      .from('organization_branding')
      .upsert({
        organization_id: organizationId,
        ...branding,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id' })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Upload organization logo
  async uploadLogo(organizationId: string, file: File) {
    const fileName = `${organizationId}/logo-${Date.now()}.${file.name.split('.').pop()}`
    
    const { data, error } = await supabase.storage
      .from('organization-assets')
      .upload(fileName, file, { upsert: true })
    
    if (error) throw error
    
    const { data: { publicUrl } } = supabase.storage
      .from('organization-assets')
      .getPublicUrl(data.path)
    
    await this.updateBranding(organizationId, { logo_url: publicUrl })
    return publicUrl
  },

  // Get organization settings
  async getSettings(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    
    // Return defaults if not found
    return data || {
      enabled_features: ['listings', 'messaging', 'analytics'],
      commission_rate: 0,
      sms_notifications_enabled: false,
      email_notifications_enabled: true,
      push_notifications_enabled: true,
      auto_lead_assignment: false
    }
  },

  // Update organization settings
  async updateSettings(
    organizationId: string,
    settings: Record<string, any>
  ) {
    const { data, error } = await supabase
      .from('organization_settings')
      .upsert({
        organization_id: organizationId,
        ...settings,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id' })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Register custom domain
  async registerCustomDomain(organizationId: string, domain: string) {
    // Validate domain format
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(domain)) {
      throw new Error('Invalid domain format')
    }
    
    const { data, error } = await supabase
      .from('organization_branding')
      .update({ custom_domain: domain })
      .eq('organization_id', organizationId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Check if domain is available
  async checkDomainAvailable(domain: string) {
    const { data } = await supabase
      .from('organization_branding')
      .select('organization_id')
      .eq('custom_domain', domain)
      .single()
    
    return !data // Available if no results
  },

  // Enable feature for organization
  async enableFeature(organizationId: string, feature: string) {
    const settings = await this.getSettings(organizationId)
    const features = new Set(settings.enabled_features || [])
    features.add(feature)
    
    return this.updateSettings(organizationId, {
      enabled_features: Array.from(features)
    })
  },

  // Disable feature for organization
  async disableFeature(organizationId: string, feature: string) {
    const settings = await this.getSettings(organizationId)
    const features = new Set(settings.enabled_features || [])
    features.delete(feature)
    
    return this.updateSettings(organizationId, {
      enabled_features: Array.from(features)
    })
  },

  // Get CSS theme for organization
  async getThemeCSS(organizationId: string) {
    const branding = await this.getBranding(organizationId)
    
    return `
      :root {
        --primary-color: ${branding.primary_color};
        --secondary-color: ${branding.secondary_color};
        --accent-color: ${branding.accent_color};
      }
      ${branding.custom_css || ''}
    `
  },

  // Apply white-label theme
  async applyTheme(organizationId: string) {
    const css = await this.getThemeCSS(organizationId)
    
    // Inject CSS into page
    const style = document.createElement('style')
    style.innerHTML = css
    style.id = `theme-${organizationId}`
    document.head.appendChild(style)
  }
}
