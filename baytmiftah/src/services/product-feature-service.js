import { callEdgeFunction } from './edge-client'
import { reviewListingQuality } from './listing-review-service'

const readLocal = (key, fallback = []) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

const writeLocal = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
  return value
}

const now = () => new Date().toISOString()

const defaultDocuments = [
  {
    id: 'vault-doc-1',
    title: 'Ownership deed',
    type: 'ownership',
    property: 'Airport Residential Villa',
    status: 'verified',
    expiresAt: '2027-02-10',
    source: 'local',
  },
  {
    id: 'vault-doc-2',
    title: 'Agency mandate',
    type: 'agency_mandate',
    property: 'Cantonments Townhouse',
    status: 'needs renewal',
    expiresAt: '2026-08-21',
    source: 'local',
  },
]

const defaultAlerts = [
  {
    id: 'match-1',
    name: 'Airport family homes',
    location: 'Airport Residential',
    budget: 'GHS 4.5M',
    cadence: 'Instant',
    channels: ['push', 'email'],
    matches: 7,
    status: 'active',
  },
  {
    id: 'match-2',
    name: 'Short-let investment units',
    location: 'East Legon',
    budget: 'GHS 1.2M',
    cadence: 'Daily digest',
    channels: ['email', 'whatsapp'],
    matches: 12,
    status: 'paused',
  },
]

const defaultTrustSignals = [
  { label: 'Verified documents', value: 92, status: 'strong' },
  { label: 'Response SLA', value: 87, status: 'strong' },
  { label: 'Listing accuracy', value: 81, status: 'watch' },
  { label: 'Dispute resolution', value: 96, status: 'strong' },
]

const defaultFieldTasks = [
  {
    id: 'field-1',
    title: 'Capture exterior media',
    property: 'Cantonments Townhouse',
    status: 'due today',
    icon: 'photo_camera',
  },
  {
    id: 'field-2',
    title: 'Verify meter and access codes',
    property: 'Airport Residential Villa',
    status: 'ready',
    icon: 'key',
  },
  {
    id: 'field-3',
    title: 'Collect signed viewing sheet',
    property: 'Labone Apartment',
    status: 'waiting',
    icon: 'signature',
  },
]

export const documentVaultService = {
  async listDocuments() {
    try {
      const documents = await callEdgeFunction('transactions', {
        query: { action: 'summary' },
      })
      return {
        documents: documents?.documents?.length
          ? documents.documents.map((document) => ({ ...document, source: 'supabase' }))
          : readLocal('baytmiftah_document_vault', defaultDocuments),
        source: documents?.documents?.length ? 'supabase' : 'local',
      }
    } catch (error) {
      return {
        documents: readLocal('baytmiftah_document_vault', defaultDocuments),
        source: 'local',
        error: error.message,
      }
    }
  },
  async addDocument(document) {
    const record = {
      id: `vault-${Date.now()}`,
      status: 'pending review',
      source: 'local',
      createdAt: now(),
      ...document,
    }
    const next = [record, ...readLocal('baytmiftah_document_vault', defaultDocuments)]
    writeLocal('baytmiftah_document_vault', next)
    try {
      const remote = await callEdgeFunction('transactions', {
        method: 'POST',
        query: { action: 'document' },
        body: record,
      })
      return { document: { ...record, ...remote, source: 'supabase' }, source: 'supabase' }
    } catch (error) {
      return { document: record, source: 'local', error: error.message }
    }
  },
}

export const smartMatchService = {
  async listAlerts() {
    try {
      const savedSearches = await callEdgeFunction('persistence', {
        query: { action: 'list', type: 'saved_search' },
      })
      const alerts = savedSearches.map((search, index) => ({
        id: search.id || `remote-match-${index}`,
        name: search.name || search.query || 'Saved search',
        location: search.location || search.filters?.location || 'Any location',
        budget: search.budget || search.filters?.budget || 'Flexible',
        cadence: search.cadence || 'Instant',
        channels: search.channels || ['push', 'email'],
        matches: search.matches || Math.max(3, index + 4),
        status: search.status || 'active',
      }))
      return {
        alerts: alerts.length ? alerts : readLocal('baytmiftah_smart_match_alerts', defaultAlerts),
        source: alerts.length ? 'supabase' : 'local',
      }
    } catch (error) {
      return {
        alerts: readLocal('baytmiftah_smart_match_alerts', defaultAlerts),
        source: 'local',
        error: error.message,
      }
    }
  },
  async saveAlert(alert) {
    const record = {
      id: `match-${Date.now()}`,
      matches: 0,
      status: 'active',
      channels: ['push', 'email'],
      ...alert,
    }
    const next = [record, ...readLocal('baytmiftah_smart_match_alerts', defaultAlerts)]
    writeLocal('baytmiftah_smart_match_alerts', next)
    try {
      await callEdgeFunction('persistence', {
        method: 'POST',
        query: { action: 'save', type: 'saved_search' },
        body: record,
      })
      return { alert: record, source: 'supabase' }
    } catch (error) {
      return { alert: record, source: 'local', error: error.message }
    }
  },
}

export const trustScoreService = {
  async getAgencyTrustScore() {
    try {
      const response = await callEdgeFunction('trust', {
        query: { action: 'score' },
      })
      return {
        score: response.score || 88,
        signals: response.signals || defaultTrustSignals,
        source: 'supabase',
      }
    } catch (error) {
      return {
        score: 88,
        signals: defaultTrustSignals,
        source: 'local',
        error: error.message,
      }
    }
  },
}

export const fieldAgentService = {
  async listTasks() {
    try {
      const response = await callEdgeFunction('agency-crm', {
        query: { action: 'field-tasks' },
      })
      return {
        tasks: response.tasks?.length ? response.tasks : defaultFieldTasks,
        source: response.tasks?.length ? 'supabase' : 'local',
      }
    } catch (error) {
      return {
        tasks: readLocal('baytmiftah_field_agent_tasks', defaultFieldTasks),
        source: 'local',
        error: error.message,
      }
    }
  },
}

export const listingCoachService = {
  draftReview(draft) {
    return reviewListingQuality({
      formData: draft,
      mediaCount: Number(draft.mediaCount || 0),
      documentCount: Number(draft.documentCount || 0),
      checklist: [
        { done: Boolean(draft.title) },
        { done: Boolean(draft.description && draft.description.length > 80) },
        { done: Boolean(draft.location) },
        { done: Boolean(draft.price) },
        { done: Number(draft.mediaCount || 0) >= 3 },
        { done: Number(draft.documentCount || 0) > 0 },
      ],
    })
  },
}

export default {
  documentVaultService,
  fieldAgentService,
  listingCoachService,
  smartMatchService,
  trustScoreService,
}
