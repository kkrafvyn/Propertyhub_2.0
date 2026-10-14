import { supabase } from './supabase';
import { DEFAULT_MARKETING_DOCUMENT, validateMarketingDocument, type MarketingPageDocument } from './marketing-page-document';
const db = supabase as any;
export type MarketingDraft = { document: MarketingPageDocument; revision: number };
export const marketingContentService = {
  async loadPublished(): Promise<MarketingPageDocument> {
    const { data, error } = await db.from('marketing_page_published').select('document').eq('id', 'homepage').maybeSingle();
    if (error || !data) return structuredClone(DEFAULT_MARKETING_DOCUMENT);
    try { return validateMarketingDocument(data.document); } catch { return structuredClone(DEFAULT_MARKETING_DOCUMENT); }
  },
  async loadDraft(): Promise<MarketingDraft> {
    const { data, error } = await db.from('marketing_page_drafts').select('document, revision').eq('id', 'homepage').single();
    if (error) throw new Error(error.message || 'Unable to complete the request.');
    return { document: Object.keys(data.document).length ? validateMarketingDocument(data.document) : structuredClone(DEFAULT_MARKETING_DOCUMENT), revision: data.revision };
  },
  async saveDraft(document: MarketingPageDocument, revision: number): Promise<MarketingDraft> {
    const checked = validateMarketingDocument(document);
    const { data, error } = await db.rpc('admin_save_marketing_draft', { p_document: checked, p_expected_revision: revision });
    if (error) throw new Error(error.message || 'Unable to complete the request.');
    return { document: checked, revision: data };
  },
  async publish(revision: number) {
    const { error } = await db.rpc('admin_publish_marketing_page', { p_expected_revision: revision });
    if (error) throw new Error(error.message || 'Unable to complete the request.');
  },
};
