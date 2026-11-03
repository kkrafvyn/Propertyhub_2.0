import { useState } from "react";

const SAMPLE_EVENTS = [
  {
    id: "permissions",
    time: "09:44",
    title: "Permission checked",
    actor: "Property Manager",
    action: "finance:read validated for role",
    evidence: "Permission matrix · 2 rules matched",
  },
  {
    id: "property",
    time: "09:47",
    title: "Property record updated",
    actor: "Property Manager",
    action: "Occupancy status changed to reserved",
    evidence: "Unit record · before/after snapshot",
  },
  {
    id: "audit",
    time: "09:49",
    title: "Audit event stored",
    actor: "System",
    action: "Operational event written to audit trail",
    evidence: "Event ledger reference",
  },
] as const;

type EventId = (typeof SAMPLE_EVENTS)[number]["id"];

/** Illustrative audit trace — sample data only, not live customer activity. */
export function EditorialTrustTracePreview() {
  const [active, setActive] = useState<EventId>("property");
  const selected = SAMPLE_EVENTS.find((event) => event.id === active) ?? SAMPLE_EVENTS[1];

  return (
    <div className="mk-ed-trust-trace" aria-label="Audit trace preview">
      <ol className="mk-ed-trust-trace__timeline">
        {SAMPLE_EVENTS.map((event) => (
          <li key={event.id}>
            <button
              type="button"
              className={`mk-ed-trust-trace__event${active === event.id ? " is-active" : ""}`}
              aria-pressed={active === event.id}
              onClick={() => setActive(event.id)}
            >
              <span className="mk-ed-trust-trace__time">{event.time}</span>
              <span>{event.title}</span>
            </button>
          </li>
        ))}
      </ol>
      <article className="mk-ed-trust-trace__detail" aria-live="polite">
        <h3 className="mk-ed-trust-trace__detail-title">{selected.title}</h3>
        <dl className="mk-ed-trust-trace__grid">
          <div>
            <dt>Actor</dt>
            <dd>{selected.actor}</dd>
          </div>
          <div>
            <dt>Action</dt>
            <dd>{selected.action}</dd>
          </div>
          <div className="mk-ed-trust-trace__wide">
            <dt>Evidence</dt>
            <dd>{selected.evidence}</dd>
          </div>
        </dl>
      </article>
    </div>
  );
}
