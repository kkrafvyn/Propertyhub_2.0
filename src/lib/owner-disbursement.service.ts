/**
 * BaytMiftah REOS — Buildium-Grade Owner Disbursement & Investor Statement Service
 * 
 * Computes the complete rental income distribution waterfall:
 * Gross Rent Collected - Management Commission - Maintenance Holdbacks - GRA 8% Rent Tax = Net Payout.
 * Executes batch disbursements to Ghanaian bank accounts and Mobile Money wallets.
 */

import { supabase } from './supabase';
import { estateReportingService } from './estate-reporting.service';

export interface OwnerProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  payoutMethod: 'bank_transfer' | 'momo_wallet';
  bankName?: string; // e.g. "GCB Bank" | "Ecobank Ghana" | "Stanbic Bank"
  accountNumber?: string;
  momoNetwork?: 'MTN' | 'Telecel' | 'AT';
  momoNumber?: string;
  managementFeePercent: number; // e.g. 10%
  withholdingTaxPercent: number; // Ghana GRA Rent Tax standard is 8% for residential
  ownedUnits: {
    unitId: string;
    unitIdentifier: string; // e.g. "Villa 14"
    estateName: string;
    monthlyRentGhs: number;
    tenantName: string;
    rentStatus: 'paid' | 'overdue' | 'partial';
  }[];
}

export interface OwnerStatementRecord {
  id: string;
  ownerId: string;
  ownerName: string;
  period: string; // e.g. "2026-08"
  grossRentCollectedGhs: number;
  managementCommissionGhs: number;
  maintenanceDeductionsGhs: number;
  withholdingTaxGhs: number; // 8% GRA Rent Tax
  netDisbursableGhs: number;
  payoutStatus: 'pending_approval' | 'disbursed_momo' | 'disbursed_bank' | 'on_hold';
  payoutReference?: string;
  disbursedAt?: string;
  itemizedLedger: {
    date: string;
    description: string;
    type: 'rent_collected' | 'management_fee' | 'maintenance_repair' | 'gra_tax' | 'net_payout';
    amountGhs: number;
  }[];
}

export function mapOwnerStatementRun(row: any, ownerName = 'Owner'): OwnerStatementRecord {
  const gross = Number(row.gross_collections_minor || 0) / 100;
  const expenses = Number(row.expense_minor || 0) / 100;
  const net = Number(row.net_distributable_minor || 0) / 100;
  // Only provider-confirmed deliveries are paid. A generated, approved or
  // processing statement is not evidence of a successful disbursement.
  const status: OwnerStatementRecord['payoutStatus'] = row.status === 'delivered' && Boolean(row.payout_reference)
    ? 'disbursed_bank'
    : row.status === 'failed' || row.status === 'rejected'
      ? 'on_hold'
      : 'pending_approval';
  return {
    id: row.id,
    ownerId: row.owner_user_id,
    ownerName,
    period: `${row.period_start} → ${row.period_end}`,
    grossRentCollectedGhs: gross,
    managementCommissionGhs: expenses,
    maintenanceDeductionsGhs: 0,
    withholdingTaxGhs: 0,
    netDisbursableGhs: net,
    payoutStatus: status,
    payoutReference: row.payout_reference || undefined,
    disbursedAt: row.status === 'delivered' ? row.created_at : undefined,
    itemizedLedger: [
      { date: row.period_end, description: 'Gross collections', type: 'rent_collected', amountGhs: gross },
      { date: row.period_end, description: 'Operating expenses', type: 'maintenance_repair', amountGhs: -expenses },
      { date: row.period_end, description: 'Net distributable', type: 'net_payout', amountGhs: net },
    ],
  };
}

