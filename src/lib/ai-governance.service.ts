import { supabase } from "./supabase";

export type AIGovernanceControl = {
  organizationId: string;
  agentName: string;
  enabled: boolean;
  dailyActionBudget: number;
  updatedBy: string;
  updatedAt: string;
};

export function evaluateAiActionBudget(control: { enabled: boolean; dailyActionBudget: number; actionCount: number }): boolean {
  if (!control.enabled) return false;
  if (!Number.isInteger(control.dailyActionBudget) || !Number.isInteger(control.actionCount) || control.actionCount < 0) return false;
  return control.actionCount < control.dailyActionBudget;
}

export function canExecuteAiAction(control: { enabled: boolean; dailyActionBudget: number; actionCount: number }): boolean {
  return evaluateAiActionBudget(control);
}

export const aiGovernanceService = {
  async getControls(organizationId: string) {
    const { data, error } = await supabase.from("ai_agent_controls").select("*").eq("organization_id", organizationId);
    if (error) throw error;
    return data || [];
  },
  async setControl(input: { organizationId: string; agentName: string; enabled: boolean; dailyActionBudget: number; updatedBy: string }) {
    if (!input.agentName.trim() || input.dailyActionBudget < 0) throw new Error("Agent name and non-negative budget are required");
    const { data, error } = await supabase.from("ai_agent_controls").upsert({
      organization_id: input.organizationId,
      agent_name: input.agentName.trim(),
      enabled: input.enabled,
      daily_action_budget: input.dailyActionBudget,
      updated_by: input.updatedBy,
      updated_at: new Date().toISOString(),
    }).select("*").single();
    if (error) throw error;
    return data;
  },
  evaluateFromControl(control: { enabled: boolean; dailyActionBudget: number; actionCount: number }) {
    return canExecuteAiAction(control);
  },
};
