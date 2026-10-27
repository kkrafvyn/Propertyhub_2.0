import { describe, expect, it } from 'vitest';
import { DEFAULT_MARKETING_DOCUMENT, validateMarketingDocument } from './marketing-page-document';
import { canAccessAdminSection } from './platform-access';
import { PLATFORM_CONSOLE_GRANTS } from './platform-console-grants';
describe('marketing content and app management permissions', () => {
  it('keeps defaults valid and returns an independent copy', () => {
    const document=validateMarketingDocument(DEFAULT_MARKETING_DOCUMENT);
    document.hero.title='Changed'; expect(DEFAULT_MARKETING_DOCUMENT.hero.title).toBe('Every property.');
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
