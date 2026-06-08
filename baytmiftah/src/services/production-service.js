import { supabase } from '../lib/supabase'
import { callEdgeFunction } from './edge-client'

const localJson = (key, fallback = []) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

const saveLocal = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
  return value
}

export const accountService = {
  requestPasswordReset(email) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  },
  updatePassword(password) {
    return supabase.auth.updateUser({ password })
  },
  async completeProfile(profile) {
    const current = localJson('baytmiftah_profile_completion', {})
    const next = { ...current, ...profile, onboardingStatus: 'complete' }
    saveLocal('baytmiftah_profile_completion', next)
    try {
      await supabase.auth.updateUser({
        data: {
          display_name: profile.displayName,
          role: profile.role,
          phone: profile.phone,
        },
      })
    } catch {
      // Profile completion also works locally until Supabase Auth is configured.
    }
    return next
  },
  async startMfaEnrollment() {
    try {
      return await supabase.auth.mfa.enroll({ factorType: 'totp' })
    } catch (error) {
      return { data: null, error }
    }
  },
}

export const channelCalendarService = {
  async listBlocks(organizationId) {
    try {
      return await callEdgeFunction('channel-sync', {
        query: { action: 'blocks', organizationId },
      })
    } catch {
      return localJson('baytmiftah_availability_blocks', [
        {
          id: 'local-block-1',
          source: 'booking.com',
          starts_on: '2026-07-12',
          ends_on: '2026-07-15',
          status: 'occupied',
          reason: 'Imported reservation',
        },
      ])
    }
  },
  async createBlock(block) {
    const local = [{ id: `block-${Date.now()}`, ...block }, ...localJson('baytmiftah_availability_blocks')]
    saveLocal('baytmiftah_availability_blocks', local)
    try {
      return await callEdgeFunction('channel-sync', {
        method: 'POST',
        query: { action: 'block' },
        body: block,
      })
    } catch {
      return local[0]
    }
  },
  async connectChannel(connection) {
    const local = [{ id: `channel-${Date.now()}`, ...connection, status: 'active' }, ...localJson('baytmiftah_channel_connections')]
    saveLocal('baytmiftah_channel_connections', local)
    try {
      return await callEdgeFunction('channel-sync', {
        method: 'POST',
        query: { action: 'connect' },
        body: connection,
      })
    } catch {
      return local[0]
    }
  },
}

export const billingService = {
  async listHistory() {
    try {
      return await callEdgeFunction('persistence', {
        query: { action: 'list', type: 'billing_history' },
      })
    } catch {
      return localJson('baytmiftah_billing_history', [
        {
          id: 'bill-local-1',
          provider: 'stripe',
          description: 'Featured listing boost',
          amount: 350,
          currency: 'GHS',
          status: 'pending webhook',
          created_at: new Date().toISOString(),
        },
      ])
    }
  },
}

export const messagingService = {
  async listDeliveryLogs() {
    try {
      return await callEdgeFunction('messaging', { query: { action: 'logs' } })
    } catch {
      return localJson('baytmiftah_delivery_logs', [])
    }
  },
  async createTemplate(template) {
    try {
      return await callEdgeFunction('messaging', {
        method: 'POST',
        query: { action: 'template' },
        body: template,
      })
    } catch {
      return { id: `template-${Date.now()}`, ...template }
    }
  },
  async queueDispatch(payload) {
    const local = [{ id: `delivery-${Date.now()}`, status: 'queued', ...payload }, ...localJson('baytmiftah_delivery_logs')]
    saveLocal('baytmiftah_delivery_logs', local)
    try {
      return await callEdgeFunction('messaging', {
        method: 'POST',
        query: { action: 'dispatch' },
        body: payload,
      })
    } catch {
      return { delivery: local[0], source: 'local' }
    }
  },
}

export const transactionService = {
  async getSummary() {
    try {
      return await callEdgeFunction('transactions', { query: { action: 'summary' } })
    } catch {
      return {
        documents: localJson('baytmiftah_transaction_documents', []),
        negotiations: localJson('baytmiftah_negotiation_events', []),
        checklists: localJson('baytmiftah_closing_checklists', []),
      }
    }
  },
  async addDocument(document) {
    const local = [{ id: `doc-${Date.now()}`, ...document }, ...localJson('baytmiftah_transaction_documents')]
    saveLocal('baytmiftah_transaction_documents', local)
    try {
      return await callEdgeFunction('transactions', {
        method: 'POST',
        query: { action: 'document' },
        body: document,
      })
    } catch {
      return local[0]
    }
  },
  async addCounterOffer(offer) {
    const local = [{ id: `negotiation-${Date.now()}`, event_type: 'counter_offer', ...offer }, ...localJson('baytmiftah_negotiation_events')]
    saveLocal('baytmiftah_negotiation_events', local)
    try {
      return await callEdgeFunction('transactions', {
        method: 'POST',
        query: { action: 'counter-offer' },
        body: offer,
      })
    } catch {
      return local[0]
    }
  },
}

export const moderationService = {
  async listQueue(status = 'queued') {
    try {
      return await callEdgeFunction('moderation', { query: { action: 'queue', status } })
    } catch {
      return localJson('baytmiftah_moderation_queue', [
        {
          id: 'review-local-1',
          status: 'queued',
          priority: 'high',
          reason_codes: ['missing_documents', 'price_anomaly'],
          reviewer_notes: 'Demo queue until moderation function is deployed.',
          created_at: new Date().toISOString(),
        },
      ])
    }
  },
  async recordDecision(decision) {
    try {
      return await callEdgeFunction('moderation', {
        method: 'PUT',
        query: { action: 'decision' },
        body: decision,
      })
    } catch {
      return { ...decision, status: decision.status || 'reviewed' }
    }
  },
}

export default {
  accountService,
  billingService,
  channelCalendarService,
  messagingService,
  moderationService,
  transactionService,
}
