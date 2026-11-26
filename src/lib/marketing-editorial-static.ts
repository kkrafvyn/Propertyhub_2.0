import type { MarketingIntro } from './marketing-page-document';

export type MarketingCompareBlock = { title: string; items: [string, string, string] };

export type MarketingRolePreview = {
  id: string;
  label: string;
  title: string;
  copy: string;
  metrics: [{ label: string; value: string }, { label: string; value: string }, { label: string; value: string }];
};

export type MarketingIntegrationItem = { name: string; detail: string };

export type MarketingResourceLinks = {
  docsLabel: string;
  docsHref: string;
  statusLabel: string;
  statusHref: string;
};

export type MarketingStoreLinks = {
  showStrip: boolean;
  headline: string;
  lead: string;
  consumerPlayUrl: string;
  consumerAppleUrl: string;
  workspacePlayUrl: string;
  workspaceAppleUrl: string;
  fallbackHref: string;
  fallbackLabel: string;
};

export type MarketingAppPreviews = {
  showConsumer: boolean;
  showWorkspace: boolean;
  consumerVideoSrc: string;
  workspaceVideoSrc: string;
  consumerPosterSrc: string;
  workspacePosterSrc: string;
};

export type MarketingSurfaceCard = {
  label: string;
  detail: string;
  group: 'Consumer' | 'Workspace' | 'Platform';
};

export type MarketingPlatformBand = MarketingIntro & {
  surfaces: MarketingSurfaceCard[];
};

export type MarketingPageExtras = {
  heroHighlights: string[];
  platform: MarketingPlatformBand;
  teams: MarketingIntro;
  consumers: MarketingIntro;
  integrations: MarketingIntro;
  integrationItems: MarketingIntegrationItem[];
  workflowCompare: { before: MarketingCompareBlock; after: MarketingCompareBlock };
  roles: MarketingRolePreview[];
  footerTagline: string;
  resourceLinks: MarketingResourceLinks;
  storeLinks: MarketingStoreLinks;
  appPreviews: MarketingAppPreviews;
};

export const DEFAULT_PLATFORM_SURFACES: MarketingSurfaceCard[] = [
  { group: 'Consumer', label: 'Consumer web', detail: 'Search, compare, apply, and manage your property life in the browser.' },
  { group: 'Consumer', label: 'Consumer Android & iOS', detail: 'Native apps for discovery, payments, messaging, and journeys on the go.' },
  { group: 'Workspace', label: 'Workspace web', detail: 'CRM-to-ERP operations: listings, leases, finance, and field workflows.' },
  { group: 'Workspace', label: 'Workspace mobile', detail: 'Android and iOS apps for managers and teams in the field.' },
  { group: 'Workspace', label: 'Workspace desktop', detail: 'Windows desktop app for high-volume desk work and My Work–first navigation.' },
  { group: 'Platform', label: 'Platform admin', detail: 'Trust, fraud, revenue, CMS, and feature controls for operators.' },
  { group: 'Platform', label: 'Shared auth & org model', detail: 'One account links consumer journeys and workspace membership where applicable.' },
  { group: 'Platform', label: 'Shared records & audit', detail: 'Listings, leases, payments, and work history stay consistent — with a full trail across every surface.' },
];

