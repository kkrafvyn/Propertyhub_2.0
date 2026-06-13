import { callEdgeFunction } from '../lib/edge-client'
import { supabase } from '../lib/supabase'
import { documents } from '../data/enterprise'

export async function fetchDocuments() {
  try {
    const payload = await callEdgeFunction('persistence', {
      allowAnonymous: false,
      query: { action: 'documents' },
    })
    const rows = payload?.documents ?? []
    if (rows.length) return { documents: rows, source: 'supabase' }
  } catch {
    /* fallback */
  }
  return { documents, source: 'local' }
}

export async function saveDocument({ name, category, storage_path, status = 'uploaded' }) {
  try {
    const payload = await callEdgeFunction('persistence', {
      method: 'POST',
      allowAnonymous: false,
      body: { action: 'save_document', name, category, storage_path, status },
    })
    if (payload?.document) return { document: payload.document, source: 'supabase' }
  } catch {
    /* direct */
  }

  if (supabase) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data, error } = await supabase.from('user_documents').insert({
        user_id: user.id,
        name,
        category,
        storage_path,
        status,
      }).select('*').single()
      if (!error) {
        return {
          document: {
            id: data.id,
            name: data.name,
            category: data.category,
            status: data.status,
            updated: data.created_at?.slice(0, 10),
          },
          source: 'supabase',
        }
      }
    }
  }

  return {
    document: {
      id: `local-${Date.now()}`,
      name,
      category,
      status,
      updated: new Date().toISOString().slice(0, 10),
    },
    source: 'local',
  }
}

export default { fetchDocuments, saveDocument }
