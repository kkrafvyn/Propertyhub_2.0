import { supabase } from './supabase'

const BUCKETS = {
  listings: 'listings',
  documents: 'documents',
  kyc: 'kyc',
}

export async function uploadFile(bucket, path, file) {
  if (!supabase) throw new Error('Supabase not configured')

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
  })
  if (error) throw error

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path)
  return {
    path: data.path,
    url: bucket === BUCKETS.documents ? null : urlData.publicUrl,
  }
}

export async function uploadListingPhoto(listingId, file) {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${listingId}/${Date.now()}.${ext}`
  return uploadFile(BUCKETS.listings, path, file)
}

export async function uploadDocument(userId, file, category = 'general') {
  const ext = file.name.split('.').pop() || 'pdf'
  const path = `${userId}/${category}/${Date.now()}.${ext}`
  const result = await uploadFile(BUCKETS.documents, path, file)
  return { ...result, category }
}

export async function getSignedDocumentUrl(path, expiresIn = 3600) {
  if (!supabase) return null
  const { data, error } = await supabase.storage.from(BUCKETS.documents).createSignedUrl(path, expiresIn)
  if (error) return null
  return data.signedUrl
}

export { BUCKETS }
