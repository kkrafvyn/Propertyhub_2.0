import { useState } from "react";
import { ArrowRight, Link2 } from "lucide-react";
import { Link } from "react-router";
import { appPath } from "../../../../lib/marketing-urls";
import {
  MARKETING_FAQ,
  MARKETING_ROLES,
  MARKETS_NOTE,
  VERIFIED_INTEGRATIONS,
  WORKFLOW_STAGES,
  type MarketingRoleId,
} from "./marketing-editorial-data";
import { trackMarketingEvent } from "./marketing-editorial-analytics";
import { useEditorialReveal } from "./useEditorialReveal";

function resolveHref(href: string) {
  if (href.startsWith("#") || href.startsWith("http")) return href;
  return appPath(href.startsWith("/") ? href : `/${href}`);
}

export function EditorialRoleSection() {
  const [role, setRole] = useState<MarketingRoleId>("manager");
  const active = MARKETING_ROLES.find((r) => r.id === role)!;
  const ref = useEditorialReveal<HTMLElement>();

  return (
    <section
      id="for-teams"
      ref={ref}
      className="mk-ed-section mk-ed-reveal"
      aria-labelledby="for-teams-heading"
    >
      <div className="mk-ed-container">
        <p className="mk-ed-kicker">Choose your role</p>
        <h2 id="for-teams-heading" className="mk-ed-heading">
          Built for how your team actually works
        </h2>
        <p className="mk-ed-lead">
          Preview benefits and workspace views by role. Selecting a tab does not change account permissions — it only updates this demonstration.
        </p>

        <div className="mk-ed-roles">
          <div className="mk-ed-roles__tabs" role="tablist" aria-label="Team roles">
            {MARKETING_ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={role === r.id}
                className={`mk-ed-roles__tab${role === r.id ? " is-active" : ""}`}
                onClick={() => {
                  setRole(r.id);
                  trackMarketingEvent("marketing_role_select", { role: r.id });
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="mk-ed-roles__panel" role="tabpanel">
            <p className="mk-ed-roles__benefit">{active.benefit}</p>
            <ul className="mk-ed-tags">
              {active.workflows.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <article className="mk-ed-preview-card">
              <h3>{active.previewTitle}</h3>
              <ul>
                {active.previewLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </article>
            <a
              href={resolveHref(active.cta.href)}
              className="mk-ed-btn mk-ed-btn--primary"
              onClick={() => trackMarketingEvent("marketing_cta_click", { placement: `role_${active.id}` })}
            >
              {active.cta.label} <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}

export function EditorialWorkflowSection() {
  const [stage, setStage] = useState<(typeof WORKFLOW_STAGES)[number]["id"]>("listing");
  const current = WORKFLOW_STAGES.find((s) => s.id === stage)!;
  const ref = useEditorialReveal<HTMLElement>();

  return (
    <section ref={ref} className="mk-ed-section mk-ed-section--muted mk-ed-reveal" aria-labelledby="workflow-heading">
      <div className="mk-ed-container mk-ed-split">
        <div>
          <p className="mk-ed-kicker">Connected workflow</p>
          <h2 id="workflow-heading" className="mk-ed-heading">
            From fragmented follow-ups to linked records
          </h2>
          <p className="mk-ed-lead">
            Many teams still juggle spreadsheets, messages, and documents. BaytMiftah links listings, people, leases, payments, and maintenance in one workspace — when you adopt those modules.
          </p>
          <div className="mk-ed-compare">
            <div>
              <h3 className="mk-ed-compare__title">Before</h3>
              <ul>
                <li>Separate spreadsheets and chat threads</li>
                <li>Manual receipt matching</li>
                <li>Maintenance updates in silos</li>
              </ul>
            </div>
            <div>
              <h3 className="mk-ed-compare__title">With BaytMiftah</h3>
              <ul>
                <li>Shared property and unit context</li>
                <li>Collections aligned to leases</li>
                <li>Tracked work orders with assignments</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mk-ed-journey">
          <p className="mk-ed-kicker">Journey</p>
          <div className="mk-ed-journey__steps" role="tablist" aria-label="Workflow stages">
            {WORKFLOW_STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={stage === s.id}
                className={`mk-ed-journey__step${stage === s.id ? " is-active" : ""}`}
                onClick={() => setStage(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
          <p className="mk-ed-journey__detail">{current.detail}</p>
        </div>
      </div>
    </section>
  );
}

export function EditorialPortfolioSection() {
  const ref = useEditorialReveal<HTMLElement>();
  return (
    <section ref={ref} className="mk-ed-section mk-ed-reveal" aria-labelledby="portfolio-ops-heading">
      <div className="mk-ed-container mk-ed-split mk-ed-split--reverse">
        <div className="mk-ed-preview-card mk-ed-preview-card--large">
          <h3>Portfolio operations · preview</h3>
          <ul>
            <li>Leasing pipeline across properties</li>
            <li>Maintenance queue with SLA context</li>
            <li>Collections and owner statements</li>
            <li>Team tasks and approvals</li>
          </ul>
        </div>
        <div>
          <p className="mk-ed-kicker">For teams</p>
          <h2 id="portfolio-ops-heading" className="mk-ed-heading">
            Portfolio and team operations in one view
          </h2>
          <p className="mk-ed-lead">
            Property managers, finance, and owners work from the same records — listings, leases, payments, and tickets — rather than reconciling exports at month end.
          </p>
        </div>
      </div>
    </section>
  );
}

export function EditorialResidentSection() {
  const ref = useEditorialReveal<HTMLElement>();
  return (
    <section
      id="resident"
      ref={ref}
      className="mk-ed-section mk-ed-section--dark mk-ed-reveal"
      aria-labelledby="resident-heading"
    >
      <div className="mk-ed-container mk-ed-split">
        <div>
          <p className="mk-ed-kicker mk-ed-kicker--dark">Resident experience</p>
          <h2 id="resident-heading" className="mk-ed-heading mk-ed-heading--dark">
            Self-service for residents, clarity for your team
          </h2>
          <p className="mk-ed-lead mk-ed-lead--dark">
            Residents search listings, apply, sign, pay through supported methods, and request help — separate from the professional workspace, but connected to the same property records.
          </p>
          <a href={appPath("/search")} className="mk-ed-btn mk-ed-btn--light">
            Search homes <ArrowRight size={16} aria-hidden="true" />
          </a>
        </div>
        <div className="mk-ed-phone">
          <div className="mk-ed-phone__screen">
            <p className="mk-ed-phone__label">Illustrative resident flow</p>
            <ol>
              <li className="is-done">Discover listing</li>
              <li className="is-done">Submit application</li>
              <li className="is-active">Sign lease</li>
              <li>Pay rent</li>
              <li>Request support</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

export function EditorialAiSection() {
  const ref = useEditorialReveal<HTMLElement>();
  const examples = [
    {
      prompt: "Summarize open maintenance by property",
      output: "Illustrative: 6 tickets across 3 properties; 2 breaching SLA.",
    },
    {
      prompt: "Flag overdue rent this week",
      output: "Illustrative: 4 units in arrears bucket; 2 with promise-to-pay.",
    },
    {
      prompt: "Draft owner update for renewals",
      output: "Illustrative draft — requires human review before sending.",
    },
  ];

  return (
    <section ref={ref} className="mk-ed-section mk-ed-reveal" aria-labelledby="ai-heading">
      <div className="mk-ed-container">
        <p className="mk-ed-kicker">AI with context</p>
        <h2 id="ai-heading" className="mk-ed-heading">
          Assistance grounded in your operation
        </h2>
        <p className="mk-ed-lead">
          Workspace AI uses tool allowlists, action logs, and approval controls documented in the product. Examples below are sample outputs, not live AI runs.
        </p>
        <div className="mk-ed-ai-grid">
          {examples.map((ex) => (
            <article key={ex.prompt} className="mk-ed-ai-card">
              <p className="mk-ed-ai-card__in">{ex.prompt}</p>
              <p className="mk-ed-ai-card__out">{ex.output}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function EditorialGettingStartedSection() {
  const ref = useEditorialReveal<HTMLElement>();
  const steps = [
    { title: "Create an account", detail: "Sign up and verify your email.", href: "/signup" },
    { title: "Create or join a workspace", detail: "Set organization context for your portfolio.", href: "/signup" },
    { title: "Add properties & units", detail: "Use workspace listings and property setup flows.", href: "/workspace?next=new" },
    { title: "Invite teammates", detail: "Assign roles from workspace team settings.", href: "/signup" },
    { title: "Connect payments & KYC", detail: "Enable when your operator configures PayAngels and Prembly.", href: "/help" },
  ];

  return (
    <section
      id="getting-started"
      ref={ref}
      className="mk-ed-section mk-ed-section--muted mk-ed-reveal"
      aria-labelledby="start-heading"
    >
      <div className="mk-ed-container">
        <p className="mk-ed-kicker">Onboarding</p>
        <h2 id="start-heading" className="mk-ed-heading">
          Getting started
        </h2>
        <p className="mk-ed-lead">
          Prepare property lists, lease templates, and team roles. Migration timing depends on your portfolio — use workspace import tools where they fit your data.
        </p>
        <ol className="mk-ed-steps">
          {steps.map((s, i) => (
            <li key={s.title}>
              <span className="mk-ed-steps__n">{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.detail}</p>
                <a href={resolveHref(s.href)} className="mk-ed-link">
                  Continue <Link2 size={14} aria-hidden="true" />
                </a>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function EditorialIntegrationsSection() {
  const ref = useEditorialReveal<HTMLElement>();
  return (
    <section ref={ref} className="mk-ed-section mk-ed-reveal" aria-labelledby="integrations-heading">
      <div className="mk-ed-container">
        <p className="mk-ed-kicker">Integrations & markets</p>
        <h2 id="integrations-heading" className="mk-ed-heading">
          Verified capabilities in this codebase
        </h2>
        <p className="mk-ed-lead">{MARKETS_NOTE}</p>
        <ul className="mk-ed-integration-list">
          {VERIFIED_INTEGRATIONS.map((item) => (
            <li key={item.name}>
              <strong>{item.name}</strong>
              <span className={`mk-ed-badge mk-ed-badge--${item.status}`}>{item.status}</span>
              <p>{item.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function EditorialTrustSection() {
  const ref = useEditorialReveal<HTMLElement>();
  return (
    <section ref={ref} className="mk-ed-section mk-ed-section--surface mk-ed-reveal" aria-labelledby="trust-heading">
      <div className="mk-ed-container mk-ed-split">
        <div>
          <p className="mk-ed-kicker">Trust & safeguards</p>
          <h2 id="trust-heading" className="mk-ed-heading">
            Permissions, approvals, and auditability
          </h2>
          <ul className="mk-ed-bullets">
            <li>Role-based workspace access</li>
            <li>Human approval paths for sensitive AI and financial actions</li>
            <li>Action logs and operational history in workspace modules</li>
            <li>Privacy and cookie controls aligned with published policies</li>
          </ul>
          <div className="mk-ed-inline-actions">
            <Link to="/privacy" className="mk-ed-link">
              Privacy policy
            </Link>
            <Link to="/legal/trust-verification" className="mk-ed-link">
              Trust & verification
            </Link>
            <Link to="/legal/payments" className="mk-ed-link">
              Payments policy
            </Link>
          </div>
        </div>
        <aside className="mk-ed-callout">
          <p>
            We do not display certifications or uptime guarantees on this page. Refer to legal documentation and your operator agreement for commitments.
          </p>
        </aside>
      </div>
    </section>
  );
}

export function EditorialSalesSection() {
  const ref = useEditorialReveal<HTMLElement>();
  return (
    <section id="pricing" ref={ref} className="mk-ed-section mk-ed-reveal" aria-labelledby="sales-heading">
      <div className="mk-ed-container mk-ed-callout mk-ed-callout--accent">
        <h2 id="sales-heading" className="mk-ed-heading">
          Plans tailored to your portfolio
        </h2>
        <p className="mk-ed-lead">
          Subscription tiers (Starter, Professional, Enterprise) are configured in the admin revenue module. Public pricing is not published here — create a workspace to begin, or contact us for commercial terms.
        </p>
        <div className="mk-ed-inline-actions">
          <a
            href={appPath("/signup")}
            className="mk-ed-btn mk-ed-btn--primary"
            onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "sales_signup" })}
          >
            Create workspace
          </a>
          <Link to="/contact" className="mk-ed-btn mk-ed-btn--secondary">
            Contact
          </Link>
        </div>
      </div>
    </section>
  );
}

export function EditorialFaqSection() {
  const ref = useEditorialReveal<HTMLElement>();
  return (
    <section ref={ref} className="mk-ed-section mk-ed-section--muted mk-ed-reveal" aria-labelledby="faq-heading">
      <div className="mk-ed-container mk-ed-faq">
        <h2 id="faq-heading" className="mk-ed-heading">
          Practical questions
        </h2>
        {MARKETING_FAQ.map((item) => (
          <details key={item.q} className="mk-ed-details">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function EditorialFinalCtaSection() {
  const ref = useEditorialReveal<HTMLElement>();
  return (
    <section ref={ref} className="mk-ed-section mk-ed-section--dark mk-ed-final mk-ed-reveal" aria-labelledby="final-cta-heading">
      <div className="mk-ed-container mk-ed-final__inner">
        <h2 id="final-cta-heading" className="mk-ed-heading mk-ed-heading--dark">
          Bring your portfolio together
        </h2>
        <p className="mk-ed-lead mk-ed-lead--dark">
          Start with a workspace, add your properties, and invite the people who run them.
        </p>
        <div className="mk-ed-inline-actions">
          <a
            href={appPath("/signup")}
            className="mk-ed-btn mk-ed-btn--light"
            onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "final_primary" })}
          >
            Create workspace <ArrowRight size={16} aria-hidden="true" />
          </a>
          <a href="#product-tour" className="mk-ed-btn mk-ed-btn--ghost">
            View product tour
          </a>
        </div>
      </div>
    </section>
  );
}
