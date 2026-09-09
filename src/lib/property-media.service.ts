import { supabase } from "./supabase";
import type { Database } from "./database.types";

type PropertyMediaInsert = Database["public"]["Tables"]["property_media"]["Insert"];
type PropertyMediaUpdate = Database["public"]["Tables"]["property_media"]["Update"];
type PropertyMediaRow = Database["public"]["Tables"]["property_media"]["Row"];

const PROPERTY_MEDIA_BUCKET = import.meta.env.VITE_PROPERTY_MEDIA_BUCKET || "property-media";

/** Fresh signed URLs for gallery display (re-signed on each page load when stale). */
const DISPLAY_SIGNED_URL_TTL_SEC = 60 * 60;
/** Re-sign before JWT expiry to avoid broken images mid-session. */
const RESIGN_BUFFER_SEC = 60 * 5;

export type PropertyMediaResolvable = Pick<PropertyMediaRow, "storage_path" | "public_url"> &
  Partial<PropertyMediaRow>;

function buildStoragePath(organizationId: string, propertyId: string, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return `${organizationId}/${propertyId}/${crypto.randomUUID()}.${extension}`;
}

export function parseSignedUrlExpirySec(publicUrl: string): number | null {
  try {
    const token = new URL(publicUrl).searchParams.get("token");
    if (!token) return null;

    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return null;

    const payload = JSON.parse(atob(payloadSegment.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export function isPropertyMediaUrlStale(publicUrl?: string | null): boolean {
  if (!publicUrl?.trim()) return true;

  const expirySec = parseSignedUrlExpirySec(publicUrl);
  if (expirySec === null) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  return expirySec <= nowSec + RESIGN_BUFFER_SEC;
}

export const propertyMediaService = {
  bucketName: PROPERTY_MEDIA_BUCKET,

  async resolvePropertyMediaUrl(
    media: PropertyMediaResolvable
  ): Promise<string | null> {
    const storagePath = media.storage_path?.trim();
    if (storagePath && isPropertyMediaUrlStale(media.public_url)) {
      const { data, error } = await supabase.storage
        .from(PROPERTY_MEDIA_BUCKET)
        .createSignedUrl(storagePath, DISPLAY_SIGNED_URL_TTL_SEC);

      if (!error && data?.signedUrl) {
        return data.signedUrl;
      }
    }

    return media.public_url?.trim() || null;
  },

  async resolvePropertyMediaItems<T extends PropertyMediaResolvable>(
    items: T[]
  ): Promise<T[]> {
    if (items.length === 0) return items;

    const cache = new Map<string, Promise<string | null>>();

    const resolveCached = (item: PropertyMediaResolvable) => {
      const storagePath = item.storage_path?.trim();
      if (!storagePath || !isPropertyMediaUrlStale(item.public_url)) {
        return Promise.resolve(item.public_url?.trim() || null);
      }

      const cached = cache.get(storagePath);
      if (cached) return cached;

      const pending = this.resolvePropertyMediaUrl(item);
      cache.set(storagePath, pending);
      return pending;
    };

    return Promise.all(
      items.map(async (item) => {
        const resolvedUrl = await resolveCached(item);
        if (!resolvedUrl || resolvedUrl === item.public_url) {
          return item;
        }
        return { ...item, public_url: resolvedUrl };
      })
    );
  },

  async getPropertyMedia(propertyId: string) {
    const { data, error } = await supabase
      .from("property_media")
      .select("*")
      .eq("property_id", propertyId)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return this.resolvePropertyMediaItems(data || []);
  },

  async uploadPropertyMedia(params: {
    organizationId: string;
    propertyId: string;
    createdBy: string;
    files: File[];
    altText?: string | null;
  }) {
    if (params.files.length === 0) return [];

    const existingMedia = await this.getPropertyMedia(params.propertyId);
    const uploadedRows = [];

    for (const [index, file] of params.files.entries()) {
      const storagePath = buildStoragePath(params.organizationId, params.propertyId, file);
      const { error: uploadError } = await supabase.storage
        .from(PROPERTY_MEDIA_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from(PROPERTY_MEDIA_BUCKET)
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7);

      if (signedUrlError) throw signedUrlError;

      const insertPayload: PropertyMediaInsert = {
        property_id: params.propertyId,
        organization_id: params.organizationId,
        storage_path: storagePath,
        public_url: signedUrlData?.signedUrl || null,
        alt_text: params.altText || null,
        sort_order: existingMedia.length + index,
        is_primary: existingMedia.length === 0 && index === 0,
        created_by: params.createdBy,
      };

      const { data, error } = await supabase
        .from("property_media")
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        await supabase.storage.from(PROPERTY_MEDIA_BUCKET).remove([storagePath]);
        throw error;
      }

      uploadedRows.push(data);
    }

    return uploadedRows;
  },

  async updatePropertyMedia(mediaId: string, updates: PropertyMediaUpdate) {
    const { data, error } = await supabase
      .from("property_media")
      .update(updates)
      .eq("id", mediaId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async setPrimaryMedia(propertyId: string, mediaId: string) {
    const { error: clearError } = await supabase
      .from("property_media")
      .update({ is_primary: false })
      .eq("property_id", propertyId)
      .neq("id", mediaId);

    if (clearError) throw clearError;

    return this.updatePropertyMedia(mediaId, { is_primary: true });
  },

  async deletePropertyMedia(mediaId: string) {
    const { data: media, error: fetchError } = await supabase
      .from("property_media")
      .select("*")
      .eq("id", mediaId)
      .single();

    if (fetchError) throw fetchError;

    const { error: storageError } = await supabase.storage
      .from(PROPERTY_MEDIA_BUCKET)
      .remove([media.storage_path]);

    if (storageError) throw storageError;

    const { error: deleteError } = await supabase.from("property_media").delete().eq("id", mediaId);
    if (deleteError) throw deleteError;

    const remainingMedia = await this.getPropertyMedia(media.property_id);
    if (remainingMedia.length > 0 && !remainingMedia.some((item) => item.is_primary)) {
      await this.updatePropertyMedia(remainingMedia[0].id, { is_primary: true });
    }
  },
};
