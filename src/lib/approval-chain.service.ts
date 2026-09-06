import { supabase } from "./supabase";
import type {
  ApprovalChainDomain,
  ApprovalChainStep,
  OrganizationApprovalChain,
} from "./approval-chain.types";

export const approvalChainService = {
  async list(organizationId: string) {
    const { data, error } = await supabase
      .from("organization_approval_chains")
      .select("*")
      .eq("organization_id", organizationId)
      .order("domain")
      .order("name");

    if (error) throw error;
    return (data || []).map((row) => ({
      ...row,
      steps: Array.isArray(row.steps) ? (row.steps as ApprovalChainStep[]) : [],
    })) as OrganizationApprovalChain[];
  },

  async upsert(input: {
    id?: string;
    organizationId: string;
    domain: ApprovalChainDomain;
    name: string;
    description?: string | null;
    steps: ApprovalChainStep[];
    enabled?: boolean;
  }) {
    const payload = {
      organization_id: input.organizationId,
      domain: input.domain,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      steps: input.steps,
      enabled: input.enabled ?? true,
      updated_at: new Date().toISOString(),
    };

    if (input.id) {
      const { data, error } = await supabase
        .from("organization_approval_chains")
        .update(payload)
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as OrganizationApprovalChain;
    }

    const { data, error } = await supabase
      .from("organization_approval_chains")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return data as OrganizationApprovalChain;
  },

  async remove(id: string) {
    const { error } = await supabase.from("organization_approval_chains").delete().eq("id", id);
    if (error) throw error;
  },
};
