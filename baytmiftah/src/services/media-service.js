import { supabase } from '../lib/supabase'

export const PROPERTY_MEDIA_BUCKET = 'property-media'

const safeFileName = (name = 'upload') =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')

export async function uploadPropertyMedia({
  propertyId,
  listingId,
  files = [],
  title = 'Property media',
  onProgress,
}) {
  if (!propertyId) throw new Error('Property ID is required before uploading media.')
  if (!files.length) return []

  const uploaded = []

  for (const [index, fileItem] of files.entries()) {
    const file = fileItem.file || fileItem
    const objectPath = `${propertyId}/${Date.now()}-${index}-${safeFileName(file.name)}`

    onProgress?.({
      index,
      total: files.length,
      fileName: file.name,
      status: 'uploading',
    })

    const { data, error } = await supabase.storage
      .from(PROPERTY_MEDIA_BUCKET)
      .upload(objectPath, file, {
        cacheControl: '3600',
        contentType: file.type || 'image/jpeg',
        upsert: false,
        metadata: {
          listingId,
          title,
        },
      })

    if (error) throw error

    const {
      data: { publicUrl },
    } = supabase.storage.from(PROPERTY_MEDIA_BUCKET).getPublicUrl(data.path)

    const mediaRow = {
      property_id: propertyId,
      public_url: publicUrl,
      url: publicUrl,
      media_type: file.type?.startsWith('video') ? 'video' : 'image',
      alt: fileItem.alt || `${title} image ${index + 1}`,
      alt_text: fileItem.alt || `${title} image ${index + 1}`,
      is_primary: Boolean(fileItem.isPrimary || index === 0),
      sort_order: index,
      metadata: {
        listing_id: listingId,
        storage_bucket: PROPERTY_MEDIA_BUCKET,
        storage_path: data.path,
        original_name: file.name,
        size: file.size,
      },
    }

    const { data: inserted, error: insertError } = await supabase
      .from('property_media')
      .insert(mediaRow)
      .select()
      .single()

    if (insertError) throw insertError

    uploaded.push(inserted)
    onProgress?.({
      index,
      total: files.length,
      fileName: file.name,
      status: 'complete',
    })
  }

  return uploaded
}

export async function uploadVerificationDocument({
  organizationId,
  propertyId,
  listingId,
  file,
  documentType,
}) {
  const ownerId = organizationId || propertyId || listingId || 'unassigned'
  const objectPath = `${ownerId}/verification/${Date.now()}-${safeFileName(file.name)}`

  const { data, error } = await supabase.storage
    .from(PROPERTY_MEDIA_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      contentType: file.type || 'application/octet-stream',
      upsert: false,
      metadata: {
        documentType,
        propertyId,
        listingId,
      },
    })

  if (error) throw error

  const {
    data: { publicUrl },
  } = supabase.storage.from(PROPERTY_MEDIA_BUCKET).getPublicUrl(data.path)

  return {
    documentType,
    publicUrl,
    storagePath: data.path,
    originalName: file.name,
    size: file.size,
  }
}
