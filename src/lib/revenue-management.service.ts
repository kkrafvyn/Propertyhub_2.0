import { supabase } from "./supabase";

export type FeeType = "fixed" | "percentage" | "tiered" | "custom";

export type RevenueRule = {
  id: string;
  rule_key: string;
  label: string;
  category: string;
  enabled: boolean;
  fee_type: FeeType;
  fee_value: number | null;
  fee_value_secondary: number | null;
  currency: string;
  min_fee: number | null;
  max_fee: number | null;
  applies_to: Record<string, unknown>;
  metadata: Record<string, unknown>;
  effective_from: string | null;
  effective_until: string | null;
  sort_order: number;
  updated_at: string;
};

export type SubscriptionPlan = {
  id: string;
  plan_key: string;
  name: string;
  description: string | null;
  price_amount: number | null;
  currency: string;
  billing_cycle: "monthly" | "yearly" | "custom";
  features: string[];
  is_active: boolean;
  is_custom_pricing: boolean;
  sort_order: number;
};

export type PromoCode = {
  id: string;
  code: string;
  label: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  applies_to: string;
  currency: string | null;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
};

export type PaymentGateway = {
  id: string;
  gateway_key: string;
  display_name: string;
  enabled: boolean;
  fee_type: FeeType;
  fee_value: number | null;
  supported_currencies: string[];
  supported_regions: string[];
  api_status: "connected" | "disconnected" | "unknown" | "error";
  config: Record<string, unknown>;
  sort_order: number;
};

export type RevenueDashboardMetrics = {
  todayRevenueMinor: number;
  monthRevenueMinor: number;
  recurringRevenueMinor: number;
  pendingPayoutsMinor: number;
  escrowBalanceMinor: number;
  walletBalanceMinor: number;
  platformCommissionMinor: number;
  transactionCountToday: number;
  transactionCountMonth: number;
  activeSubscriptions: number;
  topSources: Array<{ source: string; amountMinor: number; count: number }>;
  monthlySeries: Array<{ month: string; amountMinor: number }>;
  dailySeries: Array<{ day: string; amountMinor: number }>;
  categoryBreakdown: Array<{ category: string; amountMinor: number }>;
};

const RULES_CACHE_TTL_MS = 60_000;
let rulesCache: { expiresAt: number; rules: RevenueRule[] } | null = null;

function mapRule(row: Record<string, unknown>): RevenueRule {
  return {
    id: String(row.id),
    rule_key: String(row.rule_key),
    label: String(row.label),
    category: String(row.category),
    enabled: Boolean(row.enabled),
    fee_type: row.fee_type as FeeType,
    fee_value: row.fee_value == null ? null : Number(row.fee_value),
    fee_value_secondary: row.fee_value_secondary == null ? null : Number(row.fee_value_secondary),
    currency: String(row.currency || "GHS"),
    min_fee: row.min_fee == null ? null : Number(row.min_fee),
    max_fee: row.max_fee == null ? null : Number(row.max_fee),
    applies_to: (row.applies_to as Record<string, unknown>) || {},
    metadata: (row.metadata as Record<string, unknown>) || {},
    effective_from: (row.effective_from as string) || null,
    effective_until: (row.effective_until as string) || null,
    sort_order: Number(row.sort_order || 0),
    updated_at: String(row.updated_at),
  };
}

function isRuleEffective(rule: RevenueRule, at = new Date()) {
  if (!rule.enabled) return false;
  if (rule.effective_from && new Date(rule.effective_from) > at) return false;
  if (rule.effective_until && new Date(rule.effective_until) < at) return false;
  return true;
}

