import { useMarketingContent } from "./MarketingContentContext";
import { useState } from "react";
import { ArrowRight, Link2 } from "lucide-react";
import { Link } from "react-router";
import { appPath } from "../../../../lib/marketing-urls";
import { MARKETING_FAQ, WORKFLOW_STAGES } from "./marketing-editorial-data";
import { trackMarketingEvent } from "./marketing-editorial-analytics";
import { useEditorialReveal } from "./useEditorialReveal";

function resolveHref(href: string) {
  if (href.startsWith("#") || href.startsWith("http")) return href;
  return appPath(href.startsWith("/") ? href : `/${href}`);
}

export function EditorialOutcomeSection() {
  const ref = useEditorialReveal<HTMLElement>();
  const outcomes = [
    { title: "One connected record", detail: "Keep property, unit, lease, collection, document, and work-order context connected across the app." },
    { title: "A clear operating view", detail: "See occupancy, collections, renewals, approvals, and open work without piecing together exports." },
    { title: "Work that moves visibly", detail: "Move enquiries, applications, maintenance, and approvals through clear, trackable stages." },
  ];

  return (
    <section ref={ref} className="mk-ed-proof mk-ed-reveal" aria-label="Product outcomes">
      <div className="mk-ed-container">
        <p className="mk-ed-note">Built around connected property workflows. Product previews use illustrative data.</p>
        <div className="mk-ed-proof__grid">
          {outcomes.map((outcome) => <article key={outcome.title}><h2>{outcome.title}</h2><p>{outcome.detail}</p></article>)}
        </div>
      </div>
    </section>
  );
}

