import { supabase } from "./supabase";
import type { Database } from "./database.types";

type PropertyMediaInsert = Database["public"]["Tables"]["property_media"]["Insert"];
type PropertyMediaUpdate = Database["public"]["Tables"]["property_media"]["Update"];

const PROPERTY_MEDIA_BUCKET = import.meta.env.VITE_PROPERTY_MEDIA_BUCKET || "property-media";

function buildStoragePath(organizationId: string, propertyId: string, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return `${organizationId}/${propertyId}/${crypto.randomUUID()}.${extension}`;
}

export const propertyMediaService = {
  bucketName: PROPERTY_MEDIA_BUCKET,

  async getPropertyMedia(propertyId: string) {
    const { data, error } = await supabase
      .from("property_media")
      .select("*")
      .eq("property_id", propertyId)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
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

      const { data: publicUrlData } = supabase.storage
        .from(PROPERTY_MEDIA_BUCKET)
        .getPublicUrl(storagePath);

      const insertPayload: PropertyMediaInsert = {
        property_id: params.propertyId,
        organization_id: params.organizationId,
        storage_path: storagePath,
        public_url: publicUrlData.publicUrl,
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

  async addExternalMedia(params: {
    organizationId: string;
    propertyId: string;
    createdBy: string;
    mediaType:
      | "video"
      | "floor_plan"
      | "virtual_tour"
      | "drone"
      | "renovation_before_after"
      | "other";
    url: string;
    caption?: string | null;
  }) {
    const existingMedia = await this.getPropertyMedia(params.propertyId);
    const externalPath = `external/${params.organizationId}/${params.propertyId}/${crypto.randomUUID()}`;

    const { data, error } = await supabase
      .from("property_media")
      .insert({
        property_id: params.propertyId,
        organization_id: params.organizationId,
        storage_path: externalPath,
        public_url: params.url,
        alt_text: params.caption || null,
        sort_order: existingMedia.length,
        is_primary: false,
        created_by: params.createdBy,
        media_type: params.mediaType,
        external_embed_url: params.url,
        caption: params.caption || null,
        processing_status: "ready",
        metadata: {
          source: "external_url",
        },
      } as any)
      .select()
      .single();

    if (error) throw error;
    return data;
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

    const isExternalMedia = String(media.storage_path || "").startsWith("external/");
    const { error: storageError } = isExternalMedia
      ? { error: null }
      : await supabase.storage.from(PROPERTY_MEDIA_BUCKET).remove([media.storage_path]);

    if (storageError) throw storageError;

    const { error: deleteError } = await supabase.from("property_media").delete().eq("id", mediaId);
    if (deleteError) throw deleteError;

    const remainingMedia = await this.getPropertyMedia(media.property_id);
    if (remainingMedia.length > 0 && !remainingMedia.some((item) => item.is_primary)) {
      await this.updatePropertyMedia(remainingMedia[0].id, { is_primary: true });
    }
  },
};
