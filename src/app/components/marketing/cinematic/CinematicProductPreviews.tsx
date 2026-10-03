/** Static / Html product mockups — illustrative preview data only. */

export type ProductPreviewKind =
  | "listings"
  | "leads"
  | "payments"
  | "maintenance"
  | "portfolio"
  | "resident";

const PREVIEW_NOTE = "Illustrative preview — not live customer data.";

export function CinematicProductPreviews({
  kinds,
  layout = "grid",
}: {
  kinds: ProductPreviewKind[];
  layout?: "grid" | "stack";
}) {
  return (
    <div
      className={`mk-cinema-product-previews mk-cinema-product-previews--${layout}`}
      aria-label="Product previews"
    >
      <p className="mk-cinema-preview-note">{PREVIEW_NOTE}</p>
      {kinds.map((kind) => (
        <ProductPreviewCard key={kind} kind={kind} />
      ))}
    </div>
  );
}

function ProductPreviewCard({ kind }: { kind: ProductPreviewKind }) {
  switch (kind) {
    case "listings":
      return (
        <article className="mk-cinema-preview-card">
          <header>
            <span className="mk-cinema-preview-card__tag">Listings</span>
            <strong>Publication status</strong>
          </header>
          <ul>
            <li>
              <span>East Legon · 3-bed flat</span>
              <em>Published</em>
            </li>
            <li>
              <span>Airport Hills · Unit 204</span>
              <em>Draft</em>
            </li>
          </ul>
        </article>
      );
    case "leads":
      return (
        <article className="mk-cinema-preview-card">
          <header>
            <span className="mk-cinema-preview-card__tag">Leads</span>
            <strong>Leasing pipeline</strong>
          </header>
          <ul>
            <li>
              <span>Viewing scheduled</span>
              <em>Stage: Tour</em>
            </li>
            <li>
              <span>Application received</span>
              <em>Stage: Review</em>
            </li>
          </ul>
        </article>
      );
    case "payments":
      return (
        <article className="mk-cinema-preview-card">
          <header>
            <span className="mk-cinema-preview-card__tag">Payments</span>
            <strong>Collections</strong>
          </header>
          <ul>
            <li>
              <span>Rent · Unit 204</span>
              <em>Due in 5 days</em>
            </li>
            <li>
              <span>MoMo receipt #4821</span>
              <em>Matched</em>
            </li>
          </ul>
        </article>
      );
    case "maintenance":
      return (
        <article className="mk-cinema-preview-card">
          <header>
            <span className="mk-cinema-preview-card__tag">Maintenance</span>
            <strong>Work order</strong>
          </header>
          <ul>
            <li>
              <span>Plumbing · Unit 12B</span>
              <em>Assigned</em>
            </li>
            <li>
              <span>Technician en route</span>
              <em>In progress</em>
            </li>
          </ul>
        </article>
      );
    case "portfolio":
      return (
        <article className="mk-cinema-preview-card mk-cinema-preview-card--wide">
          <header>
            <span className="mk-cinema-preview-card__tag">Portfolio</span>
            <strong>Operations overview</strong>
          </header>
          <div className="mk-cinema-preview-metrics">
            <div>
              <small>Units tracked</small>
              <strong>48</strong>
            </div>
            <div>
              <small>Open tickets</small>
              <strong>6</strong>
            </div>
            <div>
              <small>Leases renewing</small>
              <strong>4</strong>
            </div>
            <div>
              <small>Collections queue</small>
              <strong>12</strong>
            </div>
          </div>
        </article>
      );
    case "resident":
      return (
        <article className="mk-cinema-preview-card">
          <header>
            <span className="mk-cinema-preview-card__tag">Resident</span>
            <strong>Self-service</strong>
          </header>
          <ol className="mk-cinema-preview-steps">
            <li className="is-done">Search & apply</li>
            <li className="is-done">Sign lease</li>
            <li className="is-active">Pay rent</li>
            <li>Request support</li>
          </ol>
        </article>
      );
    default:
      return null;
  }
}
