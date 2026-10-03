import { useEffect, useState } from "react";
import { appPath } from "../../../../lib/marketing-urls";
import { LaunchTableRow, LaunchUiShell, LaunchMetric } from "./LaunchProductChrome";
import { useAnimatedNumber, useLaunchReveal } from "./launch-motion";

const PRODUCT_MODULES = [
  { id: "discover", label: "Discover", panel: "Listings · publication & media" },
  { id: "lease", label: "Lease", panel: "Applications · e-sign · renewals" },
  { id: "operate", label: "Operate", panel: "Tasks · team · approvals" },
  { id: "collect", label: "Collect", panel: "Payments · receipts · arrears" },
  { id: "maintain", label: "Maintain", panel: "Work orders · assignments" },
  { id: "understand", label: "Understand", panel: "Portfolio metrics · reports" },
] as const;

export function LaunchProductStory() {
  const [active, setActive] = useState<(typeof PRODUCT_MODULES)[number]["id"]>("discover");
  const ref = useLaunchReveal<HTMLElement>();
  const panel = PRODUCT_MODULES.find((m) => m.id === active)!;

  return (
    <section
      id="product-story"
      ref={ref}
      className="mk-l-section mk-l-section--light mk-l-reveal"
      aria-labelledby="product-story-heading"
    >
      <div className="mk-l-container mk-l-split">
        <div>
          <h2 id="product-story-heading" className="mk-l-display">
            One platform.
            <br />
            Every property workflow.
          </h2>
        </div>
        <div className="mk-l-module-list" role="list">
          {PRODUCT_MODULES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="listitem"
              className={`mk-l-module-row${active === m.id ? " is-active" : ""}`}
              onMouseEnter={() => setActive(m.id)}
              onFocus={() => setActive(m.id)}
              onClick={() => setActive(m.id)}
            >
              <span>{m.label}</span>
              <span className="mk-l-module-row__hint">{active === m.id ? panel.panel : ""}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mk-l-container">
        <LaunchUiShell title={`Workspace · ${panel.label}`} className="mk-l-story-panel">
          <p>{panel.panel}</p>
          <LaunchTableRow left="Sample record" right="Preview" />
        </LaunchUiShell>
      </div>
    </section>
  );
}

const PORTFOLIO_LEVELS = [
  { id: "portfolio", label: "Portfolio", detail: "Occupancy, collections queue, open maintenance across properties." },
  { id: "property", label: "Property", detail: "Building-level leases, listings, and operational tasks." },
  { id: "unit", label: "Unit", detail: "Unit 204 — lease, payments, and tickets in one place." },
  { id: "resident", label: "Resident", detail: "Self-service applications, payments, and support." },
] as const;

export function LaunchPortfolio() {
  const [level, setLevel] = useState<(typeof PORTFOLIO_LEVELS)[number]["id"]>("portfolio");
  const ref = useLaunchReveal<HTMLElement>();
  const copy = PORTFOLIO_LEVELS.find((l) => l.id === level)!;

  return (
    <section ref={ref} className="mk-l-section mk-l-section--dark mk-l-reveal" aria-labelledby="portfolio-heading">
      <div className="mk-l-container mk-l-split mk-l-split--wide">
        <div>
          <h2 id="portfolio-heading" className="mk-l-display mk-l-display--light">
            See the entire portfolio.
            <br />
            Then go all the way down to one unit.
          </h2>
          <div className="mk-l-level-tabs" role="tablist" aria-label="Portfolio hierarchy">
            {PORTFOLIO_LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                role="tab"
                aria-selected={level === l.id}
                className={`mk-l-level-tab${level === l.id ? " is-active" : ""}`}
                onClick={() => setLevel(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="mk-l-body mk-l-body--light">{copy.detail}</p>
        </div>
        <div className="mk-l-blocks" aria-hidden="true">
          <span className={`mk-l-block mk-l-block--1${level === "portfolio" ? " is-focus" : ""}`} />
          <span className={`mk-l-block mk-l-block--2${level === "property" ? " is-focus" : ""}`} />
          <span className={`mk-l-block mk-l-block--3${level === "unit" || level === "resident" ? " is-focus" : ""}`} />
          <LaunchUiShell title={copy.label} className="mk-l-blocks__ui">
            <LaunchTableRow left="Context" right={copy.label} />
            <LaunchTableRow left="Status" right="Illustrative" />
          </LaunchUiShell>
        </div>
      </div>
    </section>
  );
}

export function LaunchFinance() {
  const ref = useLaunchReveal<HTMLElement>();
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setInView(true);
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  const collected = useAnimatedNumber(128400, inView, 1000);
  const due = useAnimatedNumber(18200, inView, 1000);

  return (
    <section ref={ref} className="mk-l-section mk-l-section--light mk-l-reveal" aria-labelledby="finance-heading">
      <div className="mk-l-container mk-l-split">
        <div>
          <h2 id="finance-heading" className="mk-l-display">
            Know what was collected, what is due, and where money is going.
          </h2>
          <p className="mk-l-body">Collections, owner statements, payouts, and ledger activity — styled like the finance workspace.</p>
        </div>
        <LaunchUiShell title="Finance · preview">
          <div className="mk-l-finance-grid">
            <LaunchMetric label="Collected (sample)" value={`GHS ${collected.toLocaleString()}`} />
            <LaunchMetric label="Outstanding (sample)" value={`GHS ${due.toLocaleString()}`} />
          </div>
          <LaunchTableRow left="Owner statement · March" right="Ready" />
          <LaunchTableRow left="Payout batch" right="Scheduled" />
          <LaunchTableRow left="Transaction feed" right="12 new" />
        </LaunchUiShell>
      </div>
    </section>
  );
}

const LEASE_STAGES = ["Enquiry", "Application", "Verification", "Lease", "Signature", "Move-in"] as const;

export function LaunchLeasing() {
  const [stage, setStage] = useState(0);
  const ref = useLaunchReveal<HTMLElement>();

  return (
    <section ref={ref} className="mk-l-section mk-l-section--stone mk-l-reveal" aria-labelledby="leasing-heading">
      <div className="mk-l-container">
        <h2 id="leasing-heading" className="mk-l-display">
          From enquiry to signed lease.
        </h2>
        <div className="mk-l-process" role="tablist" aria-label="Leasing stages">
          {LEASE_STAGES.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={stage === i}
              className={`mk-l-process__step${stage === i ? " is-active" : ""}${i < stage ? " is-done" : ""}`}
              onClick={() => setStage(i)}
            >
              {label}
            </button>
          ))}
        </div>
        <LaunchUiShell title={`Leasing · ${LEASE_STAGES[stage]}`}>
          <p>Workspace leasing module — stage preview for {LEASE_STAGES[stage].toLowerCase()}.</p>
          <LaunchTableRow left="Record" right="Sample application" />
        </LaunchUiShell>
      </div>
    </section>
  );
}

const MAINT_STAGES = ["Tenant issue", "Triage", "Assignment", "In progress", "Inspection", "Complete"] as const;

export function LaunchMaintenance() {
  const ref = useLaunchReveal<HTMLElement>();
  return (
    <section ref={ref} className="mk-l-section mk-l-section--light mk-l-reveal" aria-labelledby="maint-heading">
      <div className="mk-l-container mk-l-split">
        <div>
          <h2 id="maint-heading" className="mk-l-display">
            Problems should move toward resolution, not disappear into chat.
          </h2>
        </div>
        <LaunchUiShell title="Maintenance · MT-2041">
          <ol className="mk-l-flow">
            {MAINT_STAGES.map((s, i) => (
              <li key={s} className={i <= 2 ? "is-active" : ""}>
                {s}
              </li>
            ))}
          </ol>
        </LaunchUiShell>
      </div>
    </section>
  );
}

export function LaunchResident() {
  const ref = useLaunchReveal<HTMLElement>();
  return (
    <section
      id="resident"
      ref={ref}
      className="mk-l-section mk-l-section--dark mk-l-reveal"
      aria-labelledby="resident-heading"
    >
      <div className="mk-l-container mk-l-split">
        <div>
          <h2 id="resident-heading" className="mk-l-display mk-l-display--light">
            Residents get one place too.
          </h2>
          <p className="mk-l-body mk-l-body--light">
            Search, sign, pay and request support without navigating fragmented systems.
          </p>
        </div>
        <div className="mk-l-device">
          <div className="mk-l-device__screen">
            <LaunchTableRow left="Search" right="Listings" />
            <LaunchTableRow left="Lease" right="Unit 204" />
            <LaunchTableRow left="Pay rent" right="MoMo ready" />
            <LaunchTableRow left="Visitor pass" right="Issue" />
            <LaunchTableRow left="Maintenance" right="Open request" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function LaunchAi() {
  const ref = useLaunchReveal<HTMLElement>();
  return (
    <section ref={ref} className="mk-l-section mk-l-section--light mk-l-reveal" aria-labelledby="ai-heading">
      <div className="mk-l-container mk-l-split">
        <LaunchUiShell title="Command · preview">
          <p className="mk-l-ai-prompt">Which properties need attention today?</p>
          <ul className="mk-l-ai-out">
            <li>Overdue collections · 4 units (sample)</li>
            <li>Urgent maintenance · 2 tickets (sample)</li>
            <li>Leases expiring · 3 within 60 days (sample)</li>
            <li>Occupancy change · 1 unit vacant (sample)</li>
          </ul>
        </LaunchUiShell>
        <div>
          <h2 id="ai-heading" className="mk-l-display">
            AI with operational context.
          </h2>
          <p className="mk-l-body">
            BaytMiftah AI reads workspace context — with tool allowlists and human approval where your organization requires it.
          </p>
        </div>
      </div>
    </section>
  );
}

const ROLES = [
  { id: "owner", label: "Owner", title: "Owner oversight", rows: ["Portfolio summary", "Statements", "Disbursements"] },
  { id: "manager", label: "Manager", title: "Operations", rows: ["Listings & leases", "Maintenance queue", "Team tasks"] },
  { id: "finance", label: "Finance", title: "Collections", rows: ["Ledger views", "Receipt matching", "Arrears cases"] },
  { id: "agent", label: "Agent", title: "Leasing", rows: ["Lead pipeline", "Applications", "Publications"] },
  { id: "operations", label: "Operations", title: "Field ops", rows: ["Work orders", "SLA tracking", "Vendor dispatch"] },
] as const;

export function LaunchOrganizations() {
  const [role, setRole] = useState<(typeof ROLES)[number]["id"]>("manager");
  const ref = useLaunchReveal<HTMLElement>();
  const active = ROLES.find((r) => r.id === role)!;

  return (
    <section
      id="organizations"
      ref={ref}
      className="mk-l-section mk-l-section--stone mk-l-reveal"
      aria-labelledby="org-heading"
    >
      <div className="mk-l-container">
        <h2 id="org-heading" className="mk-l-display">
          Built for the people running the portfolio.
        </h2>
        <div className="mk-l-role-switch">
          <div className="mk-l-role-switch__tabs" role="tablist">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={role === r.id}
                className={`mk-l-role-tab${role === r.id ? " is-active" : ""}`}
                onClick={() => setRole(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <LaunchUiShell title={active.title}>
            <ul className="mk-l-bullets">
              {active.rows.map((row) => (
                <li key={row}>{row}</li>
              ))}
            </ul>
          </LaunchUiShell>
        </div>
      </div>
    </section>
  );
}

export function LaunchFinalCta() {
  const ref = useLaunchReveal<HTMLElement>();
  return (
    <section ref={ref} className="mk-l-section mk-l-section--dark mk-l-final mk-l-reveal" aria-labelledby="final-heading">
      <div className="mk-l-container mk-l-final__inner">
        <h2 id="final-heading" className="mk-l-display mk-l-display--light">
          Operate real estate from one place.
        </h2>
        <div className="mk-l-actions mk-l-actions--center">
          <a href={appPath("/signup")} className="mk-l-btn mk-l-btn--light">
            Get started
          </a>
          <a href="#platform" className="mk-l-btn mk-l-btn--ghost">
            Explore BaytMiftah
          </a>
        </div>
      </div>
    </section>
  );
}
