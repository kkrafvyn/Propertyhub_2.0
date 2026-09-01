import { supabase } from "./supabase";
import { redactPii } from "./pii-redaction";

const db = supabase as any;

export interface SopDocument {
  id: string;
  organization_id: string;
  title: string;
  category: string;
  content: string;
  size_kb: number;
  status: "indexed" | "processing" | "archived";
  created_at: string;
}

export interface SopAnswer {
  answer: string;
  citations: Array<{ documentId: string; title: string; excerpt: string }>;
}

/** Split text into sentences for excerpt extraction. */
function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export const sopKnowledgeService = {
  async listDocuments(organizationId: string): Promise<SopDocument[]> {
    const { data, error } = await db
      .from("org_sop_documents")
      .select("*")
      .eq("organization_id", organizationId)
      .neq("status", "archived")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as SopDocument[];
  },

  async createDocument(input: {
    organizationId: string;
    title: string;
    category: string;
    content: string;
    createdBy?: string;
  }): Promise<SopDocument> {
    if (!input.title.trim() || !input.content.trim()) {
      throw new Error("Title and document content are required");
    }
    const { data, error } = await db
      .from("org_sop_documents")
      .insert({
        organization_id: input.organizationId,
        title: input.title.trim(),
        category: input.category,
        content: input.content,
        size_kb: Math.max(1, Math.round(new Blob([input.content]).size / 1024)),
        status: "indexed",
        created_by: input.createdBy || null,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data as SopDocument;
  },

  async archiveDocument(documentId: string): Promise<void> {
    const { error } = await db
      .from("org_sop_documents")
      .update({ status: "archived", updated_at: new Date().toISOString() })
      .eq("id", documentId);
    if (error) throw error;
  },

  /**
   * Deterministic, tenant-scoped retrieval: ranks the organization's own SOP
   * documents by keyword overlap with the question and returns the most
   * relevant excerpts with citations. Runs entirely against the org's data —
   * nothing leaves the tenant boundary.
   */
  async ask(organizationId: string, question: string): Promise<SopAnswer> {
    const docs = await this.listDocuments(organizationId);
    const terms = redactPii(question)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 3);

    if (terms.length === 0 || docs.length === 0) {
      return {
        answer:
          docs.length === 0
            ? "No SOP documents have been uploaded yet. Upload your handbooks and policies to make them searchable."
            : "Please ask a more specific question so the knowledge base can be searched.",
        citations: [],
      };
    }

    const scored = docs
      .map((doc) => {
        const haystack = `${doc.title} ${doc.content}`.toLowerCase();
        const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
        return { doc, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (scored.length === 0) {
      return {
        answer: "No indexed SOP document covers that topic yet. Consider uploading the relevant policy.",
        citations: [],
      };
    }

    const citations = scored.map(({ doc }) => {
      const docSentences = sentences(doc.content);
      const best =
        docSentences.find((s) => terms.some((t) => s.toLowerCase().includes(t))) ||
        docSentences[0] ||
        doc.title;
      return {
        documentId: doc.id,
        title: doc.title,
        excerpt: best.length > 280 ? `${best.slice(0, 277)}…` : best,
      };
    });

    return {
      answer: citations
        .map((c) => `According to "${c.title}": ${c.excerpt}`)
        .join("\n\n"),
      citations,
    };
  },
};
