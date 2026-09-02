import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { ConsumerJourneyShowcase } from "../../components/marketing/ConsumerJourneyShowcase";
import { TrustTraceShowcase } from "../../components/marketing/TrustTraceShowcase";
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

export function MarketingHome() {
  return (
    <>
      <PageMeta
        title="BaytMiftah — The Operating System for Real Estate"
        description="Real estate businesses run on disconnected tools. BaytMiftah connects properties, people, money, and operations in one Real Estate Operating System."
        canonicalPath="/"
        ogTitle="BaytMiftah — The Operating System for Real Estate"
        ogDescription="Stop running properties, payments, maintenance, leasing, and teams across disconnected tools. One connected system for real-estate operations."
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
              Stop running your properties, payments, maintenance, leasing, and teams across disconnected
              tools. BaytMiftah brings your real-estate operations into one connected system.
            </p>
            <p className="mk-hero-note">
              BaytMiftah is a technology platform. Your team manages properties and customer
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
              <p className="mk-product-label">Operations</p>
              <p className="mk-product-title">See the entire operation</p>
              <p className="mk-product-meta">Properties · units · leases · occupancy · tasks</p>
            </div>
            <div className="mk-product-card mk-product-card--offset">
              <p className="mk-product-label">Finance</p>
              <p className="mk-product-title">Know where the money stands</p>
              <p className="mk-product-meta">Collections · reconciliation · owner statements</p>
            </div>
            <div className="mk-product-card mk-product-card--offset-right">
              <p className="mk-product-label">Maintenance</p>
              <p className="mk-product-title">Tracked work—not lost messages</p>
              <p className="mk-product-meta">Tickets · SLAs · contractors · field updates</p>
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
    "Spreadsheets",
    "Paper",
    "Bank statements",
    "Manual follow-ups",
    "Separate CRM",
    "Disconnected payments",
  ];

  return (
    <section className="mk-section mk-problem" id="product">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">The problem</p>
          <h2 className="mk-section-title">Real estate is still running on disconnected tools.</h2>
          <p className="mk-section-copy">
            Your property business has grown, but your tools haven&apos;t grown with it. Work falls through
            the cracks. Finance drifts from operations. Teams lose visibility — and owners spend too much
            time asking instead of operating.
          </p>
        </Reveal>

        <Reveal stagger>
          <div className="mk-problem-diagram">
            <div className="mk-chaos-grid mk-stagger-grid">
              {tools.map((tool) => (
                <div key={tool} className="mk-chaos-chip">
                  {tool}
                </div>
              ))}
            </div>

            <div className="mk-transform-arrow mk-transform-arrow--down" aria-hidden="true">
              ↓
            </div>
            <div className="mk-transform-arrow mk-transform-arrow--right" aria-hidden="true">
              →
            </div>

            <div className="mk-unified-panel">
              <h3>BAYTMIFTAH</h3>
              <p>Bring the entire operation together — one Real Estate Operating System.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function WorkflowSection() {
  const steps = [
    "Properties",
    "People",
    "Leases",
    "Money",
    "Maintenance",
    "Communication",
    "Data",
    "AI",
  ];

  return (
    <section className="mk-section" id="workflow">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">One operating system</p>
          <h2 className="mk-section-title">One system. Every part of the operation.</h2>
          <p className="mk-section-copy">
            BaytMiftah connects the people, properties, money, and workflows behind real estate — from
            discovery and leasing through daily operations, collections, communication, and analysis. Not
            separate modules. One connected operation.
          </p>
        </Reveal>
        <div className="mk-flow mk-flow--rail">
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
      title: "See the entire operation",
      copy: "Know what is happening across every property. Properties, units, leases, occupancy, tasks, and teams in one place.",
    },
    {
      title: "Know where the money stands",
      copy: "Track payment workflows, collections, reconciliation, and financial activity without jumping between systems. BaytMiftah is not a bank — it is the operational layer around your finances.",
    },
    {
      title: "Maintenance shouldn't live in a chat thread",
      copy: "Turn resident requests into tickets, assign work, track SLAs, escalate delays, and keep everyone informed — not buried in WhatsApp.",
    },
    {
      title: "Turn property interest into organized business",
      copy: "Manage leads, viewings, applications, offers, and leasing workflows from one system — not a scattered pipeline.",
    },
    {
      title: "Messages become work",
      copy: "When someone says the pipe is leaking, BaytMiftah can turn the conversation into a governed operational workflow — not another lost message.",
    },
    {
      title: "See performance from connected data",
      copy: "Understand operational, financial, and organizational performance from the same underlying data your teams work in every day.",
    },
  ];

  return (
    <section className="mk-section mk-problem" id="business">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">For businesses</p>
          <h2 className="mk-section-title">Run properties with visibility and control.</h2>
          <p className="mk-section-copy">
            Built for property owners, managers, agencies, developers, and enterprise operators who
            need one operating environment — not another tool stack. This is the system you use to run
            your property operation.
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
          <a href={appPath("/signup")} className="mk-btn mk-btn-primary">
            Get Started
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
  return (
    <section className="mk-section mk-section-showcase" id="consumers">
      <div className="mk-container">
        <Reveal>
          <ConsumerJourneyShowcase />
        </Reveal>
      </div>
    </section>
  );
}

function AISection() {
  const pipeline = [
    "A message or request arrives",
    "AI understands intent within your organization",
    "Permission and governance checks run",
    "A workflow, ticket, or task is created",
    "Work routes to the right role",
    "Progress is monitored",
    "Escalation or update when required",
  ];

  return (
    <section className="mk-section mk-section-dark" id="ai">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">Governed AI</p>
          <h2 className="mk-section-title">AI that works inside your operation.</h2>
          <p className="mk-section-copy">
            Let AI handle the operational work around your team — not just answer questions. BaytMiftah
            AI assists with maintenance triage, collections, leasing workflows, document summaries, and
            operational alerts — with organization permissions, kill switches, and human approval where
            required.
          </p>
        </Reveal>
        <div className="mk-pipeline mk-pipeline--horizontal">
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
  return (
    <section className="mk-section">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">AI Night Watch</p>
          <h2 className="mk-section-title">Don&apos;t wait for problems to find you.</h2>
          <p className="mk-section-copy">
            AI Night Watch monitors operational exceptions — failed payments, overdue work, lease
            deadlines, and workflow issues — and surfaces governed alerts and recommendations for your
            team to review and act on earlier.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="mk-section mk-problem mk-section-showcase">
      <div className="mk-container">
        <Reveal>
          <TrustTraceShowcase />
        </Reveal>
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
          <h2 className="mk-section-title">Transparency without exposing private data.</h2>
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
  const roles = [
    {
      id: "executive",
      label: "Executive",
      title: "Portfolio visibility without the status meeting.",
      copy: "See collections, occupancy, maintenance risk, and operational exceptions from one command view — connected to the same data your teams work in every day.",
    },
    {
      id: "property-management",
      label: "Property management",
      title: "Run estates from one operational workspace.",
      copy: "Manage properties, units, leases, occupancies, inspections, and daily tasks without switching between spreadsheets, chats, and separate maintenance tools.",
    },
    {
      id: "finance",
      label: "Finance",
      title: "Know where the money stands.",
      copy: "Track receivables, journal entries, bank reconciliation, owner statements, and collections workflows in the operational layer around your finances — not a disconnected accounting export.",
    },
    {
      id: "leasing",
      label: "Leasing / sales",
      title: "Turn property interest into organized business.",
      copy: "Manage leads, viewings, applications, offers, and leasing pipelines from one system — with the same property and contact records the rest of the operation uses.",
    },
    {
      id: "maintenance",
      label: "Maintenance",
      title: "Turn problems into tracked work.",
      copy: "Convert resident requests into tickets, assign contractors, track SLAs, escalate delays, and capture field evidence — instead of losing requests in message threads.",
    },
    {
      id: "customer-service",
      label: "Customer service",
      title: "Messages become work.",
      copy: "Route resident inquiries into governed tickets and workflows, track SLAs, and keep communication tied to the property, lease, and operational record.",
    },
    {
      id: "procurement",
      label: "Procurement",
      title: "Control spend with governed approvals.",
      copy: "Run purchase requests, purchase orders, and invoice matching with approval workflows and audit evidence — connected to estate operations and finance.",
    },
    {
      id: "operations",
      label: "Operations",
      title: "Standardize how work moves through the business.",
      copy: "Coordinate automations, exception handling, approvals, and cross-team workflows from one operating environment — without multiplying tools as the portfolio grows.",
    },
  ] as const;

  const [activeRoleId, setActiveRoleId] = useState<(typeof roles)[number]["id"]>("executive");
  const activeRole = roles.find((role) => role.id === activeRoleId) ?? roles[0];

  return (
    <section className="mk-section mk-problem" id="teams">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">One platform, many teams</p>
          <h2 className="mk-section-title">Role-aware experiences for every function.</h2>
        </Reveal>

        <div className="mk-teams-interactive">
          <div className="mk-role-detail" aria-live="polite">
            <h3 className="mk-role-detail-title">{activeRole.title}</h3>
            <p className="mk-role-detail-copy">{activeRole.copy}</p>
          </div>

          <div className="mk-role-picker" role="tablist" aria-label="Team roles">
            {roles.map((role) => {
              const isActive = role.id === activeRoleId;
              return (
                <button
                  key={role.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`mk-team-node mk-role-button${isActive ? " mk-team-node--active" : ""}${
                    role.id === "executive" ? " mk-role-button--lead" : ""
                  }`}
                  onClick={() => setActiveRoleId(role.id)}
                >
                  {role.label}
                </button>
              );
            })}
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
          <h2 className="mk-section-title">Operate from the office or the field.</h2>
          <p className="mk-section-copy">
            Deep operational work on desktop. Respond, approve, and capture evidence on mobile — connected
            to the same operating data.
          </p>
        </Reveal>
        <div className="mk-platform-split">
          <article className="mk-platform-card">
            <h3>Desktop &amp; web</h3>
            <ul>
              <li>Portfolio visibility and configuration</li>
              <li>Finance, reporting, and team administration</li>
              <li>Leasing pipelines and operational oversight</li>
            </ul>
          </article>
          <article className="mk-platform-card">
            <h3>Mobile</h3>
            <ul>
              <li>Respond and communicate in the field</li>
              <li>Approve actions and capture evidence</li>
              <li>Act on maintenance and operational alerts</li>
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
            One operating system for properties, people, and operations — from leasing to maintenance,
            from payments to reporting.
          </p>
          <div className="mk-cta-actions">
            <a href={appPath("/signup")} className="mk-btn mk-btn-primary">
              Get Started
            </a>
            <Link to="/contact" className="mk-btn mk-btn-secondary mk-btn-on-dark">
              Request a Demo
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
