import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PageMeta } from "../../components/baytmiftah/PageMeta";
import { MarketingSubpage } from "../../components/marketing/MarketingSubpage";
import { LEGAL_CONTACT } from "../../../lib/legal-config";

type CheckState = "checking" | "operational" | "degraded" | "unavailable" | "unconfigured";

function statusLabel(state: CheckState): string {
  switch (state) {
    case "checking":
      return "Checking…";
    case "operational":
      return "Operational";
    case "degraded":
      return "Degraded";
    case "unavailable":
      return "Unavailable";
    default:
      return "Not configured";
  }
}

function statusClass(state: CheckState): string {
  if (state === "operational") return "mk-status-pill mk-status-pill--ok";
  if (state === "checking") return "mk-status-pill mk-status-pill--pending";
  return "mk-status-pill mk-status-pill--warn";
}

export function PublicStatusPage() {
  const [apiState, setApiState] = useState<CheckState>("checking");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL?.trim();
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

    if (!url || !key) {
      setApiState("unconfigured");
      return undefined;
    }

    let cancelled = false;

    void fetch(`${url.replace(/\/$/, "")}/rest/v1/`, {
      method: "HEAD",
      headers: { apikey: key },
    })
      .then((response) => {
        if (cancelled) return;
        setApiState(response.ok ? "operational" : "degraded");
        setCheckedAt(new Date().toISOString());
      })
      .catch(() => {
        if (cancelled) return;
        setApiState("unavailable");
        setCheckedAt(new Date().toISOString());
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const checkedLabel = checkedAt
    ? new Date(checkedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <MarketingSubpage>
      <PageMeta
        title="BaytMiftah Status"
        description="Operational status for BaytMiftah web and API services."
        canonicalPath="/status"
      />
      <p className="mk-eyebrow">Platform status</p>
      <h1 className="mk-section-title">Service status</h1>
      <p className="mk-section-copy">
        Live connectivity checks for public BaytMiftah services. For account-specific issues, contact
        support.
      </p>

      <div className="mk-status-panel">
        <div className="mk-status-row">
          <span>Marketing &amp; web application</span>
          <span className="mk-status-pill mk-status-pill--ok">Operational</span>
        </div>
        <div className="mk-status-row">
          <span>API &amp; database</span>
          <span className={statusClass(apiState)}>{statusLabel(apiState)}</span>
        </div>
      </div>

      {checkedLabel ? (
        <p className="mk-status-meta">API check last run: {checkedLabel}</p>
      ) : null}

      <p className="mk-section-copy" style={{ marginTop: "1.5rem" }}>
        Experiencing an issue? Email{" "}
        <a href={`mailto:${LEGAL_CONTACT.support}`} className="mk-inline-link">
          {LEGAL_CONTACT.support}
        </a>
        .
      </p>

      <Link to="/help" className="mk-btn mk-btn-secondary" style={{ marginTop: "1.25rem" }}>
        Help Centre
      </Link>
    </MarketingSubpage>
  );
}
