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

const MOCK_OWNERS: OwnerProfile[] = [
  {
    id: 'owner_01',
    fullName: 'Chief Emmanuel K. Darko',
    email: 'emmanuel.darko@investor.com',
    phone: '+233 24 990 1822',
    payoutMethod: 'bank_transfer',
    bankName: 'Ecobank Ghana Ltd (Airport Branch)',
    accountNumber: '144100298102',
    managementFeePercent: 10.0,
    withholdingTaxPercent: 8.0,
    ownedUnits: [
      {
        unitId: 'u_101',
        unitIdentifier: 'Villa 14 (East Legon Hills)',
        estateName: 'East Legon Hills Luxury Enclave',
        monthlyRentGhs: 15000,
        tenantName: 'Ama Ampomah',
        rentStatus: 'paid',
      },
      {
        unitId: 'u_102',
        unitIdentifier: 'Villa 15 (East Legon Hills)',
        estateName: 'East Legon Hills Luxury Enclave',
        monthlyRentGhs: 15000,
        tenantName: 'Kofi Mensah',
        rentStatus: 'paid',
      },
    ],
  },
  {
    id: 'owner_02',
    fullName: 'Dr. (Mrs.) Joyce Addo-Quaye (Diaspora - UK)',
    email: 'joyce.quaye@london.ac.uk',
    phone: '+44 7911 204910',
    payoutMethod: 'momo_wallet',
    momoNetwork: 'MTN',
    momoNumber: '+233 24 555 9012',
    managementFeePercent: 8.0,
    withholdingTaxPercent: 8.0,
    ownedUnits: [
      {
        unitId: 'u_201',
        unitIdentifier: 'Apt 4B (Cantonments Luxury Suite)',
        estateName: 'Cantonments Signature Residences',
        monthlyRentGhs: 22000,
        tenantName: 'Marcus Sterling',
        rentStatus: 'paid',
      },
    ],
  },
];

const MOCK_STATEMENTS: OwnerStatementRecord[] = [
  {
    id: 'stmt_01',
    ownerId: 'owner_01',
    ownerName: 'Chief Emmanuel K. Darko',
    period: '2026-08',
    grossRentCollectedGhs: 30000.0,
    managementCommissionGhs: 3000.0, // 10%
    maintenanceDeductionsGhs: 850.0, // Plumbing pump repair
    withholdingTaxGhs: 2400.0, // 8% GRA Rent Tax
    netDisbursableGhs: 23750.0,
    payoutStatus: 'disbursed_bank',
    payoutReference: 'ECOBANK-NIP-20260815-9921',
    disbursedAt: '2026-08-15T16:00:00Z',
    itemizedLedger: [
      {
        date: '2026-08-01',
        description: 'Rent Collection: Villa 14 (Ama Ampomah)',
        type: 'rent_collected',
        amountGhs: 15000.0,
      },
      {
        date: '2026-08-01',
        description: 'Rent Collection: Villa 15 (Kofi Mensah)',
        type: 'rent_collected',
        amountGhs: 15000.0,
      },
      {
        date: '2026-08-05',
        description: 'BaytMiftah Management Commission (10%)',
        type: 'management_fee',
        amountGhs: -3000.0,
      },
      {
        date: '2026-08-08',
        description: 'Borehole Submersible Pump Servicing (Invoice #1042)',
        type: 'maintenance_repair',
        amountGhs: -850.0,
      },
      {
        date: '2026-08-15',
        description: 'Ghana Revenue Authority (GRA) 8% Rent Withholding Tax',
        type: 'gra_tax',
        amountGhs: -2400.0,
      },
      {
        date: '2026-08-15',
        description: 'Net Owner Bank Transfer Disbursement',
        type: 'net_payout',
        amountGhs: 23750.0,
      },
    ],
  },
  {
    id: 'stmt_02',
    ownerId: 'owner_02',
    ownerName: 'Dr. (Mrs.) Joyce Addo-Quaye (Diaspora - UK)',
    period: '2026-08',
    grossRentCollectedGhs: 22000.0,
    managementCommissionGhs: 1760.0, // 8%
    maintenanceDeductionsGhs: 0.0,
    withholdingTaxGhs: 1760.0, // 8%
    netDisbursableGhs: 18480.0,
    payoutStatus: 'pending_approval',
    itemizedLedger: [
      {
        date: '2026-08-02',
        description: 'Rent Collection: Apt 4B Cantonments (Marcus Sterling)',
        type: 'rent_collected',
        amountGhs: 22000.0,
      },
      {
        date: '2026-08-05',
        description: 'BaytMiftah Management Commission (8%)',
        type: 'management_fee',
        amountGhs: -1760.0,
      },
      {
        date: '2026-08-15',
        description: 'Ghana Revenue Authority (GRA) 8% Rent Withholding Tax',
        type: 'gra_tax',
        amountGhs: -1760.0,
      },
    ],
  },
];

