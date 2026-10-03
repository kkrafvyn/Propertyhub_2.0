/** Large workspace-style compositions for 3D Html + DOM marketing. */

export type ProductPresentationVariant =
  | "dashboard"
  | "leasing"
  | "finance"
  | "maintenance"
  | "portfolio";

type ProductPresentationProps = {
  variant: ProductPresentationVariant;
  stage?: number;
  compact?: boolean;
};

export function ProductPresentation({ variant, stage = 0, compact }: ProductPresentationProps) {
  return (
    <div
      className={`mk-product-stage${compact ? " mk-product-stage--compact" : ""}`}
      aria-hidden="true"
    >
      <div className="mk-product-stage__chrome">
        <div className="mk-product-stage__sidebar">
          <span className="is-active">Overview</span>
          <span>Properties</span>
          <span>Leasing</span>
          <span>Finance</span>
          <span>Maintenance</span>
        </div>
        <div className="mk-product-stage__main">
          {variant === "dashboard" ? <DashboardView /> : null}
          {variant === "portfolio" ? <PortfolioView /> : null}
          {variant === "leasing" ? <LeasingView stage={stage} /> : null}
          {variant === "finance" ? <FinanceView /> : null}
          {variant === "maintenance" ? <MaintenanceView stage={stage} /> : null}
        </div>
      </div>
    </div>
  );
}

function DashboardView() {
  return (
    <>
      <header className="mk-product-stage__head">
        <h3>Operations overview</h3>
        <span className="mk-product-stage__meta">East Legon Residences</span>
      </header>
      <div className="mk-product-stage__metrics">
        <div>
          <small>Occupancy</small>
          <strong>94%</strong>
        </div>
        <div>
          <small>Rent due (7d)</small>
          <strong>12</strong>
        </div>
        <div>
          <small>Open maintenance</small>
          <strong>5</strong>
        </div>
        <div>
          <small>Active leases</small>
          <strong>41</strong>
        </div>
      </div>
      <table className="mk-product-stage__table">
        <thead>
          <tr>
            <th>Unit</th>
            <th>Status</th>
            <th>Next action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>204</td>
            <td>
              <span className="mk-status mk-status--ok">Occupied</span>
            </td>
            <td>Renewal review</td>
          </tr>
          <tr>
            <td>12B</td>
            <td>
              <span className="mk-status mk-status--warn">Maintenance</span>
            </td>
            <td>Contractor assigned</td>
          </tr>
          <tr>
            <td>301</td>
            <td>
              <span className="mk-status mk-status--neutral">Vacant</span>
            </td>
            <td>Listing draft</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function PortfolioView() {
  return (
    <>
      <header className="mk-product-stage__head">
        <h3>Portfolio</h3>
        <span className="mk-product-stage__meta">6 properties · 48 units</span>
      </header>
      <div className="mk-product-stage__metrics">
        <div>
          <small>Occupancy</small>
          <strong>91%</strong>
        </div>
        <div>
          <small>Collections</small>
          <strong>GHS 284k</strong>
        </div>
        <div>
          <small>Overdue</small>
          <strong>3</strong>
        </div>
        <div>
          <small>Work orders</small>
          <strong>8</strong>
        </div>
      </div>
    </>
  );
}

const LEASING_STAGES = [
  { title: "Enquiry", detail: "Viewing · Unit 204" },
  { title: "Application", detail: "KYC documents uploaded" },
  { title: "Verification", detail: "References in review" },
  { title: "Lease", detail: "Draft generated" },
  { title: "Signature", detail: "Awaiting e-sign" },
  { title: "Move-in", detail: "Handover scheduled" },
];

function LeasingView({ stage }: { stage: number }) {
  const idx = Math.min(LEASING_STAGES.length - 1, Math.max(0, stage));
  const current = LEASING_STAGES[idx];
  return (
    <>
      <header className="mk-product-stage__head">
        <h3>Leasing pipeline</h3>
        <span className="mk-product-stage__meta">Unit 204 · East Legon</span>
      </header>
      <div className="mk-product-stage__pipeline">
        {LEASING_STAGES.map((s, i) => (
          <div key={s.title} className={i === idx ? "is-active" : i < idx ? "is-done" : ""}>
            <strong>{s.title}</strong>
            {i === idx ? <span>{s.detail}</span> : null}
          </div>
        ))}
      </div>
      <p className="mk-product-stage__focus">{current.detail}</p>
    </>
  );
}

function FinanceView() {
  return (
    <>
      <header className="mk-product-stage__head">
        <h3>Finance</h3>
        <span className="mk-product-stage__meta">March cycle</span>
      </header>
      <div className="mk-product-stage__finance-grid">
        <div>
          <small>Collected</small>
          <strong className="mk-product-num">GHS 412,800</strong>
        </div>
        <div>
          <small>Outstanding</small>
          <strong className="mk-product-num">GHS 38,200</strong>
        </div>
        <div>
          <small>Owner payouts</small>
          <strong className="mk-product-num">GHS 298,400</strong>
        </div>
      </div>
      <table className="mk-product-stage__table">
        <thead>
          <tr>
            <th>Transaction</th>
            <th>Match</th>
            <th>Statement</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>MoMo · Unit 204</td>
            <td>Matched</td>
            <td>Owner stmt #118</td>
          </tr>
          <tr>
            <td>Bank · Unit 12B</td>
            <td>Pending</td>
            <td>—</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

const MAINT_STAGES = ["Reported", "Triage", "Assigned", "In progress", "Inspection", "Complete"];

function MaintenanceView({ stage }: { stage: number }) {
  const idx = Math.min(MAINT_STAGES.length - 1, Math.max(0, stage));
  return (
    <>
      <header className="mk-product-stage__head">
        <h3>Work order · 12B</h3>
        <span className="mk-product-stage__meta">Plumbing · East Legon</span>
      </header>
      <div className="mk-product-stage__maint-track">
        {MAINT_STAGES.map((s, i) => (
          <span key={s} className={i === idx ? "is-active" : i < idx ? "is-done" : ""}>
            {s}
          </span>
        ))}
      </div>
      <p className="mk-product-stage__focus">Resident report → contractor dispatch → inspection sign-off</p>
    </>
  );
}
