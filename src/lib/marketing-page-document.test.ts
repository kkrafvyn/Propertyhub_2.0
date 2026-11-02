import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MARKETING_DOCUMENT, validateMarketingDocument } from './marketing-page-document';
import { canAccessAdminSection } from './platform-access';
import { PLATFORM_CONSOLE_GRANTS } from './platform-console-grants';
describe('marketing content and app management permissions', () => {
  it('keeps defaults valid and returns an independent copy', () => {
    const document=validateMarketingDocument(DEFAULT_MARKETING_DOCUMENT);
    document.hero.title='Changed'; expect(DEFAULT_MARKETING_DOCUMENT.hero.title).toBe('Your property life.');
  });
  it('exports homepage-default.json when EXPORT_MARKETING_CMS=1', () => {
    if (process.env.EXPORT_MARKETING_CMS !== '1') return;
    const document = validateMarketingDocument(DEFAULT_MARKETING_DOCUMENT);
    const out = path.join(process.cwd(), 'marketing', 'cms', 'homepage-default.json');
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, `${JSON.stringify(document, null, 2)}\n`);
  });
  it('rejects injected photo sources, missing text, and duplicate photos', () => {
    const document=structuredClone(DEFAULT_MARKETING_DOCUMENT);
    document.hero.images[0]='javascript:alert(1)' as any;
    expect(()=>validateMarketingDocument(document)).toThrow(/photographs/);
    document.hero.images=[...DEFAULT_MARKETING_DOCUMENT.hero.images];document.hero.images[1]=document.hero.images[0];
    expect(()=>validateMarketingDocument(document)).toThrow(/photographs/);
    document.hero.images=[...DEFAULT_MARKETING_DOCUMENT.hero.images];document.hero.description='';
    expect(()=>validateMarketingDocument(document)).toThrow(/Hero description/);
  });
  it('fills default proof outcomes when older published documents omit them', () => {
    const legacy = structuredClone(DEFAULT_MARKETING_DOCUMENT) as Record<string, unknown>;
    delete legacy.proofOutcomes;
    const document = validateMarketingDocument(legacy);
    expect(document.proofOutcomes).toHaveLength(3);
    expect(document.proofOutcomes[0].title).toMatch(/connected record/i);
  });
  it('fills default section intros when older published documents omit them', () => {
    const legacy = structuredClone(DEFAULT_MARKETING_DOCUMENT) as Record<string, unknown>;
    delete legacy.intros;
    const document = validateMarketingDocument(legacy);
    expect(document.intros.productTour.title).toMatch(/sample portfolio/i);
    expect(document.extras.teams.title.length).toBeGreaterThan(3);
    expect(document.intros.faqTitle.length).toBeGreaterThan(3);
    expect(document.intros.proofNote.length).toBeGreaterThan(3);
  });
  it('backfills individual intro fields left blank', () => {
    const partial = structuredClone(DEFAULT_MARKETING_DOCUMENT) as any;
    partial.intros.workflow = { kicker: 'Custom kicker', title: '', lead: '' };
    const document = validateMarketingDocument(partial);
    expect(document.intros.workflow.kicker).toBe('Custom kicker');
    expect(document.intros.workflow.title).toMatch(/linked records/i);
  });
  it('limits FAQ and new section content and disallows empty answers', () => {
    const document=structuredClone(DEFAULT_MARKETING_DOCUMENT);document.faq[0].a='';
    expect(()=>validateMarketingDocument(document)).toThrow(/FAQ answer/);
    document.faq=structuredClone(DEFAULT_MARKETING_DOCUMENT.faq);document.sections=Array.from({length:9},()=>({title:'Title',body:'Body'}));
    expect(()=>validateMarketingDocument(document)).toThrow(/eight/);
  });
  it('reserves marketing and app role management for actual platform admins', () => {
    const staff={platform_console_grants:Object.values(PLATFORM_CONSOLE_GRANTS)};
    for(const section of ['marketing','roles'] as const){
      expect(canAccessAdminSection(staff,section)).toBe(false);
      expect(canAccessAdminSection({is_platform_admin:true},section)).toBe(true);
      expect(canAccessAdminSection(null,section)).toBe(false);
    }
  });
});
