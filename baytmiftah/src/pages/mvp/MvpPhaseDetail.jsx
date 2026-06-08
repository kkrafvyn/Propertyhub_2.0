import React, { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import Header from '../../components/Header'
import Navigation from '../../components/Navigation'
import { getMvpPhaseModule } from '../../data/mvp-phase-modules'
import {
  agencyCrmService,
  complianceService,
  monetizationService,
  trustService,
} from '../../services/mvp-service'

const demoOrgId = 'demo-organization'

const sampleListingReview = {
  listingType: 'sale',
  organizationId: demoOrgId,
  documents: ['Land title certificate or registered indenture', 'Stamped site plan'],
  agencyVerified: true,
  priceAnomaly: false,
  notes: 'Sample pre-launch compliance review.',
}

const sampleTrustPayload = {
  organizationId: demoOrgId,
  subjectType: 'organization',
  subjectId: demoOrgId,
  identityVerified: true,
  agencyVerified: true,
  documentsComplete: false,
  positiveHistory: 4,
  openDisputes: 0,
  openSignals: 1,
}

const sampleActivity = {
  organizationId: demoOrgId,
  title: 'Follow up with high-intent buyer',
  activityType: 'task',
  notes: 'Confirm budget, preferred area, and next viewing window.',
  dueAt: new Date(Date.now() + 86400000).toISOString(),
}

const sampleCampaign = {
  organizationId: demoOrgId,
  listingId: 'demo-listing',
  placement: 'search_top',
  budget: 750,
  currency: 'GHS',
}

export default function MvpPhaseDetail() {
  const { moduleId } = useParams()
  const module = getMvpPhaseModule(moduleId)

  if (!module) return <Navigate to="/mvp" replace />

  return (
    <div className="min-h-screen bg-surface text-[#071121]">
      <Navigation />

      <main className="pb-28 md:ml-64 md:pb-12">
        <Header title={module.title} showBack />

        <div className="mx-auto max-w-container px-4 pt-24 md:px-8">
          <section className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <span className="flex h-14 w-14 items-center justify-center rounded-md bg-[#fff7d6] text-[#E9C349]">
                  <span className="material-symbols-outlined text-3xl">{module.icon}</span>
                </span>
                <p className="mt-5 text-label-sm font-bold uppercase tracking-wider text-[#E9C349]">
                  {module.status}
                </p>
                <h2 className="mt-2 text-4xl font-black md:text-5xl">{module.title}</h2>
                <p className="mt-4 text-lg leading-8 text-[#4b5563]">{module.summary}</p>
              </div>
              <Link to="/mvp" className="btn-secondary inline-flex items-center gap-2 self-start">
                <span className="material-symbols-outlined">fact_check</span>
                MVP control
              </Link>
            </div>
          </section>

          <section className="mt-8 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black">Implemented controls</h3>
              <div className="mt-5 grid gap-3">
                {module.capabilities.map((capability) => (
                  <div key={capability} className="flex items-start gap-3 rounded-md bg-[#f8faff] p-4">
                    <span className="material-symbols-outlined text-[#E9C349]">check_circle</span>
                    <span className="font-semibold">{capability}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm">
              <h3 className="text-2xl font-black">Operational metrics</h3>
              <div className="mt-5 grid gap-3">
                {module.metrics.map((metric) => (
                  <div key={metric} className="rounded-md border border-[#e5e7eb] p-4">
                    <p className="font-semibold">{metric}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <GateWorkspace moduleId={module.id} />

          <section className="mt-8 rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-label-sm font-bold uppercase tracking-wider text-[#E9C349]">Build artifacts</p>
                <h3 className="mt-2 text-2xl font-black">Files added for this gate</h3>
              </div>
              <span className="rounded-full bg-[#edf4ff] px-4 py-2 text-sm font-bold text-[#303744]">
                Edge Function: {module.functionName}
              </span>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {module.readyFiles.map((file) => (
                <div key={file} className="rounded-md bg-[#f8faff] p-4 font-mono text-sm">
                  {file}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}

function GateWorkspace({ moduleId }) {
  if (moduleId === 'ghana-compliance') return <ComplianceWorkspace />
  if (moduleId === 'trust-fraud') return <TrustWorkspace />
  if (moduleId === 'agency-crm') return <CrmWorkspace />
  if (moduleId === 'monetization') return <MonetizationWorkspace />
  return null
}

function ComplianceWorkspace() {
  const [baseline, setBaseline] = useState(null)
  const [review, setReview] = useState(null)
  const [status, setStatus] = useState('Loading Ghana baseline...')

  useEffect(() => {
    complianceService
      .getGhanaBaseline()
      .then((data) => {
        setBaseline(data)
        setStatus('Baseline loaded')
      })
      .catch(() => setStatus('Baseline unavailable until the compliance Edge Function is deployed'))
  }, [])

  const runReview = () => {
    setStatus('Running sample review...')
    complianceService
      .reviewListing(sampleListingReview)
      .then((data) => {
        setReview(data)
        setStatus('Sample review completed')
      })
      .catch(() => {
        setReview({
          status: 'needs_review',
          score: 72,
          missing_documents: [
            'Owner Ghana Card or company registration documents',
            'Tax identification number where applicable',
            'Agent authority letter when submitted by an agency',
          ],
          risk_flags: ['missing_required_documents'],
        })
        setStatus('Using local preview because protected review requires a signed-in organization user')
      })
  }

  return (
    <WorkspaceShell
      eyebrow="Ghana compliance console"
      title="Document baseline and listing review"
      status={status}
      actionLabel="Run sample review"
      actionIcon="policy"
      onAction={runReview}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <ListPanel title="Sale documents" items={baseline?.saleDocuments || []} />
        <ListPanel title="Rental documents" items={baseline?.rentDocuments || []} />
      </div>
      {review && (
        <ResultPanel
          title="Latest review result"
          rows={[
            ['Status', review.status],
            ['Score', review.score],
            ['Missing documents', formatList(review.missing_documents || review.missingDocuments)],
            ['Risk flags', formatList(review.risk_flags || review.riskFlags)],
          ]}
        />
      )}
    </WorkspaceShell>
  )
}

function TrustWorkspace() {
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('Ready to score a sample organization')

  const scoreTrust = () => {
    setStatus('Calculating trust score...')
    trustService
      .calculateScore(sampleTrustPayload)
      .then((data) => {
        setResult(data)
        setStatus('Trust score completed')
      })
      .catch(() => {
        setResult({
          score: 82,
          tier: 'trusted',
          factors: [
            { label: 'Identity verified', value: true, weight: 15 },
            { label: 'Agency verified', value: true, weight: 20 },
            { label: 'Documents complete', value: false, weight: 20 },
            { label: 'Open fraud signals', value: 1, weight: -18 },
          ],
        })
        setStatus('Using local preview because scoring writes require organization access')
      })
  }

  return (
    <WorkspaceShell
      eyebrow="Trust review console"
      title="Organization score and fraud signal readiness"
      status={status}
      actionLabel="Calculate score"
      actionIcon="shield_lock"
      onAction={scoreTrust}
    >
      <div className="grid gap-5 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="rounded-lg bg-[#071121] p-6 text-white">
          <p className="text-white/60">Trust tier</p>
          <p className="mt-3 text-5xl font-black">{result?.score ?? '--'}</p>
          <p className="mt-2 text-xl capitalize text-[#E9C349]">{result?.tier || 'Not scored'}</p>
        </div>
        <ListPanel
          title="Scoring factors"
          items={(result?.factors || []).map((factor) => `${factor.label}: ${String(factor.value)}`)}
          empty="Run a score to inspect factor weights."
        />
      </div>
    </WorkspaceShell>
  )
}

function CrmWorkspace() {
  const [stages, setStages] = useState([])
  const [activity, setActivity] = useState(null)
  const [status, setStatus] = useState('Loading CRM pipeline...')

  useEffect(() => {
    agencyCrmService
      .getPipeline(demoOrgId)
      .then((data) => {
        setStages(data || [])
        setStatus('Pipeline loaded')
      })
      .catch(() => {
        setStages([
          { name: 'New lead', probability: 10 },
          { name: 'Contacted', probability: 25 },
          { name: 'Qualified', probability: 45 },
          { name: 'Viewing booked', probability: 65 },
          { name: 'Offer', probability: 80 },
          { name: 'Won', probability: 100 },
        ])
        setStatus('Using local preview because CRM pipeline requires organization access')
      })
  }, [])

  const recordActivity = () => {
    setStatus('Recording activity...')
    agencyCrmService
      .recordActivity(sampleActivity)
      .then((data) => {
        setActivity(data)
        setStatus('Activity recorded')
      })
      .catch(() => {
        setActivity({ ...sampleActivity, id: 'preview-activity', activity_type: 'task' })
        setStatus('Using local preview because activity writes require organization access')
      })
  }

  return (
    <WorkspaceShell
      eyebrow="Agency CRM console"
      title="Pipeline stages and activity timeline"
      status={status}
      actionLabel="Record sample task"
      actionIcon="add_task"
      onAction={recordActivity}
    >
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stages.map((stage) => (
          <div key={stage.id || stage.name} className="rounded-lg border border-[#e5e7eb] bg-[#f8faff] p-4">
            <p className="font-black">{stage.name}</p>
            <p className="mt-2 text-sm text-[#596170]">{stage.probability || 0}% probability</p>
          </div>
        ))}
      </div>
      {activity && (
        <ResultPanel
          title="Latest activity"
          rows={[
            ['Title', activity.title],
            ['Type', activity.activity_type || activity.activityType],
            ['Notes', activity.notes],
            ['Due', activity.due_at || activity.dueAt],
          ]}
        />
      )}
    </WorkspaceShell>
  )
}

function MonetizationWorkspace() {
  const [plans, setPlans] = useState([])
  const [campaign, setCampaign] = useState(null)
  const [status, setStatus] = useState('Loading agency plans...')

  useEffect(() => {
    monetizationService
      .getPlans('agency')
      .then((data) => {
        setPlans(data || [])
        setStatus('Plans loaded')
      })
      .catch(() => {
        setPlans([])
        setStatus('Plans unavailable until the monetization Edge Function is deployed')
      })
  }, [])

  const createCampaign = () => {
    setStatus('Creating sample campaign...')
    monetizationService
      .createFeaturedCampaign(sampleCampaign)
      .then((data) => {
        setCampaign(data)
        setStatus('Campaign created')
      })
      .catch(() => {
        setCampaign({ ...sampleCampaign, id: 'preview-campaign', status: 'scheduled' })
        setStatus('Using local preview because campaign writes require organization access')
      })
  }

  return (
    <WorkspaceShell
      eyebrow="Monetization console"
      title="Plans and featured listing campaigns"
      status={status}
      actionLabel="Create sample campaign"
      actionIcon="campaign"
      onAction={createCampaign}
    >
      <div className="grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.id || plan.code} className="rounded-lg border border-[#cbd3df] bg-[#f8faff] p-5">
            <p className="text-label-sm font-bold uppercase tracking-wider text-[#596170]">{plan.code}</p>
            <h3 className="mt-2 text-2xl font-black">{plan.name}</h3>
            <p className="mt-3 text-3xl font-black">
              {plan.currency || 'GHS'} {Number(plan.price_monthly || 0).toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-[#596170]">{plan.featured_listing_credits || 0} featured credits</p>
          </article>
        ))}
      </div>
      {campaign && (
        <ResultPanel
          title="Latest campaign"
          rows={[
            ['Status', campaign.status],
            ['Placement', campaign.placement],
            ['Budget', `${campaign.currency || 'GHS'} ${Number(campaign.budget || 0).toLocaleString()}`],
            ['Listing', campaign.listing_id || campaign.listingId],
          ]}
        />
      )}
    </WorkspaceShell>
  )
}

function WorkspaceShell({ eyebrow, title, status, actionLabel, actionIcon, onAction, children }) {
  return (
    <section className="mt-8 rounded-lg border border-[#cbd3df] bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-label-sm font-bold uppercase tracking-wider text-[#E9C349]">{eyebrow}</p>
          <h3 className="mt-2 text-3xl font-black">{title}</h3>
          <p className="mt-2 text-sm font-semibold text-[#596170]">{status}</p>
        </div>
        <button onClick={onAction} className="btn-primary inline-flex items-center gap-2 self-start">
          <span className="material-symbols-outlined">{actionIcon}</span>
          {actionLabel}
        </button>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function ListPanel({ title, items, empty = 'Nothing returned yet.' }) {
  return (
    <div className="rounded-lg border border-[#e5e7eb] bg-[#f8faff] p-5">
      <h4 className="text-xl font-black">{title}</h4>
      <div className="mt-4 grid gap-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-md bg-white p-3">
              <span className="material-symbols-outlined text-[#E9C349]">check_circle</span>
              <span className="font-semibold">{item}</span>
            </div>
          ))
        ) : (
          <p className="rounded-md bg-white p-3 text-[#596170]">{empty}</p>
        )}
      </div>
    </div>
  )
}

function ResultPanel({ title, rows }) {
  return (
    <div className="mt-5 rounded-lg border border-[#E9C349] bg-[#fffdf2] p-5">
      <h4 className="text-xl font-black">{title}</h4>
      <div className="mt-4 grid gap-3">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 rounded-md bg-white p-3 md:grid-cols-[180px_1fr]">
            <span className="font-bold text-[#596170]">{label}</span>
            <span className="font-semibold">{value || 'None'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatList(value) {
  if (!value || value.length === 0) return 'None'
  return Array.isArray(value) ? value.join(', ') : String(value)
}