export const revenueManagementService = {
  async listRules(category?: string) {
    let query = supabase.from("revenue_rules").select("*").order("sort_order", { ascending: true });
    if (category) query = query.eq("category", category);
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapRule);
  },

  async getRule(ruleKey: string) {
    const { data, error } = await supabase
      .from("revenue_rules")
      .select("*")
      .eq("rule_key", ruleKey)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRule(data) : null;
  },

  async upsertRule(rule: Partial<RevenueRule> & { rule_key: string; label: string; category: string }) {
    const payload = {
      ...rule,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("revenue_rules")
      .upsert(payload, { onConflict: "rule_key" })
      .select("*")
      .single();
    if (error) throw error;
    rulesCache = null;
    return mapRule(data);
  },

  async setRuleEnabled(ruleKey: string, enabled: boolean) {
    const { data, error } = await supabase
      .from("revenue_rules")
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq("rule_key", ruleKey)
      .select("*")
      .single();
    if (error) throw error;
    rulesCache = null;
    return mapRule(data);
  },

  async getActiveRules() {
    if (rulesCache && rulesCache.expiresAt > Date.now()) {
      return rulesCache.rules.filter((rule) => isRuleEffective(rule));
    }
    const { data, error } = await supabase.from("revenue_rules").select("*").eq("enabled", true);
    if (error) throw error;
    const rules = (data || []).map(mapRule).filter((rule) => isRuleEffective(rule));
    rulesCache = { rules, expiresAt: Date.now() + RULES_CACHE_TTL_MS };
    return rules;
  },

  async listPlans() {
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      plan_key: row.plan_key,
      name: row.name,
      description: row.description,
      price_amount: row.price_amount == null ? null : Number(row.price_amount),
      currency: row.currency,
      billing_cycle: row.billing_cycle,
      features: Array.isArray(row.features) ? row.features : [],
      is_active: row.is_active,
      is_custom_pricing: row.is_custom_pricing,
      sort_order: row.sort_order,
    })) as SubscriptionPlan[];
  },

  async upsertPlan(plan: Partial<SubscriptionPlan> & { plan_key: string; name: string }) {
    const { data, error } = await supabase
      .from("subscription_plans")
      .upsert({ ...plan, updated_at: new Date().toISOString() }, { onConflict: "plan_key" })
      .select("*")
      .single();
    if (error) throw error;
    return data as SubscriptionPlan;
  },

  async listPromoCodes() {
    const { data, error } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as PromoCode[];
  },

  async upsertPromoCode(promo: Partial<PromoCode> & { code: string; discount_value: number }) {
    const { data, error } = await supabase
      .from("promo_codes")
      .upsert({ ...promo, updated_at: new Date().toISOString() }, { onConflict: "code" })
      .select("*")
      .single();
    if (error) throw error;
    return data as PromoCode;
  },

  async listPaymentGateways() {
    const { data, error } = await supabase
      .from("payment_gateways")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data || []) as PaymentGateway[];
  },

  async upsertPaymentGateway(gateway: Partial<PaymentGateway> & { gateway_key: string; display_name: string }) {
    const { data, error } = await supabase
      .from("payment_gateways")
      .upsert({ ...gateway, updated_at: new Date().toISOString() }, { onConflict: "gateway_key" })
      .select("*")
      .single();
    if (error) throw error;
    return data as PaymentGateway;
  },

  async getSettings() {
    const { data, error } = await supabase.from("platform_settings").select("*");
    if (error) throw error;
    const settings: Record<string, unknown> = {};
    for (const row of data || []) {
      settings[row.key] = row.value;
    }
    return settings;
  },

  async setSetting(key: string, value: unknown, description?: string) {
    const { data, error } = await supabase
      .from("platform_settings")
      .upsert(
        {
          key,
          value,
          description,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      )
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async getDashboardMetrics(): Promise<RevenueDashboardMetrics> {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      { data: todayTxns },
      { data: monthTxns },
      { data: escrowHolds },
      { data: userWallets },
      { data: orgWallets },
      { data: commissions },
      { data: payoutRequests },
      { data: activePlans },
    ] = await Promise.all([
      supabase
        .from("property_transactions")
        .select("amount_minor, purpose, status, created_at")
        .eq("status", "success")
        .gte("created_at", startOfDay.toISOString()),
      supabase
        .from("property_transactions")
        .select("amount_minor, purpose, status, created_at")
        .eq("status", "success")
        .gte("created_at", startOfMonth.toISOString()),
      supabase.from("escrow_holds").select("amount_minor, status").in("status", ["held", "partially_released"]),
      supabase.from("user_wallets").select("available_balance_minor, escrow_balance_minor"),
      supabase.from("organization_wallets").select("available_balance_minor"),
      supabase
        .from("commissions")
        .select("amount, status, earned_at, revenue_model")
        .gte("earned_at", startOfMonth.toISOString()),
      supabase
        .from("wallet_payout_requests")
        .select("amount_minor, status")
        .in("status", ["pending", "processing"]),
      supabase.from("subscription_plans").select("id").eq("is_active", true),
    ]);

    const sumMinor = (rows: Array<{ amount_minor?: number | null }> | null) =>
      (rows || []).reduce((total, row) => total + Number(row.amount_minor || 0), 0);

    const todayRevenueMinor = sumMinor(todayTxns);
    const monthRevenueMinor = sumMinor(monthTxns);

    const escrowBalanceMinor = (escrowHolds || []).reduce(
      (total, row) => total + Number(row.amount_minor || 0),
      0,
    );

    const walletBalanceMinor =
      (userWallets || []).reduce(
        (total, row) =>
          total + Number(row.available_balance_minor || 0) + Number(row.escrow_balance_minor || 0),
        0,
      ) + (orgWallets || []).reduce((total, row) => total + Number(row.available_balance_minor || 0), 0);

    const pendingPayoutsMinor = (payoutRequests || []).reduce(
      (total, row) => total + Number(row.amount_minor || 0),
      0,
    );

    const platformCommissionMinor = (commissions || [])
      .filter((row) => row.status !== "reversed")
      .reduce((total, row) => total + Number(row.amount || 0) * 100, 0);

    const sourceMap = new Map<string, { amountMinor: number; count: number }>();
    for (const txn of monthTxns || []) {
      const source = String(txn.purpose || "other");
      const current = sourceMap.get(source) || { amountMinor: 0, count: 0 };
      current.amountMinor += Number(txn.amount_minor || 0);
      current.count += 1;
      sourceMap.set(source, current);
    }

    const topSources = [...sourceMap.entries()]
      .map(([source, stats]) => ({ source, ...stats }))
      .sort((a, b) => b.amountMinor - a.amountMinor)
      .slice(0, 6);

    const monthlySeries = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const amountMinor = (monthTxns || [])
        .filter((txn) => String(txn.created_at).startsWith(key))
        .reduce((total, txn) => total + Number(txn.amount_minor || 0), 0);
      return { month: key, amountMinor };
    });

    const dailySeries = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      const amountMinor = (monthTxns || [])
        .filter((txn) => String(txn.created_at).startsWith(key))
        .reduce((total, txn) => total + Number(txn.amount_minor || 0), 0);
      return { day: key, amountMinor };
    });

    const plans = await this.listPlans().catch(() => []);
    const recurringRevenueMinor = plans
      .filter((plan) => plan.is_active && !plan.is_custom_pricing && plan.price_amount)
      .reduce((total, plan) => total + Number(plan.price_amount) * 100, 0);

    return {
      todayRevenueMinor,
      monthRevenueMinor,
      recurringRevenueMinor,
      pendingPayoutsMinor,
      escrowBalanceMinor,
      walletBalanceMinor,
      platformCommissionMinor,
      transactionCountToday: todayTxns?.length || 0,
      transactionCountMonth: monthTxns?.length || 0,
      activeSubscriptions: activePlans?.length || 0,
      topSources,
      monthlySeries,
      dailySeries,
      categoryBreakdown: topSources.map((item) => ({
        category: item.source,
        amountMinor: item.amountMinor,
      })),
    };
  },
};
