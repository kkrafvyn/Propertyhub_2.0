import { supabase } from './supabase'
import type { Database } from './database.types'

type Organization = Database['public']['Tables']['organizations']['Row']
type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']
type InvitationRole = Database['public']['Tables']['organization_invitations']['Row']['role']
type InvitationStatus = Database['public']['Tables']['organization_invitations']['Row']['status']

export const organizationService = {
  async getOrganizationBySlug(slug: string) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single()

    if (error) throw error
    return data
  },

  async getOrganizationById(id: string) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async getVerifiedOrganizations(limit = 20) {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('verified', true)
      .eq('suspended', false)
      .limit(limit)

    if (error) throw error
    return data
  },

  async getUserOrganizations(userId: string) {
    const { data, error } = await supabase
      .from('organization_members')
      .select('organization:organizations(*), role')
      .eq('user_id', userId)

    if (error) throw error
    return data
  },

  async createOrganization(org: OrganizationInsert) {
    const { data, error } = await supabase
      .from('organizations')
      .insert(org)
      .select()

    if (error) throw error

    // Add creator as owner
    if (data[0]) {
      await supabase.from('organization_members').insert({
        organization_id: data[0].id,
        user_id: org.owner_id!,
        role: 'owner',
      })
    }

    return data[0]
  },

  async updateOrganization(id: string, updates: OrganizationUpdate) {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()

    if (error) throw error
    return data[0]
  },

  async getOrganizationMembers(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_members')
      .select('*, user:users(id, email, full_name, avatar_url)')
      .eq('organization_id', organizationId)

    if (error) throw error
    return data
  },

  async addMember(
    organizationId: string,
    userId: string,
    role: 'manager' | 'agent' | 'analyst'
  ) {
    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role,
      })
      .select()

    if (error) throw error
    return data[0]
  },

  async removeMember(organizationId: string, userId: string) {
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId)

    if (error) throw error
  },

  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: 'owner' | 'manager' | 'agent' | 'analyst'
  ) {
    const { data, error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()

    if (error) throw error
    return data[0]
  },

  async getOrganizationInvitations(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_invitations')
      .select(
        `
        *,
        organization:organizations(id, name, slug),
        inviter:users!organization_invitations_invited_by_fkey(id, email, full_name),
        accepted_user:users!organization_invitations_accepted_user_id_fkey(id, email, full_name)
      `
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getInvitationById(invitationId: string) {
    const { data, error } = await supabase
      .from('organization_invitations')
      .select(
        `
        *,
        organization:organizations(id, name, slug),
        inviter:users!organization_invitations_invited_by_fkey(id, email, full_name),
        accepted_user:users!organization_invitations_accepted_user_id_fkey(id, email, full_name)
      `
      )
      .eq('id', invitationId)
      .single()

    if (error) throw error
    return data
  },

  async sendInvitation(params: {
    organizationId: string
    email: string
    role: InvitationRole
    appUrl?: string
  }) {
    const { data, error } = await supabase.functions.invoke('send-organization-invite', {
      body: {
        organizationId: params.organizationId,
        email: params.email.trim().toLowerCase(),
        role: params.role,
        appUrl: params.appUrl,
      },
    })

    if (error) throw error
    return data as {
      invitation: any
      delivery: 'sent' | 'manual_sign_in_required'
      redirectTo: string
    }
  },

  async updateInvitationStatus(invitationId: string, status: InvitationStatus) {
    const { data, error } = await supabase
      .from('organization_invitations')
      .update({ status })
      .eq('id', invitationId)
      .select()

    if (error) throw error
    return data[0]
  },

  async cancelInvitation(invitationId: string) {
    return this.updateInvitationStatus(invitationId, 'revoked')
  },

  async acceptInvitation(invitationId: string) {
    const { data, error } = await supabase.rpc('accept_organization_invitation', {
      invitation_id: invitationId,
    })

    if (error) throw error

    const responseRow = Array.isArray(data) ? data[0] : data
    return responseRow as {
      organization_id: string
      organization_slug: string
    }
  },
}
