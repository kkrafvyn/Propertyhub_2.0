import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { appPath } from "../../../lib/marketing-urls";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      node.classList.add("mk-reveal--visible");
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("mk-reveal--visible");
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function Reveal({
  children,
  className = "",
  stagger = false,
}: {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
}) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`mk-reveal${stagger ? " mk-reveal--stagger" : ""} ${className}`.trim()}
    >
      {children}
    </div>
  );
}

function DemoBadge() {
  return <span className="mk-demo-badge">Illustrative UI</span>;
}

export function MarketingHome() {
  return (
    <>
      <PageMeta
        title="BaytMiftah — The Operating System for Real Estate"
        description="Run your real-estate business from one operating system. BaytMiftah connects property discovery, leasing, operations, finance, maintenance, CRM, communications, and governed AI for consumers and property businesses."
        canonicalPath="/"
        ogTitle="BaytMiftah — The Operating System for Real Estate"
        ogDescription="Stop running property operations across WhatsApp, Excel, and disconnected tools. One connected REOS for discovery, operations, finance, and trust."
      />

      <HeroSection />
      <ProblemSection />
      <WorkflowSection />
      <BusinessSection />
      <ConsumerSection />
      <AISection />
      <NightWatchSection />
      <TrustSection />
      <ExplorerSection />
      <TeamsSection />
      <PlatformSection />
      <CTASection />
    </>
  );
}

