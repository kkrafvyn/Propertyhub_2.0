import { MARKETING_FAQ } from '../app/components/marketing/editorial/marketing-editorial-data';
import {
  DEFAULT_INTEGRATION_ITEMS,
  DEFAULT_MARKETING_EXTRAS,
  DEFAULT_MARKETING_ROLES,
  DEFAULT_WORKFLOW_COMPARE,
  type MarketingPageExtras,
} from './marketing-editorial-static';

export const MARKETING_IMAGE_IDS = [
  'residences',
  'interior',
  'community',
  'architecture',
  'commercial',
  'townhouse',
  'skyline',
  'amenities',
] as const;
export type MarketingImageId = typeof MARKETING_IMAGE_IDS[number];
export type MarketingOutcome = { title: string; detail: string };
export type MarketingIntro = { kicker: string; title: string; lead: string };

export type MarketingIntros = {
  productTour: MarketingIntro;
  workflow: MarketingIntro;
  portfolio: MarketingIntro;
  ai: MarketingIntro;
  trust: MarketingIntro;
  pricing: MarketingIntro;
  faqTitle: string;
  proofNote: string;
};

export type MarketingPageDocument = {
  hero: { eyebrow: string; title: string; secondLine: string; description: string; images: MarketingImageId[] };
  seo: { title: string; description: string };
  proofOutcomes: MarketingOutcome[];
  intros: MarketingIntros;
  faq: { q: string; a: string }[];
  finalCta: { title: string; description: string };
  sections: { title: string; body: string }[];
  extras: MarketingPageExtras;
};

export type { MarketingPageExtras } from './marketing-editorial-static';

const DEFAULT_PROOF_OUTCOMES: MarketingOutcome[] = [
  {
    title: 'One connected record',
    detail: 'Property, unit, lease, collection, document, and work-order context stay linked across consumer and workspace surfaces.',
  },
  {
    title: 'Eight surfaces, one OS',
    detail: 'Consumer and workspace on web and mobile — plus admin and desktop workspace — share auth, org data, and operational history.',
  },
  {
    title: 'Work that moves visibly',
    detail: 'Enquiries, applications, maintenance, and approvals progress through trackable stages instead of scattered follow-ups.',
  },
];

export const DEFAULT_MARKETING_INTROS: MarketingIntros = {
  productTour: {
    kicker: 'Interactive preview',
    title: 'Walk through a sample portfolio',
    lead: 'Explore illustrative workspace records based on real modules. Nothing here connects to production data or processes live payments.',
  },
  workflow: {
    kicker: 'One operating system',
    title: 'From fragmented follow-ups to linked records',
    lead: 'BaytMiftah connects listings, people, leases, money, maintenance, and messaging so every update stays in context.',
  },
  portfolio: {
    kicker: 'Connected modules',
    title: 'Every module stays in context',
    lead: 'Move from portfolio overview into the property, lease, collection, document, or task that needs attention.',
  },
  ai: {
    kicker: 'AI with context',
    title: 'Assistance grounded in your operation',
    lead: 'Workspace AI uses limited tools, action logs, and human approval. Examples below are samples — not live account data.',
  },
  trust: {
    kicker: 'Trust and safeguards',
    title: 'Know who did what, when, and why',
    lead: 'Role-based access, human approval for sensitive actions, and operational history keep every change accountable.',
  },
  pricing: {
    kicker: 'Plans',
    title: 'Choose the workspace you need',
    lead: 'Plan fit depends on portfolio size, enabled modules, and rollout support. Fees and regional availability are confirmed during onboarding.',
  },
  faqTitle: 'Practical questions',
  proofNote: 'Real Estate Operating System for Ghana-first operations — with international rules where enabled. Previews use illustrative data.',
};

