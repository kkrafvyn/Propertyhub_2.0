import {
  buildTemplateCustomization,
  resolveTemplatePack,
} from "./workspace-template-packs";
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

  /** Public discovery excludes incomplete setup and personal owner workspaces. */
  async getVerifiedAgencies(limit = 20) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id,name,slug,logo_url')
      .eq('verified', true)
      .eq('suspended', false)
      .eq('company_setup_completed', true)
      .eq('workspace_kind', 'company')
      .contains('business_types', ['agency_brokerage'])
      .limit(limit)
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
      .select('organization:organizations(*), role, permissions, department_id')
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
      .select('*, user:users!organization_members_user_id_fkey(id, email, full_name, avatar_url), department:organization_departments(id, department_key, name)')
      .eq('organization_id', organizationId)

    if (error) throw error
    return data
  },

  async getOrganizationDepartments(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_departments')
      .select('*, head:users!organization_departments_head_user_id_fkey(id, email, full_name)')
      .eq('organization_id', organizationId)
      .order('name')

    if (error) throw error
    return (data || []).map((row) => {
      const head = Array.isArray(row.head) ? row.head[0] : row.head
      return { ...row, head: head ?? null }
    })
  },

  async setDepartmentHead(
    organizationId: string,
    departmentId: string,
    headUserId: string | null,
  ) {
    const { data, error } = await supabase
      .from('organization_departments')
      .update({ head_user_id: headUserId })
      .eq('id', departmentId)
      .eq('organization_id', organizationId)
      .select('*, head:users!organization_departments_head_user_id_fkey(id, email, full_name)')
      .single()

    if (error) throw error
    const head = Array.isArray(data.head) ? data.head[0] : data.head
    return { ...data, head: head ?? null }
  },

  async completeCompanySetup(params: {
    organizationId: string
    businessTypes: string[]
    enabledCapabilities: string[]
    departments: Array<{ department_key: string; name: string }>
    setupMetadata?: Record<string, unknown>
    initialUnits?: Array<{ name: string; unitType?: string; code?: string | null }>
  }) {
    const { data: departments, error: departmentError } = await supabase
      .from('organization_departments')
      .upsert(
        params.departments.map((department) => ({
          organization_id: params.organizationId,
          department_key: department.department_key,
          name: department.name,
        })),
        { onConflict: 'organization_id,department_key' },
      )
      .select()

    if (departmentError) throw departmentError

    const { data: existingOrg, error: existingOrgError } = await supabase
      .from("organizations")
      .select("workspace_kind")
      .eq("id", params.organizationId)
      .single();

    if (existingOrgError) throw existingOrgError;

    const pack = resolveTemplatePack({
      workspaceKind: existingOrg?.workspace_kind,
      businessTypes: params.businessTypes,
    });
    const templateCustomization = buildTemplateCustomization(pack);
    const mergedSetupMetadata = {
      ...(params.setupMetadata ?? {}),
      workspace_customization: templateCustomization,
    };

    const { data: organization, error: organizationError } = await supabase
      .from('organizations')
      .update({
        business_types: params.businessTypes,
        enabled_capabilities: params.enabledCapabilities,
        enabled_workspace_modules: pack.enabledModules,
        default_home_slug: pack.defaultHomeSlug,
        company_setup_completed: true,
        setup_metadata: mergedSetupMetadata,
      })
      .eq('id', params.organizationId)
      .select()
      .single()

    if (organizationError) throw organizationError

    if (params.initialUnits?.length) {
      const { error: unitsError } = await supabase.from('organization_units').insert(
        params.initialUnits.map((unit) => ({
          organization_id: params.organizationId,
          name: unit.name,
          unit_type: unit.unitType || 'region',
          code: unit.code || null,
        })),
      )
      if (unitsError) throw unitsError
    }

    return { organization, departments }
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
    role: string,
    departmentId?: string | null,
  ) {
    const payload: Record<string, unknown> = { role }
    if (departmentId !== undefined) {
      payload.department_id = departmentId
    }

    const { data, error } = await supabase
      .from('organization_members')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()

    if (error) throw error
    return data[0]
  },

  async updateMemberPermissions(
    organizationId: string,
    userId: string,
    permissions: string[]
  ) {
    const { data, error } = await supabase
      .from('organization_members')
      .update({ permissions })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return data
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

  async updateMemberApprovalLimits(
    organizationId: string,
    userId: string,
    limits: {
      financeApprovalLimitMinor?: number | null;
      maintenanceApprovalLimitMinor?: number | null;
    },
  ) {
    const { error } = await supabase
      .from('organization_members')
      .update({
        finance_approval_limit_minor: limits.financeApprovalLimitMinor ?? null,
        maintenance_approval_limit_minor: limits.maintenanceApprovalLimitMinor ?? null,
      })
      .eq('organization_id', organizationId)
      .eq('user_id', userId)

    if (error) throw error
  },
}
