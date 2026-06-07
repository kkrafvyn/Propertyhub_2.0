export const mvpPhaseModules = [
  {
    id: 'ghana-compliance',
    title: 'Ghana Compliance Baseline',
    icon: 'policy',
    status: 'Launch gate 1',
    functionName: 'compliance',
    summary: 'Ghana-first listing rules for required documents, approval status, audit trails, and risk flags.',
    metrics: ['Required documents', 'Listing review score', 'Missing-document flags', 'Approval status'],
    capabilities: [
      'Sale and rent document requirements',
      'Listing compliance review records',
      'Blocked, needs review, and approved states',
      'Agency and owner authority checks',
    ],
    readyFiles: [
      'docs/mvp-phase-1-4-schema.sql',
      'supabase/functions/compliance/index.ts',
      'src/services/mvp-service.js',
    ],
  },
  {
    id: 'trust-fraud',
    title: 'Trust and Fraud Engine',
    icon: 'shield_lock',
    status: 'Launch gate 2',
    functionName: 'trust',
    summary: 'Scores users, agencies, properties, and listings while recording fraud signals for review queues.',
    metrics: ['Trust score', 'Verification tier', 'Open fraud signals', 'Signal severity'],
    capabilities: [
      'Organization, listing, property, and user trust scoring',
      'Duplicate and suspicious listing signals',
      'Open, reviewing, confirmed, dismissed, and resolved states',
      'Server-side scoring through Edge Functions only',
    ],
    readyFiles: [
      'docs/mvp-phase-1-4-schema.sql',
      'supabase/functions/trust/index.ts',
      'src/services/mvp-service.js',
    ],
  },
  {
    id: 'agency-crm',
    title: 'Agency CRM Depth',
    icon: 'account_tree',
    status: 'Launch gate 3',
    functionName: 'agency-crm',
    summary: 'Adds pipeline stages, lead intent scoring, follow-up fields, and activity timelines to agency operations.',
    metrics: ['Pipeline stage', 'Intent score', 'Next follow-up', 'Activity history'],
    capabilities: [
      'Default sales pipeline seeded by organization',
      'Lead intent scoring and follow-up status',
      'Notes, calls, messages, viewings, offers, and task activities',
      'Organization access enforcement through the Edge Function',
    ],
    readyFiles: [
      'docs/mvp-phase-1-4-schema.sql',
      'supabase/functions/agency-crm/index.ts',
      'src/services/mvp-service.js',
    ],
  },
  {
    id: 'monetization',
    title: 'Monetization',
    icon: 'payments',
    status: 'Launch gate 4',
    functionName: 'monetization',
    summary: 'Introduces agency plans, subscriptions, featured listing campaigns, and monetization event tracking.',
    metrics: ['Plan tier', 'Featured credits', 'Campaign budget', 'Lead conversion'],
    capabilities: [
      'Agency Starter, Professional, and Enterprise plans',
      'Developer Growth subscription plan',
      'Featured listing campaigns',
      'Revenue and campaign event history',
    ],
    readyFiles: [
      'docs/mvp-phase-1-4-schema.sql',
      'supabase/functions/monetization/index.ts',
      'src/services/mvp-service.js',
    ],
  },
]

export const mvpPhaseSequence = [
  'Apply the phase 1-4 schema after the core and global readiness schemas',
  'Deploy the four new Edge Functions',
  'Smoke test the /mvp workspace with Supabase function URLs',
  'Connect agency CRM controls into the existing lead management page',
  'Enable production plans and featured campaign checkout provider',
]

export function getMvpPhaseModule(id) {
  return mvpPhaseModules.find((module) => module.id === id) || null
}
