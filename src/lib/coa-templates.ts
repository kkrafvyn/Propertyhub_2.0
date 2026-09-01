/**
 * BaytMiftah REOS — Ghana Property Chart of Accounts Templates
 *
 * Three standard templates tailored for Ghanaian property companies:
 *   - Residential (30 accounts)
 *   - Commercial  (35 accounts)
 *   - Mixed-use   (45 accounts)
 *
 * Call `seedChartOfAccounts(orgId, 'residential', userId)` on org creation.
 */

import { chartOfAccountsService, type AccountType, type BalanceType } from './chart-of-accounts.service';

interface TemplateAccount {
  code: string;
  name: string;
  type: AccountType;
  balanceType: BalanceType;
  description?: string;
  parentCode?: string; // resolved to parentAccountId during seeding
}

// ── Residential Template (30 accounts) ─────────────────────────────────────
const RESIDENTIAL_TEMPLATE: TemplateAccount[] = [
  // ASSETS
  { code: '1000', name: 'Cash & Bank', type: 'ASSET', balanceType: 'DEBIT', description: 'All cash and bank accounts' },
  { code: '1010', name: 'Mobile Money Float', type: 'ASSET', balanceType: 'DEBIT', parentCode: '1000' },
  { code: '1020', name: 'Bank — GCB Operating Account', type: 'ASSET', balanceType: 'DEBIT', parentCode: '1000' },
  { code: '1030', name: 'Petty Cash', type: 'ASSET', balanceType: 'DEBIT', parentCode: '1000' },
  { code: '1100', name: 'Accounts Receivable', type: 'ASSET', balanceType: 'DEBIT', description: 'Tenant rent and charge receivables' },
  { code: '1110', name: 'Rent Receivable', type: 'ASSET', balanceType: 'DEBIT', parentCode: '1100' },
  { code: '1120', name: 'Service Charge Receivable', type: 'ASSET', balanceType: 'DEBIT', parentCode: '1100' },
  { code: '1200', name: 'Security Deposits Held', type: 'ASSET', balanceType: 'DEBIT' },
  { code: '1300', name: 'Prepaid Expenses', type: 'ASSET', balanceType: 'DEBIT' },
  { code: '1900', name: 'Property Assets', type: 'ASSET', balanceType: 'DEBIT' },
  // LIABILITIES
  { code: '2000', name: 'Accounts Payable', type: 'LIABILITY', balanceType: 'CREDIT' },
  { code: '2010', name: 'Vendor Payables', type: 'LIABILITY', balanceType: 'CREDIT', parentCode: '2000' },
  { code: '2020', name: 'Contractor Payables', type: 'LIABILITY', balanceType: 'CREDIT', parentCode: '2000' },
  { code: '2100', name: 'Tenant Security Deposits Liability', type: 'LIABILITY', balanceType: 'CREDIT' },
  { code: '2200', name: 'Owner Disbursements Payable', type: 'LIABILITY', balanceType: 'CREDIT' },
  { code: '2300', name: 'GRA Tax Payable', type: 'LIABILITY', balanceType: 'CREDIT', description: '8% withholding rent tax' },
  // EQUITY
  { code: '3000', name: 'Owners Equity', type: 'EQUITY', balanceType: 'CREDIT' },
  { code: '3100', name: 'Retained Earnings', type: 'EQUITY', balanceType: 'CREDIT', parentCode: '3000' },
  // REVENUE
  { code: '4000', name: 'Rental Income', type: 'REVENUE', balanceType: 'CREDIT' },
  { code: '4010', name: 'Residential Rent', type: 'REVENUE', balanceType: 'CREDIT', parentCode: '4000' },
  { code: '4020', name: 'Service Charges', type: 'REVENUE', balanceType: 'CREDIT', parentCode: '4000' },
  { code: '4030', name: 'Utility Billing Income', type: 'REVENUE', balanceType: 'CREDIT', parentCode: '4000' },
  { code: '4040', name: 'Late Payment Penalties', type: 'REVENUE', balanceType: 'CREDIT', parentCode: '4000' },
  { code: '4100', name: 'Management Fee Income', type: 'REVENUE', balanceType: 'CREDIT' },
  // EXPENSES
  { code: '5000', name: 'Operating Expenses', type: 'EXPENSE', balanceType: 'DEBIT' },
  { code: '5010', name: 'Maintenance & Repairs', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5000' },
  { code: '5020', name: 'Cleaning & Security', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5000' },
  { code: '5030', name: 'Utilities (Landlord Portion)', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5000' },
  { code: '5040', name: 'Insurance', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5000' },
  { code: '5100', name: 'Administrative Expenses', type: 'EXPENSE', balanceType: 'DEBIT' },
];

// ── Commercial Template (35 accounts) ──────────────────────────────────────
const COMMERCIAL_TEMPLATE: TemplateAccount[] = [
  ...RESIDENTIAL_TEMPLATE,
  { code: '4050', name: 'Parking Revenue', type: 'REVENUE', balanceType: 'CREDIT', parentCode: '4000' },
  { code: '4060', name: 'Storage Revenue', type: 'REVENUE', balanceType: 'CREDIT', parentCode: '4000' },
  { code: '5050', name: 'Lift & Elevator Maintenance', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5000' },
  { code: '5060', name: 'CCTV & Access Control', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5000' },
  { code: '5070', name: 'Generator Fuel & Service', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5000' },
];

// ── Mixed-use Template (45 accounts) ───────────────────────────────────────
const MIXED_USE_TEMPLATE: TemplateAccount[] = [
  ...COMMERCIAL_TEMPLATE,
  { code: '4070', name: 'Retail Unit Rent', type: 'REVENUE', balanceType: 'CREDIT', parentCode: '4000' },
  { code: '4080', name: 'Short-stay / Serviced Apartment Revenue', type: 'REVENUE', balanceType: 'CREDIT', parentCode: '4000' },
  { code: '5080', name: 'Pool & Gym Maintenance', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5000' },
  { code: '5090', name: 'Landscaping', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5000' },
  { code: '5110', name: 'Staff Payroll', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5100' },
  { code: '5120', name: 'Professional Fees (Legal / Audit)', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5100' },
  { code: '2400', name: 'Advance Deposits Received', type: 'LIABILITY', balanceType: 'CREDIT' },
  { code: '1400', name: 'Intercompany Receivable', type: 'ASSET', balanceType: 'DEBIT' },
  { code: '2500', name: 'Intercompany Payable', type: 'LIABILITY', balanceType: 'CREDIT' },
  { code: '1500', name: 'VAT Input Credit', type: 'ASSET', balanceType: 'DEBIT' },
  { code: '2600', name: 'VAT Output Liability', type: 'LIABILITY', balanceType: 'CREDIT' },
  { code: '3200', name: 'Paid-in Capital', type: 'EQUITY', balanceType: 'CREDIT', parentCode: '3000' },
  { code: '4090', name: 'Event Space Rental', type: 'REVENUE', balanceType: 'CREDIT', parentCode: '4000' },
  { code: '5130', name: 'Marketing & Advertising', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5100' },
  { code: '5140', name: 'Depreciation', type: 'EXPENSE', balanceType: 'DEBIT', parentCode: '5100' },
];

export const COA_TEMPLATES = {
  residential: RESIDENTIAL_TEMPLATE,
  commercial: COMMERCIAL_TEMPLATE,
  'mixed-use': MIXED_USE_TEMPLATE,
} as const;

export type CoaTemplateName = keyof typeof COA_TEMPLATES;

/**
 * Seed a Chart of Accounts from a named template into an organisation.
 * Safe to call multiple times — skips accounts whose codes already exist.
 */
export async function seedChartOfAccounts(
  organizationId: string,
  template: CoaTemplateName,
  createdBy?: string
): Promise<{ seeded: number; skipped: number }> {
  const accounts = COA_TEMPLATES[template];
  const codeToId = new Map<string, string>();
  let seeded = 0;
  let skipped = 0;

  // Fetch existing codes so we can skip duplicates
  const existing = await chartOfAccountsService.listAccounts(organizationId);
  for (const a of existing) codeToId.set(a.account_code, a.id);

  // Process in order (parents before children — templates are pre-sorted)
  for (const acct of accounts) {
    if (codeToId.has(acct.code)) {
      skipped++;
      continue;
    }

    const parentAccountId = acct.parentCode ? codeToId.get(acct.parentCode) : undefined;

    const created = await chartOfAccountsService.createAccount({
      organizationId,
      accountCode: acct.code,
      accountName: acct.name,
      accountType: acct.type,
      balanceType: acct.balanceType,
      description: acct.description,
      parentAccountId,
      createdBy,
    });

    codeToId.set(acct.code, created.id);
    seeded++;
  }

  return { seeded, skipped };
}
