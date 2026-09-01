import { describe, it, expect } from 'vitest';
import { aiLeaseAnalyzerService } from './ai-lease-analyzer.service';

describe('aiLeaseAnalyzerService', () => {
  describe('analyzeLease', () => {
    it('detects unlawful advance rent (>6 months) and flags critical violation', () => {
      const sampleWith2Years = 'The Tenant agrees to pay 2 years advance rent upfront.';
      const result = aiLeaseAnalyzerService.analyzeLease(sampleWith2Years);

      const advRule = result.rules.find((r) => r.category === 'advance_rent');
      expect(advRule).toBeDefined();
      expect(advRule?.isCompliant).toBe(false);
      expect(advRule?.severity).toBe('critical_violation');
      expect(advRule?.ghanaLawCitation).toContain('Act 220');
      expect(result.violationsCount).toBeGreaterThanOrEqual(1);
    });

    it('passes compliant 6-month advance rent clause', () => {
      const compliantLease = 'The Tenant shall pay 6 months advance rent in accordance with Act 220.';
      const result = aiLeaseAnalyzerService.analyzeLease(compliantLease);

      const advRule = result.rules.find((r) => r.category === 'advance_rent');
      expect(advRule).toBeDefined();
      expect(advRule?.isCompliant).toBe(true);
    });

    it('detects illegal self-help eviction clauses', () => {
      const lockoutLease = 'The Landlord reserves the right to lock the unit within 48 hours without court proceedings.';
      const result = aiLeaseAnalyzerService.analyzeLease(lockoutLease);

      const evictionRule = result.rules.find((r) => r.category === 'eviction_notice');
      expect(evictionRule?.isCompliant).toBe(false);
      expect(evictionRule?.severity).toBe('critical_violation');
    });

    it('detects unfair tenant structural maintenance liabilities', () => {
      const repairLease = 'The tenant is responsible for structural defects, roof leaks, and borehole repairs.';
      const result = aiLeaseAnalyzerService.analyzeLease(repairLease);

      const repairRule = result.rules.find((r) => r.category === 'maintenance_repairs');
      expect(repairRule?.isCompliant).toBe(false);
      expect(repairRule?.severity).toBe('high_risk');
    });
  });

  describe('verifyGhanaCard', () => {
    it('validates official Ghana Card format', () => {
      expect(aiLeaseAnalyzerService.verifyGhanaCard('GHA-712894019-2')).toBe(true);
      expect(aiLeaseAnalyzerService.verifyGhanaCard('gha-123456789-0')).toBe(true);
    });

    it('rejects invalid format strings', () => {
      expect(aiLeaseAnalyzerService.verifyGhanaCard('123456')).toBe(false);
      expect(aiLeaseAnalyzerService.verifyGhanaCard('GHA-123')).toBe(false);
      expect(aiLeaseAnalyzerService.verifyGhanaCard('NGN-712894019-2')).toBe(false);
    });
  });

  describe('ocrExtractFromDocument', () => {
    it('extracts OCR text from simulated document upload', async () => {
      const res = await aiLeaseAnalyzerService.ocrExtractFromDocument('Airport_Residential_Lease_2026.pdf');
      expect(res.title).toBe('Airport_Residential_Lease_2026.pdf');
      expect(res.extractedText).toContain('TENANCY AGREEMENT');
    });
  });
});