export function EditorialWorkflowSection() {
  const [stage, setStage] = useState<(typeof WORKFLOW_STAGES)[number]["id"]>("listing");
  const current = WORKFLOW_STAGES.find((item) => item.id === stage)!;
  const ref = useEditorialReveal<HTMLElement>();

  return (
    <section id="workflow" ref={ref} className="mk-ed-section mk-ed-section--muted mk-ed-reveal" aria-labelledby="workflow-heading">
      <div className="mk-ed-container mk-ed-split">
        <div>
          <p className="mk-ed-kicker">Connected workflow</p>
          <h2 id="workflow-heading" className="mk-ed-heading">From fragmented follow-ups to linked records</h2>
          <p className="mk-ed-lead">BaytMiftah links listings, applications, leases, collections, and maintenance so every update stays in context.</p>
          <div className="mk-ed-compare">
            <div><h3 className="mk-ed-compare__title">Before</h3><ul><li>Separate spreadsheets and messages</li><li>Manual record matching</li><li>Updates scattered across tools</li></ul></div>
            <div><h3 className="mk-ed-compare__title">With BaytMiftah</h3><ul><li>Shared property and unit context</li><li>Collections aligned to leases</li><li>Tracked tasks with clear status</li></ul></div>
          </div>
        </div>
        <div className="mk-ed-journey">
          <p className="mk-ed-kicker">Product journey</p>
          <div className="mk-ed-journey__steps" role="tablist" aria-label="Workflow stages">
            {WORKFLOW_STAGES.map((item) => (
              <button key={item.id} type="button" role="tab" aria-selected={stage === item.id} className={`mk-ed-journey__step${stage === item.id ? " is-active" : ""}`} onClick={() => setStage(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
          <p className="mk-ed-journey__detail" aria-live="polite">{current.detail}</p>
        </div>
      </div>
    </section>
  );
}

export function EditorialPortfolioSection() {
  const ref = useEditorialReveal<HTMLElement>();
  return (
    <section id="features" ref={ref} className="mk-ed-section mk-ed-reveal" aria-labelledby="portfolio-ops-heading">
      <div className="mk-ed-container mk-ed-split mk-ed-split--reverse">
        <div className="mk-ed-preview-card mk-ed-preview-card--large">
          <h3>Workspace overview - preview</h3>
          <ul><li>Leasing pipeline across properties</li><li>Maintenance queue with priority context</li><li>Collections and statements</li><li>Tasks, documents, and approvals</li></ul>
        </div>
        <div>
          <p className="mk-ed-kicker">Connected modules</p>
          <h2 id="portfolio-ops-heading" className="mk-ed-heading">Every module stays in context</h2>
          <p className="mk-ed-lead">Move from a portfolio overview into the exact property, lease, collection, document, or task that needs attention.</p>
        </div>
      </div>
    </section>
  );
}

export function EditorialAiSection() {
  const ref = useEditorialReveal<HTMLElement>();
  const examples = [
    { prompt: "Summarize open maintenance by property", output: "Illustrative: 6 tickets across 3 properties; 2 need attention." },
    { prompt: "Flag overdue rent this week", output: "Illustrative: 4 units in the review queue; 2 have follow-up notes." },
    { prompt: "Draft a renewal summary", output: "Illustrative draft - requires human review before use." },
  ];
  return (
    <section ref={ref} className="mk-ed-section mk-ed-reveal" aria-labelledby="ai-heading">
      <div className="mk-ed-container">
        <p className="mk-ed-kicker">AI with context</p>
        <h2 id="ai-heading" className="mk-ed-heading">Assistance grounded in your operation</h2>
        <p className="mk-ed-lead">Workspace AI uses limited tools, action logs, and approval controls. Examples below are sample outputs, not live account data.</p>
        <div className="mk-ed-ai-grid">{examples.map((example) => <article key={example.prompt} className="mk-ed-ai-card"><p className="mk-ed-ai-card__in">{example.prompt}</p><p className="mk-ed-ai-card__out">{example.output}</p></article>)}</div>
      </div>
    </section>
  );
}

export function EditorialGettingStartedSection() {
  const ref = useEditorialReveal<HTMLElement>();
  const steps = [
    { title: "Create an account", detail: "Sign up and verify your email.", href: "/signup" },
    { title: "Set up a workspace", detail: "Create the operating space for your portfolio.", href: "/signup" },
    { title: "Add properties and units", detail: "Create records or use the structured import tools.", href: "/workspace?next=new" },
    { title: "Configure your modules", detail: "Choose workflows, permissions, notifications, and controls.", href: "/help" },
  ];
  return (
    <section id="getting-started" ref={ref} className="mk-ed-section mk-ed-section--muted mk-ed-reveal" aria-labelledby="start-heading">
      <div className="mk-ed-container">
        <p className="mk-ed-kicker">Onboarding</p><h2 id="start-heading" className="mk-ed-heading">Get started without the guesswork</h2>
        <p className="mk-ed-lead">Begin with the core records, then turn on more workflows as your workspace is ready.</p>
        <ol className="mk-ed-steps">{steps.map((step, index) => <li key={step.title}><span className="mk-ed-steps__n">{index + 1}</span><div><h3>{step.title}</h3><p>{step.detail}</p><a href={resolveHref(step.href)} className="mk-ed-link">Continue <Link2 size={14} aria-hidden="true" /></a></div></li>)}</ol>
      </div>
    </section>
  );
}

export function EditorialTrustSection() {
  const ref = useEditorialReveal<HTMLElement>();
  return (
    <section id="trust" ref={ref} className="mk-ed-section mk-ed-section--surface mk-ed-reveal" aria-labelledby="trust-heading">
      <div className="mk-ed-container mk-ed-split">
        <div>
          <p className="mk-ed-kicker">Trust and safeguards</p><h2 id="trust-heading" className="mk-ed-heading">Permissions, approvals, and auditability</h2>
          <ul className="mk-ed-bullets"><li>Role-based workspace access</li><li>Human approval for sensitive actions</li><li>Action logs and operational history</li><li>Privacy and cookie controls</li></ul>
          <div className="mk-ed-inline-actions"><Link to="/privacy" className="mk-ed-link">Privacy policy</Link><Link to="/legal/trust-verification" className="mk-ed-link">Trust and verification</Link></div>
        </div>
        <aside className="mk-ed-callout"><p>Security claims on this page stay limited to implemented product controls. Contractual commitments remain in the applicable legal documents.</p></aside>
      </div>
    </section>
  );
}

export function EditorialSalesSection() {
  const ref = useEditorialReveal<HTMLElement>();
  const plans = [
    { name: "Starter", fit: "Core workspace", detail: "Property records, leasing, maintenance, and essential controls." },
    { name: "Professional", fit: "Connected operations", detail: "Portfolio reporting, collections, automation, and advanced workflow controls." },
    { name: "Enterprise", fit: "Advanced governance", detail: "Complex permissions, migration planning, integrations, and tailored rollout." },
  ];
  return (
    <section id="pricing" ref={ref} className="mk-ed-section mk-ed-reveal" aria-labelledby="sales-heading">
      <div className="mk-ed-container mk-ed-callout mk-ed-callout--accent">
        <h2 id="sales-heading" className="mk-ed-heading">Choose the workspace you need</h2>
        <p className="mk-ed-lead">Plan fit depends on portfolio size, enabled modules, governance needs, and rollout support.</p>
        <div className="mk-ed-plan-grid">{plans.map((plan) => <article key={plan.name} className="mk-ed-plan-card"><p className="mk-ed-kicker">{plan.name}</p><h3>{plan.fit}</h3><p>{plan.detail}</p></article>)}</div>
        <div className="mk-ed-inline-actions"><a href={appPath("/signup")} className="mk-ed-btn mk-ed-btn--primary" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "sales_signup" })}>Start free</a><Link to="/contact" className="mk-ed-btn mk-ed-btn--secondary">Book a demo</Link></div>
      </div>
    </section>
  );
}

export function EditorialFaqSection() {
  const { faq } = useMarketingContent();
  const ref = useEditorialReveal<HTMLElement>();
  return (
    <section ref={ref} className="mk-ed-section mk-ed-section--muted mk-ed-reveal" aria-labelledby="faq-heading"><div className="mk-ed-container mk-ed-faq"><h2 id="faq-heading" className="mk-ed-heading">Practical questions</h2>{faq.map((item, index) => <details key={index} className="mk-ed-details"><summary>{item.q}</summary><p>{item.a}</p></details>)}</div></section>
  );
}

export function EditorialFinalCtaSection() {
  const { finalCta } = useMarketingContent();
  const ref = useEditorialReveal<HTMLElement>();
  return (
    <section ref={ref} className="mk-ed-section mk-ed-section--dark mk-ed-final mk-ed-reveal" aria-labelledby="final-cta-heading"><div className="mk-ed-container mk-ed-final__inner"><h2 id="final-cta-heading" className="mk-ed-heading mk-ed-heading--dark">{finalCta.title}</h2><p className="mk-ed-lead mk-ed-lead--dark">{finalCta.description}</p><div className="mk-ed-inline-actions"><a href={appPath("/signup")} className="mk-ed-btn mk-ed-btn--light" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "final_primary" })}>Create workspace <ArrowRight size={16} aria-hidden="true" /></a><a href="#product-tour" className="mk-ed-btn mk-ed-btn--ghost">View product tour</a></div></div></section>
  );
}