export const DEFAULT_MARKETING_DOCUMENT: MarketingPageDocument = {
  hero: {
    eyebrow: 'Real Estate Operating System',
    title: 'Your property life.',
    secondLine: 'Your property business.',
    description:
      'Stop running properties, payments, maintenance, leasing, and teams across disconnected tools. BaytMiftah connects discovery, workspace operations, and trust — built for Ghana with cedis, SMS, and WhatsApp norms.',
    images: [...MARKETING_IMAGE_IDS],
  },
  seo: {
    title: 'BaytMiftah — Real Estate Operating System for property teams and consumers',
    description:
      'Connect listings, leasing, collections, maintenance, documents, and consumer journeys in one REOS. Web and mobile apps for workspace and marketplace.',
  },
  proofOutcomes: DEFAULT_PROOF_OUTCOMES.map((item) => ({ ...item })),
  intros: structuredClone(DEFAULT_MARKETING_INTROS),
  faq: MARKETING_FAQ.map((item) => ({ ...item })),
  finalCta: {
    title: 'Run real estate differently',
    description: 'Start a workspace, explore properties, or request a demo — one platform for operators and consumers.',
  },
  sections: [
    {
      title: 'Mobile apps in store review',
      body:
        'BaytMiftah consumer and workspace apps are rolling out on Google Play closed testing and Apple App Store review. Join the tester program via Contact while public store links go live.',
    },
    {
      title: 'Ghana-first, globally ready',
      body:
        'Cedis pricing, local trust workflows, SMS and WhatsApp omnichannel, and KYC paths reflect how property business runs in Ghana — with multi-currency and cross-border listing logic where your workspace enables it.',
    },
  ],
  extras: structuredClone(DEFAULT_MARKETING_EXTRAS),
};

function validateIntroBlock(value: unknown, fallback: MarketingIntro, label: string): MarketingIntro {
  const text = (v: unknown, name: string, max: number) => {
    if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`${name} is required (maximum ${max} characters).`);
  };
  const block = (value && typeof value === 'object') ? (value as MarketingIntro) : fallback;
  const intro = {
    kicker: typeof block.kicker === 'string' && block.kicker.trim() ? block.kicker : fallback.kicker,
    title: typeof block.title === 'string' && block.title.trim() ? block.title : fallback.title,
    lead: typeof block.lead === 'string' && block.lead.trim() ? block.lead : fallback.lead,
  };
  text(intro.kicker, `${label} kicker`, 80);
  text(intro.title, `${label} title`, 150);
  text(intro.lead, `${label} lead`, 500);
  return intro;
}

function validateCompareBlock(value: unknown, fallback: MarketingPageExtras['workflowCompare']['before'], label: string) {
  const text = (v: unknown, name: string, max: number) => {
    if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`${name} is required (maximum ${max} characters).`);
  };
  const block = (value && typeof value === 'object') ? value as MarketingPageExtras['workflowCompare']['before'] : fallback;
  const title = typeof block.title === 'string' && block.title.trim() ? block.title : fallback.title;
  text(title, `${label} title`, 80);
  const items = Array.isArray(block.items) ? block.items : fallback.items;
  if (items.length !== 3) throw new Error(`${label} needs exactly three bullet points.`);
  const normalized = items.map((item, index) => {
    text(item, `${label} bullet ${index + 1}`, 200);
    return item.trim();
  }) as [string, string, string];
  return { title, items: normalized };
}

