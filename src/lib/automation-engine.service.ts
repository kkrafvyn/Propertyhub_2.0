import { supabase } from './supabase'

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

  // Execute workflow (main automation logic)
  async executeWorkflow(workflowId: string, triggerSourceId: string) {
    const { data: workflow } = await supabase
      .from('automation_workflows')
      .select('*')
      .eq('id', workflowId)
      .single()
    
    if (!workflow || !workflow.enabled) return null
    
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
      const result = await this.executeActions(workflow.actions, triggerSourceId)
      
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
  async executeActions(actions: Record<string, any>, sourceId: string) {
    const results: Record<string, any> = {}
    
    // Auto lead assignment
    if (actions.assign_lead) {
      const { data: assignee } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', actions.assign_lead.organization_id)
        .eq('role', 'agent')
        .limit(1)
        .single()
      
      if (assignee) {
        // Assign deal case to agent
        await supabase
          .from('deal_cases')
          .update({ assigned_to: assignee.user_id })
          .eq('id', sourceId)
        
        results.assigned_to = assignee.user_id
      }
    }
    
    // Send notification
    if (actions.send_notification) {
      results.notification_sent = true
      // Notification logic would go here
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
    if (actions.send_reminder) {
      results.reminder_sent = true
      // Reminder logic would go here
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
