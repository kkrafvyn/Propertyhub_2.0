import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bot,
  Building2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  FileText,
  HeadphonesIcon,
  Landmark,
  Layers,
  LayoutDashboard,
  LineChart,
  Lock,
  Mail,
  MessageCircle,
  Monitor,
  Moon,
  PhoneCall,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { ConsumerJourneyShowcase } from "../../components/marketing/ConsumerJourneyShowcase";
import { TrustTraceShowcase } from "../../components/marketing/TrustTraceShowcase";
import { appPath } from "../../../lib/marketing-urls";

// ── Reveal animation hook ────────────────────────────────────────────────────
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
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
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
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  stagger?: boolean;
  delay?: number;
}) {
  const ref = useReveal();
  return (
    <div
      ref={ref}
      className={`mk-reveal${stagger ? " mk-reveal--stagger" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms`, animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

// ── Page entry point ─────────────────────────────────────────────────────────
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
      <StatsBar />
      <ProblemSection />
      <WorkflowSection />
      <BusinessSection />
      <ConsumerSection />
      <AISection />
      <NightWatchSection />
      <TrustSection />
      <PortfolioCalculatorSection />
      <ExplorerSection />
      <TeamsSection />
      <PlatformSection />
      <FAQSection />
      <CTASection />
    </>
  );
}

// ── Hero ─────────────────────────────────────────────────────────────────────
const HERO_TABS = [
  { id: "ops", label: "Portfolio Ops", icon: LayoutDashboard },
  { id: "finance", label: "Cashflow", icon: TrendingUp },
  { id: "ai", label: "AI Night Watch", icon: Moon },
] as const;

type HeroTabId = (typeof HERO_TABS)[number]["id"];

function HeroOpsPreview() {
  return (
    <div className="mk-hero-preview-body">
      <div className="mk-hpb-stat-row">
        {[
          { label: "Units Managed", value: "248", delta: "+12 this month", up: true },
          { label: "Occupancy Rate", value: "96.4%", delta: "+1.2pp", up: true },
          { label: "Open Tickets", value: "7", delta: "3 urgent", up: false },
        ].map((s) => (
          <div key={s.label} className="mk-hpb-stat">
            <span className="mk-hpb-stat-label">{s.label}</span>
            <span className="mk-hpb-stat-value">{s.value}</span>
            <span className={`mk-hpb-stat-delta ${s.up ? "mk-hpb-stat-delta--up" : "mk-hpb-stat-delta--warn"}`}>
              {s.delta}
            </span>
          </div>
        ))}
      </div>
      <div className="mk-hpb-list">
        {[
          { title: "Airport Hills · Unit 204", tag: "Active lease", color: "green" },
          { title: "Cantonments Terrace · Unit 11", tag: "Renewal due", color: "amber" },
          { title: "Labone Court · Unit 6", tag: "Maintenance pending", color: "orange" },
        ].map((r) => (
          <div key={r.title} className="mk-hpb-row">
            <span className="mk-hpb-row-title">{r.title}</span>
            <span className={`mk-hpb-row-tag mk-hpb-row-tag--${r.color}`}>{r.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroFinancePreview() {
  return (
    <div className="mk-hero-preview-body">
      <div className="mk-hpb-stat-row">
        {[
          { label: "Collected (Oct)", value: "GHS 186k", delta: "94.2% of due", up: true },
          { label: "Overdue", value: "GHS 11k", delta: "3 accounts", up: false },
          { label: "Owner Payouts", value: "GHS 142k", delta: "Disbursed", up: true },
        ].map((s) => (
          <div key={s.label} className="mk-hpb-stat">
            <span className="mk-hpb-stat-label">{s.label}</span>
            <span className="mk-hpb-stat-value">{s.value}</span>
            <span className={`mk-hpb-stat-delta ${s.up ? "mk-hpb-stat-delta--up" : "mk-hpb-stat-delta--warn"}`}>
              {s.delta}
            </span>
          </div>
        ))}
      </div>
      <div className="mk-hpb-sparkline-row">
        <span className="mk-hpb-sparkline-label">Collection rate — last 6 months</span>
        <div className="mk-hpb-sparkline" aria-hidden="true">
          {[82, 88, 91, 89, 93, 94].map((v, i) => (
            <div key={i} className="mk-hpb-bar" style={{ height: `${v}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function HeroAIPreview() {
  const feedItems = [
    {
      time: "02:14",
      icon: AlertTriangle,
      iconColor: "red",
      title: "Emergency escalation",
      body: "Unit 204 water leak — ticket auto-created, contractor notified, manager alerted.",
      tag: "Urgent",
      tagColor: "red",
    },
    {
      time: "05:30",
      icon: DollarSign,
      iconColor: "green",
      title: "Rent reminder dispatched",
      body: "Auto-localized SMS + in-app reminder sent to 12 tenants due tomorrow.",
      tag: "Automated",
      tagColor: "green",
    },
    {
      time: "06:45",
      icon: FileText,
      iconColor: "amber",
      title: "Lease expiry alert",
      body: "3 leases expiring within 30 days. Renewal workflows triggered for review.",
      tag: "Pending review",
      tagColor: "amber",
    },
  ];

  return (
    <div className="mk-hero-preview-body">
      <div className="mk-hpb-feed">
        {feedItems.map((item) => {
          const ItemIcon = item.icon;
          return (
            <div key={item.time} className="mk-hpb-feed-item">
              <span className="mk-hpb-feed-time">{item.time}</span>
              <div className="mk-hpb-feed-content">
                <div className="mk-hpb-feed-header">
                  <span className={`mk-hpb-feed-icon-box mk-hpb-feed-icon-box--${item.iconColor}`}>
                    <ItemIcon size={12} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <span className="mk-hpb-feed-title">{item.title}</span>
                  <span className={`mk-hpb-row-tag mk-hpb-row-tag--${item.tagColor}`}>{item.tag}</span>
                </div>
                <p className="mk-hpb-feed-body">{item.body}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroSection() {
  const [activeTab, setActiveTab] = useState<HeroTabId>("ops");

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
              <a href={appPath("/signup")} className="mk-btn mk-btn-primary mk-btn-glow" id="hero-cta-get-started">
                Get Started <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a href="#business" className="mk-btn mk-btn-secondary" id="hero-cta-businesses">
                For Businesses
              </a>
              <a href={appPath("/search")} className="mk-btn mk-btn-secondary" id="hero-cta-explore">
                Explore Properties
              </a>
            </div>
          </div>
        </Reveal>

        <div className="mk-hero-visual">
          <div className="mk-hero-grid-bg" />

          {/* Floating accent cards (safely positioned outside tab area) */}
          <div className="mk-hero-float-card mk-hero-float-card--top-right">
            <BadgeCheck size={15} className="mk-hfc-icon mk-hfc-icon--green" />
            <span>Rent collected · <strong>GHS 186k</strong></span>
          </div>
          <div className="mk-hero-float-card mk-hero-float-card--bottom-left">
            <Bot size={15} className="mk-hfc-icon mk-hfc-icon--accent" />
            <span>AI Night Watch active</span>
          </div>

          {/* OS preview window */}
          <div className="mk-hero-os-window">
            <div className="mk-hero-os-bar">
              <span className="mk-showcase-frame-dots">
                <i /><i /><i />
              </span>
              <div className="mk-hero-os-tabs" role="tablist">
                {HERO_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      type="button"
                      className={`mk-hero-os-tab${activeTab === tab.id ? " is-active" : ""}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <Icon size={12} aria-hidden="true" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div key={activeTab} className="mk-hero-os-body mk-showcase-crossfade">
              {activeTab === "ops" && <HeroOpsPreview />}
              {activeTab === "finance" && <HeroFinancePreview />}
              {activeTab === "ai" && <HeroAIPreview />}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { value: "14,000+", label: "Units managed" },
    { value: "99.2%", label: "On-time collection rate" },
    { value: "$120M+", label: "Transaction volume governed" },
    { value: "8", label: "Markets live" },
    { value: "< 2min", label: "Avg. maintenance triage time" },
    { value: "100%", label: "Multi-currency support" },
  ];

  return (
    <section className="mk-stats-bar" aria-label="Platform statistics">
      <Reveal stagger>
        <div className="mk-stats-inner">
          {stats.map((s) => (
            <div key={s.label} className="mk-stat-item">
              <span className="mk-stat-value">{s.value}</span>
              <span className="mk-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

// ── Problem ──────────────────────────────────────────────────────────────────
function ProblemSection() {
  const tools = [
    { name: "WhatsApp", icon: MessageCircle, color: "#25D366" },
    { name: "Excel", icon: FileSpreadsheet, color: "#107C41" },
    { name: "Email", icon: Mail, color: "#EA4335" },
    { name: "Spreadsheets", icon: Layers, color: "#0F9D58" },
    { name: "Paper records", icon: FileText, color: "#6B7280" },
    { name: "Bank statements", icon: Landmark, color: "#1E3A8A" },
    { name: "Manual follow-ups", icon: PhoneCall, color: "#D97706" },
    { name: "Separate CRM", icon: Wrench, color: "#7C3AED" },
    { name: "Disconnected payments", icon: CreditCard, color: "#C45A3A" },
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
              {tools.map((tool) => {
                const ToolIcon = tool.icon;
                return (
                  <div key={tool.name} className="mk-chaos-chip">
                    <span className="mk-chaos-chip-svg" style={{ color: tool.color }}>
                      <ToolIcon size={16} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <span>{tool.name}</span>
                  </div>
                );
              })}
            </div>

            <div className="mk-transform-arrow mk-transform-arrow--down" aria-hidden="true">↓</div>
            <div className="mk-transform-arrow mk-transform-arrow--right" aria-hidden="true">→</div>

            <div className="mk-unified-panel">
              <div className="mk-unified-panel-badge">
                <Sparkles size={14} aria-hidden="true" /> One OS
              </div>
              <h3>BAYTMIFTAH</h3>
              <p>Bring the entire operation together — one Real Estate Operating System.</p>
              <div className="mk-unified-panel-features">
                {["Live ledger","Governed AI","Audit trail","Multi-currency","Mobile + Desktop"].map((f) => (
                  <span key={f} className="mk-unified-feature-pill">{f}</span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Workflow ─────────────────────────────────────────────────────────────────
const WORKFLOW_PILLARS = [
  {
    icon: Building2,
    label: "Properties",
    desc: "Units, estates, occupancy, lease lifecycle — one source of truth.",
  },
  {
    icon: Search,
    label: "People",
    desc: "Owners, tenants, agents, contractors — role-aware access across the org.",
  },
  {
    icon: FileText,
    label: "Leases",
    desc: "Applications, offers, renewals, e-signatures, and archival.",
  },
  {
    icon: CreditCard,
    label: "Money",
    desc: "Collections, reconciliation, owner statements, payables, FX.",
  },
  {
    icon: Wrench,
    label: "Maintenance",
    desc: "Tickets, SLAs, contractors, field updates — off WhatsApp.",
  },
  {
    icon: MessageCircle,
    label: "Communication",
    desc: "Omnichannel inbox tied to property, lease, and operational record.",
  },
  {
    icon: LineChart,
    label: "Data",
    desc: "Performance, reporting, and analytics from live operational data.",
  },
  {
    icon: Sparkles,
    label: "AI",
    desc: "Governed autonomous workflows with human approval and kill switches.",
  },
] as const;

function WorkflowSection() {
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

        <Reveal stagger>
          <div className="mk-workflow-grid mk-stagger-grid">
            {WORKFLOW_PILLARS.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.label} className="mk-workflow-card">
                  <div className="mk-workflow-icon">
                    <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h3 className="mk-workflow-label">{pillar.label}</h3>
                  <p className="mk-workflow-desc">{pillar.desc}</p>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Business modules ──────────────────────────────────────────────────────────
function BusinessSection() {
  const modules = [
    {
      icon: LayoutDashboard,
      title: "See the entire operation",
      copy: "Know what is happening across every property. Properties, units, leases, occupancy, tasks, and teams in one place.",
      accent: "forest",
    },
    {
      icon: TrendingUp,
      title: "Know where the money stands",
      copy: "Track payment workflows, collections, reconciliation, and financial activity without jumping between systems. BaytMiftah is the operational layer around your finances.",
      accent: "green",
    },
    {
      icon: Wrench,
      title: "Maintenance shouldn't live in a chat thread",
      copy: "Turn resident requests into tickets, assign work, track SLAs, escalate delays, and keep everyone informed — not buried in WhatsApp.",
      accent: "orange",
    },
    {
      icon: FileText,
      title: "Turn property interest into organized business",
      copy: "Manage leads, viewings, applications, offers, and leasing workflows from one system — not a scattered pipeline.",
      accent: "forest",
    },
    {
      icon: MessageCircle,
      title: "Messages become work",
      copy: "When someone says the pipe is leaking, BaytMiftah can turn the conversation into a governed operational workflow — not another lost message.",
      accent: "green",
    },
    {
      icon: LineChart,
      title: "See performance from connected data",
      copy: "Understand operational, financial, and organizational performance from the same underlying data your teams work in every day.",
      accent: "accent",
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
            need one operating environment — not another tool stack.
          </p>
        </Reveal>

        <Reveal stagger>
          <div className="mk-module-grid mk-module-grid--3 mk-stagger-grid">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <article key={mod.title} className={`mk-module-card mk-module-card--${mod.accent}`}>
                  <div className="mk-module-icon">
                    <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                  </div>
                  <h3>{mod.title}</h3>
                  <p>{mod.copy}</p>
                </article>
              );
            })}
          </div>
        </Reveal>

        <div className="mk-hero-actions" style={{ marginTop: "2.5rem" }}>
          <a href={appPath("/signup")} className="mk-btn mk-btn-primary mk-btn-glow" id="business-cta-get-started">
            Get Started
          </a>
          <Link to="/contact" className="mk-btn mk-btn-secondary" id="business-cta-demo">
            Request a Demo
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Consumer ──────────────────────────────────────────────────────────────────
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

// ── AI ────────────────────────────────────────────────────────────────────────
const AI_SCENARIOS = [
  {
    id: "leak",
    icon: AlertTriangle,
    iconColor: "red",
    label: "Emergency maintenance",
    title: "Water leak detected in Unit 204",
    steps: [
      { label: "Intent detected", detail: "AI parses tenant message: \u201cpipe is leaking badly\u201d" },
      { label: "Permission check", detail: "maintenance:create validated for Property Manager role" },
      { label: "Ticket auto-created", detail: "Ticket #MT-2041 opened, SLA timer started (4 hrs)" },
      { label: "Contractor notified", detail: "Closest verified plumber dispatched via SMS & app" },
      { label: "Manager alerted", detail: "Escalation pushed to manager dashboard with evidence log" },
    ],
  },
  {
    id: "rent",
    icon: DollarSign,
    iconColor: "green",
    label: "Rent collection",
    title: "Auto-localized rent reminders sent",
    steps: [
      { label: "Collection event triggered", detail: "12 tenants have rent due in 24 hrs" },
      { label: "Permission check", detail: "finance:remind validated for Finance role" },
      { label: "Localization applied", detail: "Messages localized to 3 languages, 2 currencies" },
      { label: "Multi-channel dispatch", detail: "SMS, in-app, and email reminders delivered" },
      { label: "Response tracked", detail: "3 payments received in 45 min; 9 monitored ongoing" },
    ],
  },
  {
    id: "lease",
    icon: FileText,
    iconColor: "amber",
    label: "Lease management",
    title: "Lease expiry yield optimization",
    steps: [
      { label: "Expiry detected", detail: "3 leases expiring within 30 days flagged" },
      { label: "Market data pulled", detail: "AI benchmarks current vs. comparable market rent" },
      { label: "Approval required", detail: "Renewal offer draft submitted to Property Manager" },
      { label: "Human reviews", detail: "Manager approves or adjusts terms in one click" },
      { label: "Renewal dispatched", detail: "Offer sent to tenant, e-signature workflow triggered" },
    ],
  },
] as const;

type AIScenarioId = (typeof AI_SCENARIOS)[number]["id"];

function AISection() {
  const [activeScenario, setActiveScenario] = useState<AIScenarioId>("leak");
  const scenario = AI_SCENARIOS.find((s) => s.id === activeScenario) ?? AI_SCENARIOS[0];
  const ActiveIcon = scenario.icon;

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

        <div className="mk-ai-studio">
          <div className="mk-ai-scenario-tabs" role="tablist" aria-label="AI scenarios">
            {AI_SCENARIOS.map((s) => {
              const TabIcon = s.icon;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={activeScenario === s.id}
                  className={`mk-ai-tab${activeScenario === s.id ? " is-active" : ""}`}
                  onClick={() => setActiveScenario(s.id)}
                >
                  <span className={`mk-ai-tab-svg mk-ai-tab-svg--${s.iconColor}`}>
                    <TabIcon size={14} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          <div key={activeScenario} className="mk-ai-pipeline-panel mk-showcase-crossfade">
            <div className="mk-ai-pipeline-header">
              <span className={`mk-ai-pipeline-icon-box mk-ai-pipeline-icon-box--${scenario.iconColor}`}>
                <ActiveIcon size={16} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <h3 className="mk-ai-pipeline-title">{scenario.title}</h3>
              <span className="mk-ai-pipeline-badge">
                <Lock size={11} aria-hidden="true" /> Governed
              </span>
            </div>
            <div className="mk-ai-pipeline-steps">
              {scenario.steps.map((step, i) => (
                <div key={step.label} className="mk-ai-step">
                  <div className="mk-ai-step-number">{i + 1}</div>
                  <div className="mk-ai-step-body">
                    <span className="mk-ai-step-label">{step.label}</span>
                    <span className="mk-ai-step-detail">{step.detail}</span>
                  </div>
                  {i < scenario.steps.length - 1 && (
                    <div className="mk-ai-step-line" aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Night Watch ────────────────────────────────────────────────────────────────
function NightWatchSection() {
  const alerts = [
    {
      icon: DollarSign,
      type: "Finance",
      msg: "Payment #PAY-8821 failed — 3 retry attempts scheduled",
      severity: "warn",
      color: "amber",
    },
    {
      icon: Wrench,
      type: "Maintenance",
      msg: "Ticket #MT-1098 overdue by 6 hrs — escalating to supervisor",
      severity: "alert",
      color: "red",
    },
    {
      icon: FileText,
      type: "Lease",
      msg: "2 lease renewals expiring in 14 days — reminder workflow triggered",
      severity: "info",
      color: "forest",
    },
    {
      icon: Lock,
      type: "Security",
      msg: "Unusual login location for manager account — step-up auth prompted",
      severity: "alert",
      color: "red",
    },
  ];

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

        <Reveal stagger>
          <div className="mk-night-watch-feed">
            <div className="mk-night-watch-header">
              <Moon size={14} aria-hidden="true" />
              <span>AI Night Watch · Active monitoring</span>
              <span className="mk-night-watch-live">LIVE</span>
            </div>
            {alerts.map((a) => {
              const AlertIcon = a.icon;
              return (
                <div key={a.msg} className={`mk-nw-alert mk-nw-alert--${a.severity}`}>
                  <span className={`mk-nw-svg-box mk-nw-svg-box--${a.color}`}>
                    <AlertIcon size={14} strokeWidth={2.2} aria-hidden="true" />
                  </span>
                  <div className="mk-nw-body">
                    <span className="mk-nw-type">{a.type}</span>
                    <span className="mk-nw-msg">{a.msg}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Trust ─────────────────────────────────────────────────────────────────────
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

// ── Portfolio ROI Calculator ─────────────────────────────────────────────────
function PortfolioCalculatorSection() {
  const [units, setUnits] = useState(50);
  const [avgRent, setAvgRent] = useState(8000);
  const [delinqReduction, setDelinqReduction] = useState(30);

  const currentDelinq = units * avgRent * 0.07;
  const savedDelinq = currentDelinq * (delinqReduction / 100);
  const hoursSaved = Math.round(units * 3.2 * (delinqReduction / 100));

  const fmt = (n: number) =>
    n >= 1000 ? `GHS ${(n / 1000).toFixed(1)}k` : `GHS ${Math.round(n)}`;

  return (
    <section className="mk-section" id="calculator">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">ROI calculator</p>
          <h2 className="mk-section-title">See what efficiency looks like for your portfolio.</h2>
          <p className="mk-section-copy">
            Adjust the sliders to estimate monthly operational time savings and cashflow recovered.
          </p>
        </Reveal>

        <Reveal>
          <div className="mk-calc-panel">
            <div className="mk-calc-controls">
              {[
                {
                  id: "units",
                  label: "Portfolio size",
                  value: units,
                  min: 5,
                  max: 500,
                  step: 5,
                  format: (v: number) => `${v} units`,
                  setter: setUnits,
                },
                {
                  id: "rent",
                  label: "Average monthly rent",
                  value: avgRent,
                  min: 1000,
                  max: 50000,
                  step: 500,
                  format: (v: number) => `GHS ${v.toLocaleString()}`,
                  setter: setAvgRent,
                },
                {
                  id: "delinq",
                  label: "Target delinquency reduction",
                  value: delinqReduction,
                  min: 5,
                  max: 70,
                  step: 5,
                  format: (v: number) => `${v}%`,
                  setter: setDelinqReduction,
                },
              ].map((ctrl) => (
                <div key={ctrl.id} className="mk-calc-slider-group">
                  <div className="mk-calc-slider-header">
                    <label htmlFor={`calc-${ctrl.id}`} className="mk-calc-slider-label">
                      {ctrl.label}
                    </label>
                    <span className="mk-calc-slider-value">{ctrl.format(ctrl.value)}</span>
                  </div>
                  <input
                    id={`calc-${ctrl.id}`}
                    type="range"
                    min={ctrl.min}
                    max={ctrl.max}
                    step={ctrl.step}
                    value={ctrl.value}
                    className="mk-calc-range"
                    onChange={(e) => ctrl.setter(Number(e.target.value))}
                  />
                </div>
              ))}
            </div>

            <div className="mk-calc-results">
              <p className="mk-calc-results-label">Estimated monthly impact</p>
              <div className="mk-calc-result-item">
                <div className="mk-calc-result-svg-box mk-calc-result-svg-box--green">
                  <Banknote size={20} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div>
                  <span className="mk-calc-result-value">{fmt(savedDelinq)}</span>
                  <span className="mk-calc-result-desc">Cashflow recovered from collections</span>
                </div>
              </div>
              <div className="mk-calc-result-item">
                <div className="mk-calc-result-svg-box mk-calc-result-svg-box--forest">
                  <Clock size={20} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div>
                  <span className="mk-calc-result-value">{hoursSaved} hrs</span>
                  <span className="mk-calc-result-desc">Management time saved monthly</span>
                </div>
              </div>
              <p className="mk-calc-disclaimer">
                Estimates based on industry benchmarks. Actual results vary by portfolio.
              </p>
              <a href={appPath("/signup")} className="mk-btn mk-btn-primary mk-btn-glow" id="calc-cta">
                Start for free <ArrowRight size={15} aria-hidden="true" />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── Explorer ──────────────────────────────────────────────────────────────────
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
          <Link to="/explorer" className="mk-btn mk-btn-secondary" id="explorer-cta">
            Open Event Ledger
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Teams ─────────────────────────────────────────────────────────────────────
const ROLES = [
  {
    id: "executive",
    label: "Executive",
    icon: TrendingUp,
    title: "Portfolio visibility without the status meeting.",
    copy: "See collections, occupancy, maintenance risk, and operational exceptions from one command view — connected to the same data your teams work in every day.",
    metrics: [
      { label: "Collection rate", value: "96.4%" },
      { label: "Occupancy", value: "94.1%" },
      { label: "Open exceptions", value: "3" },
    ],
  },
  {
    id: "property-management",
    label: "Property management",
    icon: Building2,
    title: "Run estates from one operational workspace.",
    copy: "Manage properties, units, leases, occupancies, inspections, and daily tasks without switching between spreadsheets, chats, and separate maintenance tools.",
    metrics: [
      { label: "Active leases", value: "248" },
      { label: "Inspections due", value: "7" },
      { label: "Pending approvals", value: "4" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: CreditCard,
    title: "Know where the money stands.",
    copy: "Track receivables, journal entries, bank reconciliation, owner statements, and collections workflows in the operational layer around your finances.",
    metrics: [
      { label: "Receivables", value: "GHS 186k" },
      { label: "Overdue", value: "GHS 11k" },
      { label: "Reconciled", value: "99.1%" },
    ],
  },
  {
    id: "leasing",
    label: "Leasing / sales",
    icon: Search,
    title: "Turn property interest into organized business.",
    copy: "Manage leads, viewings, applications, offers, and leasing pipelines from one system — with the same property and contact records the rest of the operation uses.",
    metrics: [
      { label: "Active leads", value: "34" },
      { label: "Viewings this week", value: "12" },
      { label: "Applications open", value: "6" },
    ],
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    title: "Turn problems into tracked work.",
    copy: "Convert resident requests into tickets, assign contractors, track SLAs, escalate delays, and capture field evidence — instead of losing requests in message threads.",
    metrics: [
      { label: "Open tickets", value: "7" },
      { label: "SLA compliance", value: "91%" },
      { label: "Avg. close time", value: "1.8 days" },
    ],
  },
  {
    id: "customer-service",
    label: "Customer service",
    icon: HeadphonesIcon,
    title: "Messages become work.",
    copy: "Route resident inquiries into governed tickets and workflows, track SLAs, and keep communication tied to the property, lease, and operational record.",
    metrics: [
      { label: "Open conversations", value: "18" },
      { label: "Avg. response", value: "< 4 hrs" },
      { label: "CSAT score", value: "4.7 / 5" },
    ],
  },
] as const;

type RoleId = (typeof ROLES)[number]["id"];

function TeamsSection() {
  const [activeRoleId, setActiveRoleId] = useState<RoleId>("executive");
  const activeRole = ROLES.find((r) => r.id === activeRoleId) ?? ROLES[0];

  return (
    <section className="mk-section mk-problem" id="teams">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">One platform, many teams</p>
          <h2 className="mk-section-title">Role-aware experiences for every function.</h2>
        </Reveal>

        <div className="mk-teams-layout">
          <div className="mk-role-picker" role="tablist" aria-label="Team roles">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isActive = role.id === activeRoleId;
              return (
                <button
                  key={role.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`mk-role-btn${isActive ? " is-active" : ""}`}
                  onClick={() => setActiveRoleId(role.id)}
                >
                  <Icon size={15} aria-hidden="true" />
                  <span>{role.label}</span>
                  {isActive && <ChevronRight size={14} aria-hidden="true" className="mk-role-btn-arrow" />}
                </button>
              );
            })}
          </div>

          <div key={activeRoleId} className="mk-role-detail-panel mk-showcase-crossfade" aria-live="polite">
            <h3 className="mk-role-detail-title">{activeRole.title}</h3>
            <p className="mk-role-detail-copy">{activeRole.copy}</p>
            <div className="mk-role-metrics">
              {activeRole.metrics.map((m) => (
                <div key={m.label} className="mk-role-metric">
                  <span className="mk-role-metric-value">{m.value}</span>
                  <span className="mk-role-metric-label">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Platform ──────────────────────────────────────────────────────────────────
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
        <Reveal stagger>
          <div className="mk-platform-split mk-stagger-grid">
            <article className="mk-platform-card">
              <div className="mk-platform-icon">
                <Monitor size={24} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3>Desktop &amp; web</h3>
              <ul>
                <li>Portfolio visibility and configuration</li>
                <li>Finance, reporting, and team administration</li>
                <li>Leasing pipelines and operational oversight</li>
                <li>Approval chains, audit log, and AI governance controls</li>
              </ul>
            </article>
            <article className="mk-platform-card">
              <div className="mk-platform-icon">
                <Smartphone size={24} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3>Mobile</h3>
              <ul>
                <li>Respond and communicate in the field</li>
                <li>Approve actions and capture evidence</li>
                <li>Act on maintenance and operational alerts</li>
                <li>Push notifications and real-time status updates</li>
              </ul>
            </article>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "How long does onboarding take?",
    a: "Most teams are live within 1–2 weeks. We provide structured onboarding, data migration support, and a dedicated setup session. Complex enterprise deployments are scoped individually.",
  },
  {
    q: "Is BaytMiftah a bank or payment processor?",
    a: "No. BaytMiftah is the operational and governance layer around your finances. We integrate with your existing banking and payment rails — we do not hold or process your funds.",
  },
  {
    q: "Does it work in multiple currencies?",
    a: "Yes. BaytMiftah natively supports multi-currency portfolios with FX tracking, localized payment reminders, and multi-currency financial reporting across your portfolio.",
  },
  {
    q: "How secure is the data?",
    a: "BaytMiftah uses row-level security, organization-scoped tenant isolation, permission-based access control, complete audit trails, and optional step-up authentication. All data is encrypted at rest and in transit.",
  },
  {
    q: "Can tenants and buyers use it too?",
    a: "Yes. Consumers get a separate tenant-facing interface to discover properties, manage their lease, pay rent, submit maintenance requests, and communicate — connected to the same platform the business operates on.",
  },
  {
    q: "Is there a mobile app?",
    a: "Yes. BaytMiftah ships native iOS and Android apps for field teams, property managers, and tenants — connected to the same operational data as the desktop platform.",
  },
  {
    q: "What happens to our data if we leave?",
    a: "Your data belongs to you. We provide full data exports in standard formats at any time. We do not lock you in with proprietary data structures.",
  },
] as const;

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="mk-section" id="faq">
      <div className="mk-container">
        <Reveal>
          <p className="mk-eyebrow">FAQ</p>
          <h2 className="mk-section-title">Common questions, direct answers.</h2>
        </Reveal>

        <Reveal stagger>
          <div className="mk-faq-list" role="list">
            {FAQS.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={faq.q} className={`mk-faq-item${isOpen ? " is-open" : ""}`} role="listitem">
                  <button
                    type="button"
                    className="mk-faq-trigger"
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    id={`faq-trigger-${i}`}
                    aria-controls={`faq-panel-${i}`}
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className="mk-faq-chevron"
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-trigger-${i}`}
                    className="mk-faq-panel"
                  >
                    <p className="mk-faq-answer">{faq.a}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────
function CTASection() {
  return (
    <section className="mk-cta">
      <div className="mk-container">
        <Reveal>
          <div className="mk-cta-inner">
            <div className="mk-cta-glow-a" aria-hidden="true" />
            <div className="mk-cta-glow-b" aria-hidden="true" />

            <div className="mk-cta-badges">
              <span className="mk-cta-badge"><ShieldCheck size={12} aria-hidden="true" /> Bank-grade security</span>
              <span className="mk-cta-badge"><Zap size={12} aria-hidden="true" /> Governed AI</span>
              <span className="mk-cta-badge"><BadgeCheck size={12} aria-hidden="true" /> No credit card required</span>
            </div>

            <h2 className="mk-display">Run real estate differently.</h2>
            <p className="mk-lead">
              One operating system for properties, people, and operations — from leasing to maintenance,
              from payments to reporting.
            </p>

            <div className="mk-cta-actions">
              <a href={appPath("/signup")} className="mk-btn mk-btn-cta-primary" id="cta-get-started">
                Get Started Free <ArrowRight size={16} aria-hidden="true" />
              </a>
              <Link to="/contact" className="mk-btn mk-btn-on-dark" id="cta-demo">
                Request a Demo
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