export const DEFAULT_MARKETING_ROLES: MarketingRolePreview[] = [
  {
    id: 'executive',
    label: 'Executive',
    title: 'Portfolio visibility without the status meeting.',
    copy: 'See collections, occupancy, maintenance risk, and operational exceptions from one command view — connected to the same data your teams work in every day.',
    metrics: [
      { label: 'Collection rate', value: '96.4%' },
      { label: 'Occupancy', value: '94.1%' },
      { label: 'Open exceptions', value: '3' },
    ],
  },
  {
    id: 'property-management',
    label: 'Property management',
    title: 'Run estates from one operational workspace.',
    copy: 'Manage properties, units, leases, occupancies, inspections, and daily tasks without switching between spreadsheets, chats, and separate maintenance tools.',
    metrics: [
      { label: 'Active leases', value: 'Live roster' },
      { label: 'Inspections due', value: 'Field queue' },
      { label: 'Pending approvals', value: 'Workflow' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    title: 'Know where the money stands.',
    copy: 'Track receivables, journal entries, bank reconciliation, owner statements, and collections workflows in the operational layer around your finances.',
    metrics: [
      { label: 'Receivables', value: 'Ledger' },
      { label: 'Overdue', value: 'Aging' },
      { label: 'Reconciled', value: 'Bank match' },
    ],
  },
  {
    id: 'leasing',
    label: 'Leasing / sales',
    title: 'Turn property interest into organized business.',
    copy: 'Manage leads, viewings, applications, offers, and leasing pipelines from one system — with the same property and contact records the rest of the operation uses.',
    metrics: [
      { label: 'Active leads', value: 'CRM' },
      { label: 'Viewings', value: 'Calendar' },
      { label: 'Applications', value: 'Pipeline' },
    ],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    title: 'Turn problems into tracked work.',
    copy: 'Convert resident requests into tickets, assign contractors, track SLAs, escalate delays, and capture field evidence — instead of losing requests in message threads.',
    metrics: [
      { label: 'Open tickets', value: '7' },
      { label: 'SLA compliance', value: '91%' },
      { label: 'Avg. close time', value: '1.8 days' },
    ],
  },
  {
    id: 'customer-service',
    label: 'Customer service',
    title: 'Messages become work.',
    copy: 'Route resident inquiries into governed tickets and workflows, track SLAs, and keep communication tied to the property, lease, and operational record.',
    metrics: [
      { label: 'Open conversations', value: '18' },
      { label: 'Avg. response', value: '< 4 hrs' },
      { label: 'CSAT score', value: '4.7 / 5' },
    ],
  },
];

export const DEFAULT_WORKFLOW_COMPARE: MarketingPageExtras['workflowCompare'] = {
  before: {
    title: 'Before',
    items: [
      'Separate spreadsheets and message threads',
      'Manual record matching across tools',
      'Updates scattered with no shared context',
    ],
  },
  after: {
    title: 'With BaytMiftah',
    items: [
      'Shared property and unit context',
      'Collections aligned to leases',
      'Tracked tasks with clear status',
    ],
  },
};

export const DEFAULT_INTEGRATION_ITEMS: MarketingIntegrationItem[] = [
  {
    name: 'Payment checkout',
    detail: 'Connect payment collection to property and lease records. Requires configured payment credentials and supported methods such as mobile money where enabled.',
  },
  {
    name: 'SMS and WhatsApp',
    detail: 'Route operational messages through configured omnichannel channels. Availability depends on workspace setup and regional provider configuration.',
  },
  {
    name: 'Email notifications',
    detail: 'Send operational email through the configured delivery service. Availability depends on workspace notification settings.',
  },
];

export const DEFAULT_MARKETING_EXTRAS: MarketingPageExtras = {
  heroHighlights: ['Homes & stays', 'Landlords & property teams', 'Built for Ghana'],
  platform: {
    kicker: 'Made for your side of property',
    title: 'Your next home. Your growing business.',
    lead: 'Whether you are finding a place or looking after one, there is a simpler way to move forward.',
    surfaces: DEFAULT_PLATFORM_SURFACES.map((surface) => ({ ...surface })),
  },
  teams: {
    kicker: 'One platform, many teams',
    title: 'Built for the people behind real estate',
    lead: 'Owners, managers, agencies, developers, and enterprise operators work from role-aware workspace views — consumers use the same platform for discovery and journeys.',
  },
  consumers: {
    kicker: 'For consumers',
    title: 'Find a property without the friction',
    lead: 'Discover, compare, apply, pay, sign, and book stays from the consumer app — connected to the same records professionals use in workspace, without operational complexity on your side.',
  },
  integrations: {
    kicker: 'Connected services',
    title: 'Connections built into the workflows',
    lead: 'Payments, SMS, WhatsApp, and email tie into leases and operations when your workspace is configured. Confirm regional availability during onboarding.',
  },
  integrationItems: DEFAULT_INTEGRATION_ITEMS.map((item) => ({ ...item })),
  workflowCompare: structuredClone(DEFAULT_WORKFLOW_COMPARE),
  roles: DEFAULT_MARKETING_ROLES.map((role) => structuredClone(role)),
  footerTagline: 'Your property life and your property business — in one Real Estate Operating System.',
  resourceLinks: {
    docsLabel: 'Documentation',
    docsHref: '/help',
    statusLabel: 'System status',
    statusHref: '/status',
  },
  storeLinks: {
    showStrip: false,
    headline: 'Take BaytMiftah with you',
    lead: 'Consumer and workspace native apps complement the web experience. Store availability varies by platform and release track.',
    consumerPlayUrl: '',
    consumerAppleUrl: '',
    workspacePlayUrl: '',
    workspaceAppleUrl: '',
    fallbackHref: '/contact',
    fallbackLabel: 'Request tester access',
  },
  appPreviews: {
    showConsumer: true,
    showWorkspace: true,
    consumerVideoSrc: '/marketing/previews/consumer-app-preview.mp4',
    workspaceVideoSrc: '/marketing/previews/workspace-app-preview.mp4',
    consumerPosterSrc: '/marketing/previews/consumer-poster.jpg',
    workspacePosterSrc: '/marketing/previews/workspace-poster.jpg',
  },
};
