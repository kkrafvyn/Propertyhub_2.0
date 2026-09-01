import { describe, it, expect, beforeEach } from 'vitest';
import { inspectionSyncService, type FieldInspectionDraft } from './inspection-sync.service';
import { TOTAL_INSPECTION_POINTS, INSPECTION_CATEGORIES } from './inspection-checklist.data';

describe('Offline-First Field Inspection Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates a complete 150-point standardized checklist for a new property inspection', () => {
    const draft = inspectionSyncService.createBlankInspection({
      organizationId: 'org_123',
      propertyName: 'Cantonments Embassy Suite 3A',
      inspectorId: 'insp_999',
      inspectorName: 'Chief Field Auditor',
      tenantName: 'Abena Osei',
      tenantPhone: '+233 20 123 4567',
      inspectionType: 'move_in',
      initialSecurityDepositPesewas: 1500000, // GHS 15,000.00
    });

    expect(draft.id).toBeDefined();
    expect(draft.status).toBe('draft');
    expect(draft.syncStatus).toBe('pending_offline');
    expect(draft.initialSecurityDepositPesewas).toBe(1500000);

    const itemsCount = Object.keys(draft.items).length;
    expect(itemsCount).toBe(TOTAL_INSPECTION_POINTS);
    expect(itemsCount).toBeGreaterThanOrEqual(100);

    // Check specific categories exist
    expect(draft.items['ext_main_gate']).toBeDefined();
    expect(draft.items['liv_main_ac']).toBeDefined();
    expect(draft.items['kitch_countertop']).toBeDefined();
    expect(draft.items['util_ecg_meter_seal']).toBeDefined();
    expect(draft.items['plumb_overhead_polytank']).toBeDefined();
  });

  it('calculates condition score and deposit deductions accurately', () => {
    const draft = inspectionSyncService.createBlankInspection({
      organizationId: 'org_123',
      propertyName: 'East Legon Townhouse 12',
      inspectorId: 'insp_999',
      inspectorName: 'Auditor A',
      inspectionType: 'move_out',
      initialSecurityDepositPesewas: 1000000, // GHS 10,000.00
    });

    // Mark 2 items as damaged with tenant liability
    draft.items['liv_walls_paint'].condition = 'damaged';
    draft.items['liv_walls_paint'].tenantLiability = true;
    draft.items['liv_walls_paint'].estimatedRepairCostPesewas = 120000; // GHS 1,200 repainting

    draft.items['bath_mast_vanity_sink'].condition = 'damaged';
    draft.items['bath_mast_vanity_sink'].tenantLiability = true;
    draft.items['bath_mast_vanity_sink'].estimatedRepairCostPesewas = 80000; // GHS 800 repair

    // Mark 1 item as poor without tenant liability (normal wear & tear)
    draft.items['ext_perimeter_wall'].condition = 'poor';
    draft.items['ext_perimeter_wall'].tenantLiability = false;
    draft.items['ext_perimeter_wall'].estimatedRepairCostPesewas = 50000; // GHS 500 landlord cost

    const summary = inspectionSyncService.calculateInspectionSummary(draft);

    expect(summary.damagedCount).toBe(3);
    // Total tenant deduction should only sum the 2 liable items: 120000 + 80000 = 200000 pesewas (GHS 2,000)
    expect(summary.totalDeductionsPesewas).toBe(200000);
    // Net refund = 1000000 - 200000 = 800000 pesewas (GHS 8,000)
    expect(summary.netDepositRefundPesewas).toBe(800000);
    expect(summary.deductions.length).toBe(2);
  });

  it('saves and retrieves offline drafts in localStorage queue', () => {
    const draft1 = inspectionSyncService.createBlankInspection({
      organizationId: 'org_accra',
      propertyName: 'Airport West Unit 1',
      inspectorId: 'insp_1',
      inspectorName: 'Inspector Kwame',
      inspectionType: 'routine',
    });

    const draft2 = inspectionSyncService.createBlankInspection({
      organizationId: 'org_accra',
      propertyName: 'Ridge Towers Unit 8',
      inspectorId: 'insp_1',
      inspectorName: 'Inspector Kwame',
      inspectionType: 'pre_lease',
    });

    const stored = inspectionSyncService.listLocalDrafts('org_accra');
    expect(stored.length).toBe(2);

    const queue = inspectionSyncService.getOfflineQueue();
    expect(queue).toContain(draft1.id);
    expect(queue).toContain(draft2.id);

    // Delete one draft
    inspectionSyncService.deleteLocalDraft(draft1.id);
    const updatedList = inspectionSyncService.listLocalDrafts('org_accra');
    expect(updatedList.length).toBe(1);
    expect(updatedList[0].id).toBe(draft2.id);
  });

  it('validates 10 structured inspection categories cover all critical systems', () => {
    expect(INSPECTION_CATEGORIES.length).toBe(10);
    const categoryKeys = INSPECTION_CATEGORIES.map((c) => c.key);

    expect(categoryKeys).toContain('exterior_entrance');
    expect(categoryKeys).toContain('living_dining');
    expect(categoryKeys).toContain('kitchen_pantry');
    expect(categoryKeys).toContain('master_suite');
    expect(categoryKeys).toContain('bathrooms');
    expect(categoryKeys).toContain('submetering_utilities');
    expect(categoryKeys).toContain('plumbing_water');
    expect(categoryKeys).toContain('security_safety');
    expect(categoryKeys).toContain('handover_keys');
  });
});
