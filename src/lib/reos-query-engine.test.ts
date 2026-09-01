import { describe, expect, it } from 'vitest';
import { generateReosQueryBundle, parseNaturalLanguageToParams } from './reos-query-engine';

describe('REOS Query Engine', () => {
  it('parses natural language parameters correctly', () => {
    const params = parseNaturalLanguageToParams('Find 3 bed apartment in East Legon under 8000 GHS for rent');
    expect(params.bedrooms).toBe(3);
    expect(params.propertyType).toBe('apartment');
    expect(params.location).toBe('East Legon');
    expect(params.priceMax).toBe(8000);
    expect(params.listingType).toBe('rental');
  });

  it('generates multi-dialect bundles for property searches', () => {
    const bundle = generateReosQueryBundle('3-bed rental in Cantonments under 12000', 'search');
    expect(bundle.reosQl).toContain('FIND listings');
    expect(bundle.reosQl).toContain("location = 'Cantonments'");
    expect(bundle.sql).toContain('SELECT');
    expect(bundle.sql).toContain('FROM listings l');
    expect(bundle.supabaseJs).toContain("supabase\n  .from('listings')");
    expect(bundle.graphql).toContain('query SearchListings');
    expect(bundle.targetEntities).toContain('listings');
    expect(bundle.executable).toBe(true);
    expect(bundle.runTarget?.url).toContain('/search?q=');
  });

  it('generates finance and aged arrears queries', () => {
    const bundle = generateReosQueryBundle('Show overdue arrears > 30 days in Airport Residential', 'payments');
    expect(bundle.reosQl).toContain('QUERY ledger_charges');
    expect(bundle.reosQl).toContain('days_overdue >= 30');
    expect(bundle.sql).toContain('FROM units u');
    expect(bundle.sql).toContain('JOIN charges c');
    expect(bundle.supabaseJs).toContain("from('charges')");
    expect(bundle.targetEntities).toContain('charges');
    expect(bundle.executionPlan.rlsPolicy).toBe('tenant_and_org_isolation');
  });

  it('generates maintenance and SLA work order queries', () => {
    const bundle = generateReosQueryBundle('Query plumbing work orders breaching SLA', 'maintenance');
    expect(bundle.reosQl).toContain('QUERY maintenance_issues');
    expect(bundle.reosQl).toContain("category = 'plumbing'");
    expect(bundle.sql).toContain('FROM maintenance_issues mi');
    expect(bundle.sql).toContain('mi.sla_breached = true');
    expect(bundle.targetEntities).toContain('maintenance_issues');
    expect(bundle.targetEntities).toContain('vendors');
  });

  it('generates lease expiry queries', () => {
    const bundle = generateReosQueryBundle('Query active leases expiring in 60 days', 'documents');
    expect(bundle.reosQl).toContain('QUERY leases');
    expect(bundle.reosQl).toContain("end_date <= NOW() + INTERVAL '60 days'");
    expect(bundle.sql).toContain('FROM leases l');
    expect(bundle.targetEntities).toContain('leases');
  });
});