export const ownerDisbursementService = {
  async getLiveStatements(estateIds: string[]) {
    if (!estateIds.length) return [];
    const { data, error } = await supabase.from('estate_owner_statement_runs').select('*').in('estate_id', estateIds).order('period_end', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getLiveOwners(organizationId: string): Promise<OwnerProfile[]> {
    const { estateOperationsService } = await import('./estate-operations.service');
    const estates = await estateOperationsService.getEstates(organizationId);
    const units = await estateOperationsService.getUnits(estates.map((estate) => estate.id));
    const occupancies = await estateOperationsService.getOccupancies(units.map((unit) => unit.id));
    const ownerOccupancies = occupancies.filter((row) => row.role === 'owner' && !row.end_date);
    const ownerIds = [...new Set(ownerOccupancies.map((row) => row.user_id))];
    if (!ownerIds.length) return [];
    const { data: profiles, error } = await supabase.from('users').select('id, email, full_name, phone').in('id', ownerIds);
    if (error) throw error;
    const charges = await estateOperationsService.getCharges(units.map((unit) => unit.id));
    const estateNameById = Object.fromEntries(estates.map((estate) => [estate.id, estate.name]));
    const unitById = Object.fromEntries(units.map((unit) => [unit.id, unit]));
    return (profiles || []).map((profile: any) => {
      const owned = ownerOccupancies.filter((row) => row.user_id === profile.id);
      return {
        id: profile.id,
        fullName: profile.full_name || profile.email || 'Owner',
        email: profile.email || '',
        phone: profile.phone || '',
        payoutMethod: 'momo_wallet' as const,
        momoNumber: profile.phone || undefined,
        managementFeePercent: 10,
        withholdingTaxPercent: 8,
        ownedUnits: owned.map((row) => {
          const unit = unitById[row.unit_id];
          const rentCharges = charges.filter((charge) => charge.unit_id === row.unit_id && charge.type === 'rent');
          const monthly = rentCharges[0] ? Number(rentCharges[0].amount_minor) / 100 : 0;
          return {
            unitId: row.unit_id,
            unitIdentifier: unit?.identifier || row.unit_id,
            estateName: unit ? estateNameById[unit.estate_id] || 'Estate' : 'Estate',
            monthlyRentGhs: monthly,
            tenantName: '',
            rentStatus: 'paid' as const,
          };
        }),
      };
    });
  },

  async getLiveMappedStatements(organizationId: string): Promise<OwnerStatementRecord[]> {
    const { estateOperationsService } = await import('./estate-operations.service');
    const estates = await estateOperationsService.getEstates(organizationId);
    const rows = await this.getLiveStatements(estates.map((estate) => estate.id));
    const ownerIds = [...new Set(rows.map((row: any) => row.owner_user_id).filter(Boolean))];
    const { data: profiles } = ownerIds.length
      ? await supabase.from('users').select('id, full_name, email').in('id', ownerIds)
      : { data: [] };
    const nameById = Object.fromEntries((profiles || []).map((profile: any) => [profile.id, profile.full_name || profile.email || 'Owner']));
    return rows.map((row: any) => mapOwnerStatementRun(row, nameById[row.owner_user_id] || 'Owner'));
  },

  async executeLiveDisbursement(input: { organizationId: string; statementId: string; approvalId: string; requestedBy: string }) {
    const { stepUpAuthService } = await import('./step-up-auth.service');
    await stepUpAuthService.assertConfirmed(input.organizationId, input.requestedBy, 'owner_payout');

    const { data: run, error } = await supabase.from('estate_owner_statement_runs').select('*').eq('id', input.statementId).single();
    if (error || !run) throw error || new Error('Statement not found');
    const { data: approval, error: approvalError } = await supabase
      .from('estate_distribution_approvals')
      .select('id, requested_amount_minor, requested_by, reviewed_by, status, statement_run_id')
      .eq('id', input.approvalId)
      .eq('statement_run_id', input.statementId)
      .eq('status', 'approved')
      .single();
    if (approvalError || !approval) throw approvalError || new Error('An approved distribution is required.');
    if (approval.requested_by === input.requestedBy || approval.reviewed_by === input.requestedBy) {
      throw new Error('Payout requester and approver must be different identities.');
    }

    const amountMinor = Number(run.net_distributable_minor || 0);
    if (Number(approval.requested_amount_minor) !== amountMinor) {
      throw new Error('Approved payout amount no longer matches the trusted statement.');
    }
    if (amountMinor <= 0) throw new Error('Nothing to disburse for this statement.');

    const { data: owner } = await supabase.from('users').select('full_name').eq('id', run.owner_user_id).maybeSingle();
    const { data: payoutMethod, error: payoutMethodError } = await supabase
      .from('owner_payout_methods')
      .select('method_type, currency, destination, status')
      .eq('owner_user_id', run.owner_user_id)
      .eq('organization_id', input.organizationId)
      .eq('status', 'verified')
      .eq('is_default', true)
      .maybeSingle();
    if (payoutMethodError) throw payoutMethodError;
    if (!payoutMethod) throw new Error('Owner payout requires a verified owner-bound payout method.');
    if (String(payoutMethod.currency).toUpperCase() !== String(run.currency).toUpperCase()) {
      throw new Error('Payout currency does not match the statement currency.');
    }

    const paid = await estateReportingService.executeDistributionPayout({
      approvalId: input.approvalId,
      amountGhs: amountMinor / 100,
      destinationPhone: payoutMethod.destination,
    });
    return mapOwnerStatementRun(
      { ...run, status: paid.status === 'paid' ? 'delivered' : 'queued', payout_reference: paid.payout_reference },
      owner.full_name || 'Owner'
    );
  },

  async requestLiveDistribution(statementRunId: string, amountMinor: number, requestedBy: string) {
    return estateReportingService.requestDistributionApproval({ statementRunId, amountMinor, requestedBy });
  },

  async reviewLiveDistribution(approvalId: string, decision: 'approved' | 'rejected', reviewedBy: string, note?: string) {
    return estateReportingService.reviewDistributionApproval(approvalId, decision, reviewedBy, note);
  },
};
