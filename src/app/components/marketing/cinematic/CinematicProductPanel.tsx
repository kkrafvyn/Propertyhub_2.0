type CinematicProductPanelProps = {
  title: string;
  sub: string;
  variant?: "listings" | "finance" | "maintenance" | "default";
};

/** Mini workspace-style panel for 3D Html overlays (dark theme). */
export function CinematicProductPanel({ title, sub, variant = "default" }: CinematicProductPanelProps) {
  return (
    <div className="mk-cinema-os-card" aria-hidden="true">
      <div className="mk-cinema-os-card__bar">
        <span className="mk-cinema-os-card__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="mk-cinema-os-card__title">{title}</span>
      </div>
      <div className="mk-cinema-os-card__body">
        <p className="mk-cinema-os-card__sub">{sub}</p>
        {variant === "listings" ? (
          <div className="mk-cinema-os-card__row">
            <span>Airport Hills · Unit 204</span>
            <em>Active</em>
          </div>
        ) : null}
        {variant === "finance" ? (
          <div className="mk-cinema-os-card__metrics">
            <div>
              <small>Collections</small>
              <strong>Ledger</strong>
            </div>
            <div>
              <small>Overdue</small>
              <strong>Aging</strong>
            </div>
          </div>
        ) : null}
        {variant === "maintenance" ? (
          <div className="mk-cinema-os-card__row">
            <span>Ticket #MT-2041</span>
            <em>Open</em>
          </div>
        ) : null}
      </div>
    </div>
  );
}