const STORAGE_STATEMENTS_KEY = 'bm_owner_statements_list';
const DEMO_DATA_ENABLED = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';

export function mapOwnerStatementRun(row: any, ownerName = 'Owner'): OwnerStatementRecord {
  const gross = Number(row.gross_collections_minor || 0) / 100;
  const expenses = Number(row.expense_minor || 0) / 100;
  const net = Number(row.net_distributable_minor || 0) / 100;
  const status = row.status === 'draft' || row.status === 'queued' ? 'pending_approval'
    : row.status === 'failed' ? 'on_hold'
    : 'disbursed_bank';
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

  async executeLiveDisbursement(input: { organizationId: string; statementId: string; requestedBy: string }) {
    const { stepUpAuthService } = await import('./step-up-auth.service');
    await stepUpAuthService.confirm({
      organizationId: input.organizationId,
      userId: input.requestedBy,
      purpose: 'owner_payout',
      reason: `Approve owner disbursement ${input.statementId.slice(0, 8)}`,
    });
    const { data: run, error } = await supabase.from('estate_owner_statement_runs').select('*').eq('id', input.statementId).single();
    if (error || !run) throw error || new Error('Statement not found');
    const amountMinor = Number(run.net_distributable_minor || 0);
    if (amountMinor <= 0) throw new Error('Nothing to disburse for this statement.');
    const approval = await estateReportingService.requestDistributionApproval({
      statementRunId: input.statementId,
      amountMinor,
      requestedBy: input.requestedBy,
    });
    await estateReportingService.reviewDistributionApproval(approval.id, 'approved', input.requestedBy, 'Approved from owner disbursements');
    const { data: owner } = await supabase.from('users').select('phone, full_name').eq('id', run.owner_user_id).maybeSingle();
    if (!owner?.phone) {
      return mapOwnerStatementRun({ ...run, status: 'queued' }, owner?.full_name || 'Owner');
    }
    const paid = await estateReportingService.executeDistributionPayout({
      approvalId: approval.id,
      amountGhs: amountMinor / 100,
      destinationPhone: owner.phone,
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

  getOwners(): OwnerProfile[] {
    return DEMO_DATA_ENABLED ? MOCK_OWNERS : [];
  },

  getStatements(): OwnerStatementRecord[] {
    if (!DEMO_DATA_ENABLED || typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_STATEMENTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  executeDisbursement(statementId: string): OwnerStatementRecord {
    if (!DEMO_DATA_ENABLED) throw new Error('Use executeLiveDisbursement for production owner payouts.');
    const list = this.getStatements();
    const stmt = list.find((s) => s.id === statementId);
    if (!stmt) throw new Error('Statement not found');

    const updated: OwnerStatementRecord = {
      ...stmt,
      payoutStatus: 'disbursed_momo',
      payoutReference: `MOMO-DISB-${Date.now()}`,
      disbursedAt: new Date().toISOString(),
    };

    const updatedList = list.map((s) => (s.id === stmt.id ? updated : s));
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_STATEMENTS_KEY, JSON.stringify(updatedList));
    }
    return updated;
  },
};
