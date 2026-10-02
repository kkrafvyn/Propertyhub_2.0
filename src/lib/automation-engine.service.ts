import { supabase } from './supabase'
import { notificationService } from './notification.service'

export const automationEngineService = {
  // Create automation workflow
  async createWorkflow(
    organizationId: string,
    name: string,
    workflowType: 'lead' | 'listing' | 'transaction' | 'team' | 'custom',
    triggerType: string,
    conditions: Record<string, any>,
    actions: Record<string, any>
  ) {
    const { data, error } = await supabase
      .from('automation_workflows')
      .insert({
        organization_id: organizationId,
        name,
        workflow_type: workflowType,
        trigger_type: triggerType,
        conditions,
        actions,
        enabled: true
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get organization workflows
  async getWorkflows(organizationId: string) {
    const { data, error } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async setWorkflowEnabled(workflowId: string, enabled: boolean) {
    const { data, error } = await supabase
      .from('automation_workflows')
      .update({ enabled })
      .eq('id', workflowId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Execute workflow (main automation logic)
  async executeWorkflow(workflowId: string, triggerSourceId: string) {
    const { data: workflow } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('id', workflowId)
      .single()
    
    if (!workflow || !workflow.enabled) return null

    // Persist the trigger for retry/observability. External delivery is handled by
    // a worker/provider adapter, never assumed to be complete in the browser.
    await supabase.from('estate_automation_events').insert({
      organization_id: workflow.organization_id,
      event_type: workflow.trigger_type,
      entity_type: workflow.workflow_type,
      entity_id: triggerSourceId || null,
      payload: { workflow_id: workflowId, actions: workflow.actions },
    })
    
    // Create log entry
    const { data: log } = await supabase
      .from('automation_logs')
      .insert({
        workflow_id: workflowId,
        trigger_source_id: triggerSourceId,
        status: 'executing'
      })
      .select()
      .single()
    
    try {
      const result = await this.executeActions(workflow.actions, triggerSourceId, workflow.organization_id)
      
      // Update log to completed
      await supabase
        .from('automation_logs')
        .update({
          status: 'completed',
          result
        })
        .eq('id', log.id)
      
      // Update workflow execution count
      await supabase
        .from('automation_workflows')
        .update({
          execution_count: (workflow.execution_count || 0) + 1,
          last_executed_at: new Date().toISOString()
        })
        .eq('id', workflowId)
      
      return result
    } catch (error) {
      await supabase
        .from('automation_logs')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', log.id)
      
      throw error
    }
  },

  // Execute automation actions
  async executeActions(actions: Record<string, any>, sourceId: string, organizationId?: string) {
    const results: Record<string, any> = {}
    
    // Auto lead assignment
    if (actions.assign_lead) {
      const orgId = actions.assign_lead.organization_id || organizationId
      const { data: assignee } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId)
        .eq('role', 'agent')
        .limit(1)
        .maybeSingle()
      
      if (assignee) {
        await supabase
          .from('deal_cases')
          .update({ assigned_to: assignee.user_id })
          .eq('id', sourceId)
        
        results.assigned_to = assignee.user_id
      }
    }
    
    // Send notification
    if (actions.send_notification && organizationId) {
      await notificationService.notifyOrganizationTeam({
        organizationId,
        roles: actions.send_notification.recipient === 'agent' ? ['agent'] : ['owner', 'manager'],
        notificationType: actions.send_notification.template || 'automation_notification',
        subject: actions.send_notification.subject || 'Automation alert',
        content: actions.send_notification.body || 'An automated workflow action requires your attention.',
        category: 'System',
        metadata: { sourceId, template: actions.send_notification.template },
      })
      results.notification_sent = true
    }
    
    // Archive listing
    if (actions.archive_listing) {
      await supabase
        .from('listings')
        .update({ status: 'archived' })
        .eq('id', sourceId)
      
      results.listing_archived = true
    }
    
    // Send reminder
    if (actions.send_reminder && organizationId) {
      await notificationService.notifyOrganizationTeam({
        organizationId,
        roles: ['owner', 'manager', 'agent'],
        notificationType: actions.send_reminder.template || 'automation_reminder',
        subject: 'Workflow reminder',
        content: `Reminder triggered for workflow item ${sourceId.slice(0, 8)}.`,
        category: 'System',
        metadata: { sourceId, days: actions.send_reminder.days },
      })
      results.reminder_sent = true
    }
    
    return results
  },

  // Create common workflow presets
  async createLeadFollowUpWorkflow(organizationId: string) {
    return this.createWorkflow(
      organizationId,
      'Auto Lead Follow-up',
      'lead',
      'deal_case_created',
      {
        status: 'pending'
      },
      {
        send_notification: {
          recipient: 'agent',
          template: 'new_lead'
        },
        send_reminder: {
          days: 1,
          template: 'follow_up_reminder'
        }
      }
    )
  },

  // Create listing expiry workflow
  async createListingExpiryWorkflow(organizationId: string) {
    return this.createWorkflow(
      organizationId,
      'Listing Expiry Management',
      'listing',
      'listing_nearing_expiry',
      {
        days_until_expiry: 7
      },
      {
        send_notification: {
          recipient: 'organization',
          template: 'listing_expiry_reminder'
        },
        archive_listing: true
      }
    )
  },

  // Create payment reminder workflow
  async createPaymentReminderWorkflow(organizationId: string) {
    return this.createWorkflow(
      organizationId,
      'Payment Reminders',
      'transaction',
      'transaction_pending',
      {
        status: 'pending'
      },
      {
        send_reminder: {
          days: 3,
          template: 'payment_reminder'
        }
      }
    )
  },

  async createEstateArrearsWorkflow(organizationId: string) {
    return this.createWorkflow(organizationId, "Estate Arrears Follow-up", "custom", "estate_charge_overdue", { aging_days: 1 }, { send_reminder: { days: 0, template: "estate_arrears_reminder" }, send_notification: { recipient: "finance", template: "collection_task" } });
  },

  async createLeaseRenewalWorkflow(organizationId: string) {
    return this.createWorkflow(organizationId, "Lease Renewal Sequence", "custom", "lease_nearing_expiry", { days_until_expiry: 60 }, { send_notification: { recipient: "manager", template: "lease_renewal_review" }, send_reminder: { days: 45, template: "resident_renewal_reminder" } });
  },

  async createMaintenanceSlaWorkflow(organizationId: string) {
    return this.createWorkflow(organizationId, "Maintenance SLA Escalation", "custom", "estate_issue_sla_breached", { issue_status: "open" }, { send_notification: { recipient: "manager", template: "maintenance_sla_escalation" }, send_reminder: { days: 0, template: "assignee_escalation" } });
  },

  // Enable/disable workflow
  async toggleWorkflow(workflowId: string, enabled: boolean) {
    const { data, error } = await supabase
      .from('automation_workflows')
      .update({ enabled })
      .eq('id', workflowId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Delete workflow
  async deleteWorkflow(workflowId: string) {
    const { error } = await supabase
      .from('automation_workflows')
      .delete()
      .eq('id', workflowId)
    
    if (error) throw error
  },

  async getWorkflowStats(workflowId: string) {
    const logs = await this.getAutomationLogs(workflowId, 500)
    const runs = logs.length
    const completed = logs.filter((log) => log.status === 'completed').length
    const successRate = runs ? Math.round((completed / runs) * 100) : 0

    return {
      runs,
      successRate,
      lastRun: logs[0]?.created_at || null,
    }
  },

  async getWorkflowSummaries(organizationId: string) {
    const workflows = await this.getWorkflows(organizationId)

    return Promise.all(
      workflows.map(async (workflow) => ({
        workflow,
        stats: await this.getWorkflowStats(workflow.id),
      }))
    )
  },

  async createCustomWorkflow(
    organizationId: string,
    name: string,
    triggerType = 'new_listing'
  ) {
    return this.createWorkflow(
      organizationId,
      name,
      'custom',
      triggerType,
      {},
      {
        send_notification: {
          recipient: 'organization',
          template: 'workflow_created',
        },
      }
    )
  },

  // Get automation logs
  async getAutomationLogs(workflowId: string, limit = 50) {
    const { data, error } = await supabase
      .from('automation_logs')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  }
}