function validateExtras(input: unknown): MarketingPageExtras {
  const fallback = DEFAULT_MARKETING_EXTRAS;
  const value = (input && typeof input === 'object') ? input as Partial<MarketingPageExtras> : {};
  const text = (v: unknown, name: string, max: number) => {
    if (typeof v !== 'string' || !v.trim() || v.length > max) throw new Error(`${name} is required (maximum ${max} characters).`);
  };

  const teams = validateIntroBlock(value.teams, fallback.teams, 'Teams section');
  const consumers = validateIntroBlock(value.consumers, fallback.consumers, 'Consumers section');
  const integrations = validateIntroBlock(value.integrations, fallback.integrations, 'Integrations section');

  const workflowCompare = {
    before: validateCompareBlock(value.workflowCompare?.before, DEFAULT_WORKFLOW_COMPARE.before, 'Workflow before'),
    after: validateCompareBlock(value.workflowCompare?.after, DEFAULT_WORKFLOW_COMPARE.after, 'Workflow after'),
  };

  let roles = Array.isArray(value.roles) && value.roles.length === 6 ? value.roles : fallback.roles;
  roles = roles.map((role, index) => {
    const fb = DEFAULT_MARKETING_ROLES[index] ?? DEFAULT_MARKETING_ROLES[0];
    const id = typeof role?.id === 'string' && role.id.trim() ? role.id : fb.id;
    const label = typeof role?.label === 'string' && role.label.trim() ? role.label : fb.label;
    text(label, `Role ${index + 1} label`, 60);
    const title = typeof role?.title === 'string' && role.title.trim() ? role.title : fb.title;
    text(title, `Role ${index + 1} title`, 200);
    const copy = typeof role?.copy === 'string' && role.copy.trim() ? role.copy : fb.copy;
    text(copy, `Role ${index + 1} copy`, 600);
    const metricsRaw = Array.isArray(role?.metrics) ? role.metrics : fb.metrics;
    if (metricsRaw.length !== 3) throw new Error(`Role ${index + 1} needs three metrics.`);
    const metrics = metricsRaw.map((metric, mi) => {
      const fbm = fb.metrics[mi];
      const ml = typeof metric?.label === 'string' && metric.label.trim() ? metric.label : fbm.label;
      const mv = typeof metric?.value === 'string' && metric.value.trim() ? metric.value : fbm.value;
      text(ml, `Role ${index + 1} metric ${mi + 1} label`, 80);
      text(mv, `Role ${index + 1} metric ${mi + 1} value`, 80);
      return { label: ml, value: mv };
    }) as MarketingPageExtras['roles'][number]['metrics'];
    return { id, label, title, copy, metrics };
  });

  const footerTagline = typeof value.footerTagline === 'string' && value.footerTagline.trim()
    ? value.footerTagline
    : fallback.footerTagline;
  text(footerTagline, 'Footer tagline', 200);

  const rl = value.resourceLinks ?? fallback.resourceLinks;
  const resourceLinks = {
    docsLabel: typeof rl.docsLabel === 'string' && rl.docsLabel.trim() ? rl.docsLabel : fallback.resourceLinks.docsLabel,
    docsHref: typeof rl.docsHref === 'string' && rl.docsHref.trim() ? rl.docsHref : fallback.resourceLinks.docsHref,
    statusLabel: typeof rl.statusLabel === 'string' && rl.statusLabel.trim() ? rl.statusLabel : fallback.resourceLinks.statusLabel,
    statusHref: typeof rl.statusHref === 'string' && rl.statusHref.trim() ? rl.statusHref : fallback.resourceLinks.statusHref,
  };
  text(resourceLinks.docsLabel, 'Docs link label', 80);
  text(resourceLinks.docsHref, 'Docs link URL', 300);
  text(resourceLinks.statusLabel, 'Status link label', 80);
  text(resourceLinks.statusHref, 'Status link URL', 300);

  const sl = value.storeLinks ?? fallback.storeLinks;
  const storeLinks = {
    showStrip: typeof sl.showStrip === 'boolean' ? sl.showStrip : fallback.storeLinks.showStrip,
    headline: typeof sl.headline === 'string' && sl.headline.trim() ? sl.headline : fallback.storeLinks.headline,
    lead: typeof sl.lead === 'string' && sl.lead.trim() ? sl.lead : fallback.storeLinks.lead,
    consumerPlayUrl: typeof sl.consumerPlayUrl === 'string' ? sl.consumerPlayUrl : '',
    consumerAppleUrl: typeof sl.consumerAppleUrl === 'string' ? sl.consumerAppleUrl : '',
    workspacePlayUrl: typeof sl.workspacePlayUrl === 'string' ? sl.workspacePlayUrl : '',
    workspaceAppleUrl: typeof sl.workspaceAppleUrl === 'string' ? sl.workspaceAppleUrl : '',
    fallbackHref: typeof sl.fallbackHref === 'string' && sl.fallbackHref.trim() ? sl.fallbackHref : fallback.storeLinks.fallbackHref,
    fallbackLabel: typeof sl.fallbackLabel === 'string' && sl.fallbackLabel.trim() ? sl.fallbackLabel : fallback.storeLinks.fallbackLabel,
  };
  text(storeLinks.headline, 'Store strip headline', 120);
  text(storeLinks.lead, 'Store strip lead', 400);
  text(storeLinks.fallbackHref, 'Store fallback link', 300);
  text(storeLinks.fallbackLabel, 'Store fallback label', 80);

  const ap = value.appPreviews ?? fallback.appPreviews;
  const appPreviews = {
    showConsumer: typeof ap.showConsumer === 'boolean' ? ap.showConsumer : fallback.appPreviews.showConsumer,
    showWorkspace: typeof ap.showWorkspace === 'boolean' ? ap.showWorkspace : fallback.appPreviews.showWorkspace,
    consumerVideoSrc: typeof ap.consumerVideoSrc === 'string' && ap.consumerVideoSrc.trim() ? ap.consumerVideoSrc : fallback.appPreviews.consumerVideoSrc,
    workspaceVideoSrc: typeof ap.workspaceVideoSrc === 'string' && ap.workspaceVideoSrc.trim() ? ap.workspaceVideoSrc : fallback.appPreviews.workspaceVideoSrc,
    consumerPosterSrc: typeof ap.consumerPosterSrc === 'string' && ap.consumerPosterSrc.trim() ? ap.consumerPosterSrc : fallback.appPreviews.consumerPosterSrc,
    workspacePosterSrc: typeof ap.workspacePosterSrc === 'string' && ap.workspacePosterSrc.trim() ? ap.workspacePosterSrc : fallback.appPreviews.workspacePosterSrc,
  };
  text(appPreviews.consumerVideoSrc, 'Consumer preview video', 300);
  text(appPreviews.workspaceVideoSrc, 'Workspace preview video', 300);

  let integrationItems = Array.isArray(value.integrationItems) && value.integrationItems.length === 3
    ? value.integrationItems
    : fallback.integrationItems;
  integrationItems = integrationItems.map((item, index) => {
    const fb = DEFAULT_INTEGRATION_ITEMS[index];
    const name = typeof item?.name === 'string' && item.name.trim() ? item.name : fb.name;
    const detail = typeof item?.detail === 'string' && item.detail.trim() ? item.detail : fb.detail;
    text(name, `Integration ${index + 1} name`, 80);
    text(detail, `Integration ${index + 1} detail`, 500);
    return { name, detail };
  });

  return {
    teams,
    consumers,
    integrations,
    integrationItems,
    workflowCompare,
    roles,
    footerTagline,
    resourceLinks,
    storeLinks,
    appPreviews,
  };
}

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
  const introSource = (value?.intros ?? {}) as Partial<MarketingIntros>;
  const introKeys: (keyof Omit<MarketingIntros, 'faqTitle' | 'proofNote'>)[] = [
    'productTour', 'workflow', 'portfolio', 'ai', 'trust', 'pricing',
  ];
  const intros = {} as MarketingIntros;
  for (const key of introKeys) {
    intros[key] = validateIntroBlock(introSource[key], DEFAULT_MARKETING_INTROS[key], key);
  }
  intros.faqTitle = typeof introSource.faqTitle === 'string' && introSource.faqTitle.trim() ? introSource.faqTitle : DEFAULT_MARKETING_INTROS.faqTitle;
  intros.proofNote = typeof introSource.proofNote === 'string' && introSource.proofNote.trim() ? introSource.proofNote : DEFAULT_MARKETING_INTROS.proofNote;
  text(intros.faqTitle, 'FAQ section title', 150);
  text(intros.proofNote, 'Outcome band note', 200);
  if (!Array.isArray(value.hero.images) || value.hero.images.length < 4 || value.hero.images.length > MARKETING_IMAGE_IDS.length || new Set(value.hero.images).size !== value.hero.images.length || value.hero.images.some(id => !MARKETING_IMAGE_IDS.includes(id))) throw new Error('Choose four to eight different photographs from the licensed image library.');
  if (!Array.isArray(value.faq) || value.faq.length < 1 || value.faq.length > 12) throw new Error('Provide 1–12 FAQs.');
  value.faq.forEach(item => { text(item.q, 'FAQ question', 200); text(item.a, 'FAQ answer', 1500); });
  if (!Array.isArray(value.sections) || value.sections.length > 8) throw new Error('Add at most eight content sections.');
  value.sections.forEach(item => { text(item.title, 'Section title', 150); text(item.body, 'Section text', 2000); });
  const extras = validateExtras(value?.extras);
  return structuredClone({ ...value, proofOutcomes, intros, extras });
}