function HeroSection() {
  return (
    <section className="mk-section mk-hero">
      <div className="mk-container mk-hero-grid mk-hero-content">
        <Reveal>
          <div className="mk-hero-copy-panel">
            <p className="mk-eyebrow">Real Estate Operating System</p>
            <h1 className="mk-display">The Operating System for Real Estate.</h1>
            <p className="mk-lead">
              Stop running your property business across WhatsApp, Excel, spreadsheets, and disconnected
              systems. BaytMiftah brings discovery, operations, finance, maintenance, and communications
              into one environment — so your organization runs from a single system.
            </p>
            <p className="mk-hero-note">
              BaytMiftah is a technology platform. Your team manages your properties and customer
              relationships through the software — we do not automatically become your property manager.
            </p>
            <div className="mk-hero-actions">
              <a href={appPath("/signup")} className="mk-btn mk-btn-primary">
                Get Started
              </a>
              <a href="#business" className="mk-btn mk-btn-secondary">
                For Businesses
              </a>
              <a href={appPath("/search")} className="mk-btn mk-btn-secondary">
                Explore Properties
              </a>
            </div>
          </div>
        </Reveal>

        <div className="mk-hero-visual" aria-hidden="true">
          <div className="mk-hero-grid-bg" />
          <div className="mk-product-stack">
            <div className="mk-product-card">
              <p className="mk-product-label">Workspace</p>
              <p className="mk-product-title">Portfolio &amp; unit operations</p>
              <p className="mk-product-meta">Leases · occupancy · tasks · documents</p>
              <DemoBadge />
            </div>
            <div className="mk-product-card mk-product-card--offset">
              <p className="mk-product-label">Finance</p>
              <p className="mk-product-title">Payments &amp; reconciliation</p>
              <p className="mk-product-meta">Journal entries · bank feeds · owner statements</p>
              <DemoBadge />
            </div>
            <div className="mk-product-card mk-product-card--offset-right">
              <p className="mk-product-label">Maintenance</p>
              <p className="mk-product-title">Tickets, SLAs &amp; contractors</p>
              <p className="mk-product-meta">Dispatch · gate clearance · field updates</p>
              <DemoBadge />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const tools = [
    "WhatsApp",
    "Excel",
    "Email",
    "Bank statements",
    "Paper documents",
    "Maintenance messages",
    "Separate CRM",
    "Payment tools",
    "Reporting spreadsheets",
  ];

  return (
    <section className="mk-section mk-problem" id="product">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">The problem</p>
          <h2 className="mk-section-title">Real-estate operations are fragmented.</h2>
          <p className="mk-section-copy">
            Most property businesses stitch together messaging apps, spreadsheets, inboxes, and
            one-off tools. Work falls through the cracks. Finance drifts from operations. Teams lose
            visibility.
          </p>
        </Reveal>

        <Reveal stagger>
          <div className="mk-chaos-grid mk-stagger-grid">
            {tools.map((tool) => (
              <div key={tool} className="mk-chaos-chip">
                {tool}
              </div>
            ))}
          </div>
        </Reveal>

        <div className="mk-transform-arrow" aria-hidden="true">
          ↓
        </div>

        <Reveal>
          <div className="mk-unified-panel">
            <h3>BAYTMIFTAH</h3>
            <p>One operating system for properties, people, workflows, and accountability.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function WorkflowSection() {
  const steps = [
    "Discover",
    "Lease / Transact",
    "Operate",
    "Maintain",
    "Collect / Reconcile",
    "Communicate",
    "Analyze",
    "Automate",
  ];

  return (
    <section className="mk-section" id="workflow">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">Operating model</p>
          <h2 className="mk-section-title">Connected workflows, not isolated modules.</h2>
          <p className="mk-section-copy">
            BaytMiftah links the lifecycle of real-estate work — from discovery and leasing through
            day-to-day operations, collections, communication, and analysis — inside one platform
            your teams actually use.
          </p>
        </Reveal>
        <div className="mk-flow">
          {steps.map((step, index) => (
            <span key={step} style={{ display: "contents" }}>
              <span className="mk-flow-step">{step}</span>
              {index < steps.length - 1 ? (
                <span className="mk-flow-arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function BusinessSection() {
  const modules = [
    {
      title: "Property operations",
      copy: "Manage properties, units, leases, occupancy, and operational work from workspace dashboards.",
    },
    {
      title: "Finance",
      copy: "Track payments, journal entries, bank reconciliation, owner statements, and finance workflows.",
    },
    {
      title: "Maintenance",
      copy: "Handle tickets, technicians, contractors, SLAs, gate clearance, and escalations.",
    },
    {
      title: "CRM & leasing",
      copy: "Manage leads, contacts, viewings, applications, offers, and leasing pipelines.",
    },
    {
      title: "Communications",
      copy: "Connect messaging, notifications, and operational alerts to real workflows — not separate inboxes.",
    },
    {
      title: "Reporting",
      copy: "Understand operational, financial, and organizational performance from connected data.",
    },
  ];

  return (
    <section className="mk-section mk-problem" id="business">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">For businesses</p>
          <h2 className="mk-section-title">Run your real-estate business from one system.</h2>
          <p className="mk-section-copy">
            Built for property owners, managers, agencies, developers, and enterprise operators who
            need one operating environment — not another disconnected tool stack.
          </p>
        </Reveal>
        <Reveal stagger>
          <div className="mk-module-grid mk-module-grid--3">
            {modules.map((mod) => (
              <article key={mod.title} className="mk-module-card">
                <h3>{mod.title}</h3>
                <p>{mod.copy}</p>
              </article>
            ))}
          </div>
        </Reveal>
        <div className="mk-hero-actions" style={{ marginTop: "2rem" }}>
          <a href={appPath("/workspace")} className="mk-btn mk-btn-primary">
            Open Workspace
          </a>
          <Link to="/contact" className="mk-btn mk-btn-secondary">
            Request a Demo
          </Link>
        </div>
      </div>
    </section>
  );
}

function ConsumerSection() {
  const steps = [
    "Discover",
    "Compare",
    "View",
    "Apply / Offer",
    "Book / Transact",
    "Communicate",
    "Manage stay / lease",
    "Request support",
  ];

  return (
    <section className="mk-section" id="consumers">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">For consumers</p>
          <h2 className="mk-section-title">Discover and manage property journeys in one place.</h2>
          <p className="mk-section-copy">
            Renters, buyers, hosts, and guests use BaytMiftah to search, compare, apply, book, pay,
            and stay connected — separate from the business operating environment, but part of the
            same platform.
          </p>
        </Reveal>
        <div className="mk-flow">
          {steps.map((step, index) => (
            <span key={step} style={{ display: "contents" }}>
              <span className="mk-flow-step">{step}</span>
              {index < steps.length - 1 ? (
                <span className="mk-flow-arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
            </span>
          ))}
        </div>
        <div className="mk-hero-actions" style={{ marginTop: "2rem" }}>
          <a href={appPath("/search")} className="mk-btn mk-btn-accent">
            Explore Properties
          </a>
        </div>
      </div>
    </section>
  );
}

function AISection() {
  const pipeline = [
    "Message or request arrives",
    "AI understands intent within org context",
    "Permission and governance checks run",
    "Workflow, ticket, or task is created",
    "Work routes to the right role",
    "Progress is monitored",
    "Escalation or update when required",
  ];

  return (
    <section className="mk-section mk-section-dark" id="ai">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">Governed AI</p>
          <h2 className="mk-section-title">AI that works inside your operations.</h2>
          <p className="mk-section-copy">
            BaytMiftah AI assists with maintenance triage, collections, leasing workflows, document
            summaries, SOP lookup, and operational alerts — with organization permissions, kill
            switches, and human approval where required. It does not run unrestricted actions across
            your business.
          </p>
        </Reveal>
        <div className="mk-pipeline">
          {pipeline.map((step, index) => (
            <div key={step}>
              <div className="mk-pipeline-step">
                <span className="mk-pipeline-dot" aria-hidden="true" />
                <span className="mk-pipeline-text">{step}</span>
              </div>
              {index < pipeline.length - 1 ? <div className="mk-pipeline-line" aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NightWatchSection() {
  const issues = [
    { label: "Payment failure", severity: "HIGH" as const },
    { label: "Lease expiration window", severity: "MEDIUM" as const },
    { label: "Maintenance SLA breach", severity: "HIGH" as const },
  ];

  return (
    <section className="mk-section">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">AI Night Watch</p>
          <h2 className="mk-section-title">Your operations don&apos;t stop when you do.</h2>
          <p className="mk-section-copy">
            Night Watch monitors configured operational exceptions — overdue payments, SLA breaches,
            lease expirations, workflow failures, and similar signals — and surfaces governed
            recommendations and alerts for your team to review.
          </p>
        </Reveal>
        <div className="mk-watch-panel">
          <p className="mk-product-label" style={{ color: "var(--mk-muted)" }}>
            AI Night Watch <DemoBadge />
          </p>
          <p className="mk-product-title" style={{ marginTop: "0.5rem" }}>
            3 issues need attention
          </p>
          {issues.map((issue) => (
            <div key={issue.label} className="mk-watch-row">
              <span>{issue.label}</span>
              <span
                className={`mk-severity ${
                  issue.severity === "HIGH" ? "mk-severity-high" : "mk-severity-medium"
                }`}
              >
                {issue.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  const nodes = [
    "Identity",
    "Permissions",
    "Organization",
    "Property",
    "Transaction",
    "Audit trail",
    "Evidence",
  ];

  return (
    <section className="mk-section mk-problem">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">Trust &amp; security</p>
          <h2 className="mk-section-title">Built for trust. Designed for accountability.</h2>
          <p className="mk-section-copy">
            Permission-based access, organization isolation, audit trails, verification workflows,
            and controlled AI actions — so teams can operate with visibility and evidence, not blind
            trust.
          </p>
        </Reveal>
        <div className="mk-trust-chain">
          {nodes.map((node, index) => (
            <span key={node} style={{ display: "contents" }}>
              <span className="mk-trust-node">{node}</span>
              {index < nodes.length - 1 ? (
                <span className="mk-trust-arrow" aria-hidden="true">
                  →
                </span>
              ) : null}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExplorerSection() {
  return (
    <section className="mk-section" id="explorer">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">Public explorer</p>
          <h2 className="mk-section-title">A more transparent real-estate ecosystem.</h2>
          <p className="mk-section-copy">
            The public Event Ledger lets anyone verify pseudonymous transaction references, unit
            identifiers, and listing signals — without exposing tenant names, private contact details,
            banking information, or lease documents.
          </p>
        </Reveal>
        <div className="mk-hero-actions" style={{ marginTop: "1.5rem" }}>
          <Link to="/explorer" className="mk-btn mk-btn-secondary">
            Open Event Ledger
          </Link>
        </div>
      </div>
    </section>
  );
}

function TeamsSection() {
  const teams = [
    "Property management",
    "Finance",
    "Leasing / sales",
    "Maintenance",
    "Customer service",
    "Procurement",
    "Operations",
  ];

  return (
    <section className="mk-section mk-problem">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">One platform, many teams</p>
          <h2 className="mk-section-title">Role-aware experiences for every function.</h2>
          <p className="mk-section-copy">
            Executives, property managers, finance officers, leasing teams, and field staff each get
            permissions and navigation suited to their work — connected to the same underlying
            operating data.
          </p>
        </Reveal>
        <div className="mk-team-tree">
          <div className="mk-team-node mk-team-node--root">Executive</div>
          <div className="mk-team-children">
            {teams.map((team) => (
              <div key={team} className="mk-team-node">
                {team}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PlatformSection() {
  return (
    <section className="mk-section">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">Desktop + mobile</p>
          <h2 className="mk-section-title">Built for how teams actually work.</h2>
        </Reveal>
        <div className="mk-platform-split">
          <article className="mk-platform-card">
            <h3>Desktop &amp; web</h3>
            <ul>
              <li>Deep operational work and configuration</li>
              <li>Finance, reporting, and portfolio analysis</li>
              <li>Workspace management and team administration</li>
            </ul>
          </article>
          <article className="mk-platform-card">
            <h3>Mobile</h3>
            <ul>
              <li>Respond and communicate in the field</li>
              <li>Approve actions and capture evidence</li>
              <li>Inspect units and act on operational alerts</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="mk-cta">
      <div className="mk-container">
        <Reveal>
          <h2 className="mk-display">Run real estate differently.</h2>
          <p className="mk-lead">
            Bring your properties, people, workflows, and operations into one system — with governed
            automation and AI where it helps.
          </p>
          <div className="mk-cta-actions">
            <a href={appPath("/signup")} className="mk-btn mk-btn-primary">
              Get Started
            </a>
            <a href="#business" className="mk-btn mk-btn-secondary mk-btn-on-dark">
              Talk to Sales
            </a>
            <Link to="/contact" className="mk-btn mk-btn-secondary mk-btn-on-dark">
              Contact Us
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
