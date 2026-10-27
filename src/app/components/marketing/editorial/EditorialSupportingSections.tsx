import { Suspense, useEffect, useState, type ComponentType } from "react";
import { useEditorialReveal } from "./useEditorialReveal";
const ROLES = [
  {
    id: "executive",
    label: "Executive",
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
    title: "Run estates from one operational workspace.",
    copy: "Manage properties, units, leases, occupancies, inspections, and daily tasks without switching between spreadsheets, chats, and separate maintenance tools.",
    metrics: [
      { label: "Active leases", value: "Live roster" },
      { label: "Inspections due", value: "Field queue" },
      { label: "Pending approvals", value: "Workflow" },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    title: "Know where the money stands.",
    copy: "Track receivables, journal entries, bank reconciliation, owner statements, and collections workflows in the operational layer around your finances.",
    metrics: [
      { label: "Receivables", value: "Ledger" },
      { label: "Overdue", value: "Aging" },
      { label: "Reconciled", value: "Bank match" },
    ],
  },
  {
    id: "leasing",
    label: "Leasing / sales",
    title: "Turn property interest into organized business.",
    copy: "Manage leads, viewings, applications, offers, and leasing pipelines from one system — with the same property and contact records the rest of the operation uses.",
    metrics: [
      { label: "Active leads", value: "CRM" },
      { label: "Viewings", value: "Calendar" },
      { label: "Applications", value: "Pipeline" },
    ],
  },
  {
    id: "maintenance",
    label: "Maintenance",
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
    title: "Messages become work.",
    copy: "Route resident inquiries into governed tickets and workflows, track SLAs, and keep communication tied to the property, lease, and operational record.",
    metrics: [
      { label: "Open conversations", value: "18" },
      { label: "Avg. response", value: "< 4 hrs" },
      { label: "CSAT score", value: "4.7 / 5" },
    ],
  },
] as const;


export function EditorialRolesSection() {
  const [active, setActive] = useState<string>(ROLES[0].id);
  const role = ROLES.find((item) => item.id === active)!;
  const ref = useEditorialReveal<HTMLElement>();
  return <section id="teams" ref={ref} className="mk-ed-section mk-ed-reveal" aria-labelledby="teams-heading"><div className="mk-ed-container">
    <p className="mk-ed-kicker">One platform, many teams</p><h2 id="teams-heading" className="mk-ed-heading">Role-aware experiences for every function</h2>
    <div className="mk-ed-roles__tabs" role="group" aria-label="Team roles">{ROLES.map((item) => <button key={item.id} type="button" aria-pressed={active === item.id} className={"mk-ed-roles__tab" + (active === item.id ? " is-active" : "")} onClick={() => setActive(item.id)}>{item.label}</button>)}</div>
    <div key={active} className="mk-ed-roles__panel-inner">
      <div className="mk-ed-preview-card" aria-live="polite"><p className="mk-ed-note">Illustrative role preview. Sample metrics, not customer results.</p><h3>{role.title}</h3><p className="mk-ed-lead">{role.copy}</p><dl className="mk-ed-role-metrics">{role.metrics.map((metric) => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl></div>
    </div>
  </div></section>;
}

export function EditorialResidentSection() {
  const ref = useEditorialReveal<HTMLElement>();
  const [Journey, setJourney] = useState<ComponentType | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || Journey) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          observer.disconnect();
          void import("../ConsumerJourneyShowcase").then((mod) => setJourney(() => mod.ConsumerJourneyShowcase));
        }
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [Journey, ref]);

  return (
    <section id="residents" ref={ref} className="mk-ed-section mk-ed-section--surface mk-ed-reveal" aria-labelledby="residents-heading">
      <div className="mk-ed-container">
        <p className="mk-ed-kicker">For residents</p>
        <h2 id="residents-heading" className="mk-ed-heading">A connected journey from search to home</h2>
        <p className="mk-ed-lead">Explore a sample resident journey, from comparing properties to payments and support. Demonstration data only.</p>
        {Journey ? (
          <Suspense fallback={<p className="mk-ed-note">Loading journey preview…</p>}>
            <Journey />
          </Suspense>
        ) : (
          <div className="mk-ed-journey-placeholder" aria-busy="true">
            <p className="mk-ed-note">Journey preview loads as you scroll.</p>
          </div>
        )}
      </div>
    </section>
  );
}

// Implemented connections only. Availability depends on workspace configuration;
// these descriptions do not claim live deployment or partnership verification.
export function EditorialIntegrationsSection() {
  const ref = useEditorialReveal<HTMLElement>();
  const integrations = [
    { name: "Payment checkout", detail: "Connect payment collection to property and lease records. Requires configured payment credentials and supported payment methods." },
    { name: "Email notifications", detail: "Send operational email through the configured delivery service. Availability depends on workspace notification settings and delivery configuration." },
    { name: "Web push notifications", detail: "Receive updates on supported browsers after opting in. Requires notification setup and browser permission." },
  ];
  return <section id="integrations" ref={ref} className="mk-ed-section mk-ed-reveal" aria-labelledby="integrations-heading"><div className="mk-ed-container">
    <p className="mk-ed-kicker">Connected services</p><h2 id="integrations-heading" className="mk-ed-heading">Connections built into the workflows</h2><p className="mk-ed-lead">Implemented service connections are available with the required configuration. Confirm regional availability and your workspace setup during onboarding.</p>
    <ul className="mk-ed-integration-list">{integrations.map((item) => <li key={item.name}><strong>{item.name}</strong><span className="mk-ed-badge mk-ed-badge--conditional">Setup required</span><p>{item.detail}</p></li>)}</ul>
  </div></section>;
}
