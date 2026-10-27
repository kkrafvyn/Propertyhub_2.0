import { MARKETING_FAQ } from '../app/components/marketing/editorial/marketing-editorial-data';

export const MARKETING_IMAGE_IDS = ['residences', 'interior', 'community', 'architecture', 'commercial'] as const;
export type MarketingImageId = typeof MARKETING_IMAGE_IDS[number];
export type MarketingOutcome = { title: string; detail: string };

export type MarketingPageDocument = {
  hero: { eyebrow: string; title: string; secondLine: string; description: string; images: MarketingImageId[] };
  seo: { title: string; description: string };
  proofOutcomes: MarketingOutcome[];
  faq: { q: string; a: string }[];
  finalCta: { title: string; description: string };
  sections: { title: string; body: string }[];
};

const DEFAULT_PROOF_OUTCOMES: MarketingOutcome[] = [
  { title: 'One connected record', detail: 'Keep property, unit, lease, collection, document, and work-order context connected across the app.' },
  { title: 'A clear operating view', detail: 'See occupancy, collections, renewals, approvals, and open work without piecing together exports.' },
  { title: 'Work that moves visibly', detail: 'Move enquiries, applications, maintenance, and approvals through clear, trackable stages.' },
];

export const DEFAULT_MARKETING_DOCUMENT: MarketingPageDocument = {
  hero: { eyebrow: 'One app for property operations', title: 'Every property.', secondLine: 'One clear picture.', description: 'Bring listings, leasing, payments and maintenance together—so your team can run the portfolio with clarity.', images: [...MARKETING_IMAGE_IDS] },
  seo: { title: 'BaytMiftah — Property operations in one workspace', description: 'Run listings, leasing, collections, maintenance, documents, and portfolio reporting from one property operations app.' },
  proofOutcomes: DEFAULT_PROOF_OUTCOMES.map((item) => ({ ...item })),
  faq: MARKETING_FAQ.map(item => ({...item})),
  finalCta: { title: 'Bring your property operation together', description: 'Start with one workspace and add the modules you need.' },
  sections: [],
};

/** Plain-text content only. Conversion URLs and interactive modules remain product-owned. */
export function validateMarketingDocument(input: unknown): MarketingPageDocument {
  const value = input as MarketingPageDocument;
  const text = (v: unknown, name: string, max: number) => {
    if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`${name} is required (maximum ${max} characters).`);
  };
  text(value?.hero?.eyebrow, 'Hero eyebrow', 100);
  text(value?.hero?.title, 'Headline', 100);
  text(value?.hero?.secondLine, 'Second headline line', 100);
  text(value?.hero?.description, 'Hero description', 500);
  text(value?.seo?.title, 'Page title', 150); text(value?.seo?.description, 'Page description', 500);
  text(value?.finalCta?.title, 'Final heading', 150); text(value?.finalCta?.description, 'Final description', 500);
  let proofOutcomes = value?.proofOutcomes;
  if (!Array.isArray(proofOutcomes) || proofOutcomes.length !== 3) {
    proofOutcomes = DEFAULT_PROOF_OUTCOMES.map((item) => ({ ...item }));
  }
  proofOutcomes.forEach((item, index) => {
    text(item?.title, `Outcome ${index + 1} title`, 120);
    text(item?.detail, `Outcome ${index + 1} detail`, 400);
  });
  if (!Array.isArray(value.hero.images) || value.hero.images.length < 4 || value.hero.images.length > 5 || new Set(value.hero.images).size !== value.hero.images.length || value.hero.images.some(id => !MARKETING_IMAGE_IDS.includes(id))) throw new Error('Choose four or five different photographs from the licensed image library.');
  if (!Array.isArray(value.faq) || value.faq.length < 1 || value.faq.length > 12) throw new Error('Provide 1–12 FAQs.');
  value.faq.forEach(item => { text(item.q, 'FAQ question', 200); text(item.a, 'FAQ answer', 1500); });
  if (!Array.isArray(value.sections) || value.sections.length > 8) throw new Error('Add at most eight content sections.');
  value.sections.forEach(item => { text(item.title, 'Section title', 150); text(item.body, 'Section text', 2000); });
  return structuredClone({ ...value, proofOutcomes });
}
