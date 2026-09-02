import { useState } from "react";
import {
  ClipboardCheck,
  Globe,
  Lock,
  Paperclip,
  Shield,
  Sparkles,
} from "lucide-react";

const EVENTS = [
  {
    id: "identity",
    time: "09:42",
    title: "Identity verified",
    actor: "Property Manager",
    organization: "Example Estates Ltd",
    property: "Airport Hills · Unit 204",
    action: "Session authenticated with organization context",
    evidence: "Auth event · MFA satisfied",
  },
  {
    id: "permissions",
    time: "09:44",
    title: "Permission checked",
    actor: "Property Manager",
    organization: "Example Estates Ltd",
    property: "Airport Hills · Unit 204",
    action: "finance:read and listings:write validated for role",
    evidence: "Permission matrix · 2 rules matched",
  },
  {
    id: "organization",
    time: "09:45",
    title: "Organization boundary applied",
    actor: "System",
    organization: "Example Estates Ltd",
    property: "—",
    action: "Tenant isolation scope enforced on query",
    evidence: "RLS context · org_id set",
  },
  {
    id: "property",
    time: "09:47",
    title: "Property record updated",
    actor: "Property Manager",
    organization: "Example Estates Ltd",
    property: "Airport Hills · Unit 204",
    action: "Occupancy status changed to reserved",
    evidence: "Unit record · before/after snapshot",
  },
  {
    id: "transaction",
    time: "09:48",
    title: "Transaction created",
    actor: "Property Manager",
    organization: "Example Estates Ltd",
    property: "Airport Hills · Unit 204",
    action: "Payment status updated to received",
    evidence: "3 linked records",
  },
  {
    id: "audit",
    time: "09:49",
    title: "Audit event stored",
    actor: "System",
    organization: "Example Estates Ltd",
    property: "Airport Hills · Unit 204",
    action: "Operational event written to audit trail",
    evidence: "Event ledger reference · pseudonymous ID",
  },
  {
    id: "evidence",
    time: "09:51",
    title: "Evidence linked",
    actor: "Property Manager",
    organization: "Example Estates Ltd",
    property: "Airport Hills · Unit 204",
    action: "Receipt and approval attached to transaction",
    evidence: "Document hash · 2 files",
  },
] as const;

const PILLARS = [
  {
    id: "permissions",
    label: "Permission-based access",
    icon: Lock,
    tone: "blue",
    eventId: "permissions",
  },
  {
    id: "organization",
    label: "Organization isolation",
    icon: Globe,
    tone: "blue",
    eventId: "organization",
  },
  {
    id: "audit-trails",
    label: "Audit trails",
    icon: Shield,
    tone: "blue",
    eventId: "audit",
  },
  {
    id: "verification",
    label: "Verification workflows",
    icon: ClipboardCheck,
    tone: "green",
    eventId: "identity",
  },
  {
    id: "evidence",
    label: "Evidence & attachments",
    icon: Paperclip,
    tone: "green",
    eventId: "evidence",
  },
  {
    id: "ai",
    label: "Controlled AI actions",
    icon: Sparkles,
    tone: "purple",
    eventId: "transaction",
  },
] as const;

type EventId = (typeof EVENTS)[number]["id"];
type PillarId = (typeof PILLARS)[number]["id"];

export function TrustTraceShowcase() {
  const [activeEvent, setActiveEvent] = useState<EventId>("transaction");
  const [activePillar, setActivePillar] = useState<PillarId | null>(null);
  const selected = EVENTS.find((event) => event.id === activeEvent) ?? EVENTS[4];

  function selectPillar(pillar: (typeof PILLARS)[number]) {
    setActivePillar(pillar.id);
    setActiveEvent(pillar.eventId);
  }

  function selectEvent(eventId: EventId) {
    setActiveEvent(eventId);
    const pillar = PILLARS.find((item) => item.eventId === eventId);
    setActivePillar(pillar?.id ?? null);
  }

  return (
    <div className="mk-showcase-split mk-showcase-split--trust">
      <div className="mk-showcase-copy mk-showcase-copy--trust">
        <p className="mk-eyebrow mk-eyebrow--trust">Trust &amp; accountability</p>
        <h2 className="mk-section-title">Know who did what, when, and why.</h2>
        <p className="mk-section-copy mk-showcase-intro">
          Permission-based access, organization isolation, audit trails, verification workflows, and
          controlled AI actions — so teams operate with visibility and evidence, not blind trust.
        </p>

        <div className="mk-trust-pillars" role="list" aria-label="Trust capabilities">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            const isActive = activePillar === pillar.id;

            return (
              <button
                key={pillar.id}
                type="button"
                role="listitem"
                className={`mk-trust-pillar mk-trust-pillar--${pillar.tone}${isActive ? " mk-trust-pillar--active" : ""}`}
                onClick={() => selectPillar(pillar)}
              >
                <span className="mk-trust-pillar-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <span className="mk-trust-pillar-label">{pillar.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mk-showcase-stage">
        <div className="mk-showcase-frame mk-showcase-frame--dark">
          <div className="mk-showcase-frame-bar mk-showcase-frame-bar--dark">
            <span className="mk-showcase-frame-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="mk-showcase-frame-title">Property activity</span>
            <span className="mk-showcase-frame-tag">Audit trace</span>
          </div>
          <div className="mk-showcase-frame-body mk-showcase-frame-body--dark">
            <div className="mk-trace-layout">
              <ol className="mk-trace-timeline" role="list">
                {EVENTS.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      className={`mk-trace-event${activeEvent === event.id ? " mk-trace-event--active" : ""}`}
                      onClick={() => selectEvent(event.id)}
                    >
                      <span className="mk-trace-time">{event.time}</span>
                      <span className="mk-trace-event-title">{event.title}</span>
                    </button>
                  </li>
                ))}
              </ol>

              <article key={activeEvent} className="mk-trace-detail" aria-live="polite">
                <p className="mk-trace-detail-kicker">{selected.title}</p>
                <p className="mk-trace-detail-time">{selected.time}:12</p>
                <dl className="mk-trace-detail-grid">
                  <div>
                    <dt>Actor</dt>
                    <dd>{selected.actor}</dd>
                  </div>
                  <div>
                    <dt>Organization</dt>
                    <dd>{selected.organization}</dd>
                  </div>
                  <div>
                    <dt>Property</dt>
                    <dd>{selected.property}</dd>
                  </div>
                  <div>
                    <dt>Action</dt>
                    <dd>{selected.action}</dd>
                  </div>
                  <div className="mk-trace-detail-wide">
                    <dt>Evidence</dt>
                    <dd>{selected.evidence}</dd>
                  </div>
                </dl>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
