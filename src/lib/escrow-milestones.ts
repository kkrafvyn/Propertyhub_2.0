import { buildDefaultEscrowMilestoneDrafts } from "./production-depth.helpers";
import { supabase } from "./supabase";

const db = supabase as any;

function getEscrowDealCaseId(escrow: any) {
  return escrow?.transaction?.deal_case_id || escrow?.deal_case_id || null;
}

function buildSuggestedMilestones(escrow: any) {
  const drafts = buildDefaultEscrowMilestoneDrafts({
    dealCase: {
      id: getEscrowDealCaseId(escrow),
      listing_type: escrow?.listing?.listing_type || escrow?.transaction?.listing_type || "rental",
      listing: {
        id: escrow?.listing?.id || null,
        listing_type: escrow?.listing?.listing_type || escrow?.transaction?.listing_type || "rental",
        currency: escrow?.listing?.currency || escrow?.currency || "GHS",
        property: escrow?.listing?.property || null,
      },
    },
  });

  return drafts.map((draft, index) => ({
    ...draft,
    id: `suggested-${escrow?.id || "escrow"}-${index}`,
    is_suggested: true,
  }));
}

async function loadMilestonesByDealCaseId(escrows: any[]) {
  const dealCaseIds = [...new Set(escrows.map(getEscrowDealCaseId).filter(Boolean))];

  if (dealCaseIds.length === 0) {
    return new Map<string, any[]>();
  }

  try {
    const { data, error } = await db
      .from("escrow_milestones")
      .select("*")
      .in("deal_case_id", dealCaseIds)
      .order("due_at", { ascending: true });

    if (error) throw error;

    return (data || []).reduce((lookup: Map<string, any[]>, milestone: any) => {
      const dealCaseId = String(milestone.deal_case_id || "");
      if (!dealCaseId) return lookup;

      const current = lookup.get(dealCaseId) || [];
      current.push(milestone);
      lookup.set(dealCaseId, current);
      return lookup;
    }, new Map<string, any[]>());
  } catch (error) {
    console.error("Failed to load escrow milestones:", error);
    return new Map<string, any[]>();
  }
}

export async function attachEscrowMilestones(escrows: any[]) {
  if (!Array.isArray(escrows) || escrows.length === 0) {
    return [];
  }

  const milestoneLookup = await loadMilestonesByDealCaseId(escrows);

  return escrows.map((escrow) => {
    const dealCaseId = getEscrowDealCaseId(escrow);
    const persistedMilestones = dealCaseId ? milestoneLookup.get(dealCaseId) || [] : [];

    return {
      ...escrow,
      milestones: persistedMilestones.length > 0 ? persistedMilestones : buildSuggestedMilestones(escrow),
    };
  });
}

export async function attachEscrowMilestonesToTransactions(transactions: any[]) {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  const normalizedEscrows = transactions.flatMap((transaction) => {
    if (Array.isArray(transaction.escrow)) {
      return transaction.escrow.filter(Boolean);
    }

    return transaction.escrow ? [transaction.escrow] : [];
  });

  const enrichedEscrows = await attachEscrowMilestones(normalizedEscrows);
  const escrowLookup = enrichedEscrows.reduce((lookup: Map<string, any>, escrow: any) => {
    if (escrow?.id) {
      lookup.set(escrow.id, escrow);
    }
    return lookup;
  }, new Map<string, any>());

  return transactions.map((transaction) => {
    if (Array.isArray(transaction.escrow)) {
      return {
        ...transaction,
        escrow: transaction.escrow.map((escrow: any) => escrowLookup.get(escrow.id) || escrow),
      };
    }

    if (transaction.escrow?.id) {
      return {
        ...transaction,
        escrow: escrowLookup.get(transaction.escrow.id) || transaction.escrow,
      };
    }

    return transaction;
  });
}
