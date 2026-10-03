type CinematicProductPanelProps = {
  title: string;
  sub: string;
  variant?: "listings" | "leads" | "payments" | "maintenance" | "default";
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
            <span>East Legon · 3-bed</span>
            <em>Published</em>
          </div>
        ) : null}
        {variant === "leads" ? (
          <div className="mk-cinema-os-card__row">
            <span>Viewing · Unit 204</span>
            <em>Tour</em>
          </div>
        ) : null}
        {variant === "payments" ? (
          <div className="mk-cinema-os-card__metrics">
            <div>
              <small>Rent due</small>
              <strong>5 days</strong>
            </div>
            <div>
              <small>MoMo match</small>
              <strong>Receipt</strong>
            </div>
          </div>
        ) : null}
        {variant === "maintenance" ? (
          <div className="mk-cinema-os-card__row">
            <span>Plumbing · 12B</span>
            <em>Assigned</em>
          </div>
        ) : null}
      </div>
    </div>
  );
}
