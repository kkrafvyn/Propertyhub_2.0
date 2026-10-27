import { useCallback, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  SAMPLE_MAINTENANCE,
  SAMPLE_PAYMENTS,
  SAMPLE_PORTFOLIO,
  SAMPLE_PROPERTY,
} from "./marketing-editorial-data";
import { trackMarketingEvent } from "./marketing-editorial-analytics";
import { useEditorialReveal } from "./useEditorialReveal";
import { useMarketingContent } from "./MarketingContentContext";

type TourStep = "portfolio" | "property" | "payments" | "maintenance";

const STEPS: { id: TourStep; label: string }[] = [
  { id: "portfolio", label: "Portfolio" },
  { id: "property", label: "Property" },
  { id: "payments", label: "Payments" },
  { id: "maintenance", label: "Maintenance" },
];

export function EditorialProductTour() {
  const { intros } = useMarketingContent();
  const ref = useEditorialReveal<HTMLElement>();
  const [step, setStep] = useState<TourStep>("portfolio");
  const [started, setStarted] = useState(false);

  const go = useCallback((next: TourStep) => {
    setStep(next);
    if (!started) {
      setStarted(true);
      trackMarketingEvent("marketing_tour_start");
    }
    trackMarketingEvent("marketing_tour_step", { step: next });
  }, [started]);

  const reset = () => {
    setStep("portfolio");
    setStarted(false);
    trackMarketingEvent("marketing_tour_reset");
  };

  return (
    <section id="product-tour" ref={ref} className="mk-ed-section mk-ed-section--surface mk-ed-reveal" aria-labelledby="product-tour-heading">
      <div className="mk-ed-container">
        <p className="mk-ed-kicker">{intros.productTour.kicker}</p>
        <h2 id="product-tour-heading" className="mk-ed-heading">
          {intros.productTour.title}
        </h2>
        <p className="mk-ed-lead">
          {intros.productTour.lead}
        </p>

        <div className="mk-ed-tour" role="region" aria-label="Product tour">
          <div className="mk-ed-tour__tabs" role="tablist" aria-label="Tour steps">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                id={`tour-tab-${s.id}`}
                aria-selected={step === s.id}
                aria-controls={`tour-panel-${s.id}`}
                className={`mk-ed-tour__tab${step === s.id ? " is-active" : ""}`}
                onClick={() => go(s.id)}
              >
                {s.label}
              </button>
            ))}
            <button type="button" className="mk-ed-tour__reset" onClick={reset}>
              <RotateCcw size={16} aria-hidden="true" /> Reset
            </button>
          </div>

          <div className="mk-ed-tour__panel">
            <div
              key={step}
              className="mk-ed-tour__panel-inner"
              role="tabpanel"
              id={`tour-panel-${step}`}
              aria-labelledby={`tour-tab-${step}`}
            >
              {step === "portfolio" ? (
                <>
                  <p className="mk-ed-note">{SAMPLE_PORTFOLIO.name}</p>
                  <ul className="mk-ed-list">
                    {SAMPLE_PORTFOLIO.properties.map((p) => (
                      <li key={p.id}>
                        <button type="button" className="mk-ed-list__btn" onClick={() => go("property")}>
                          <strong>{p.name}</strong>
                          <span>
                            {p.units} units · {p.occupancy}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {step === "property" ? (
                <>
                  <h3 className="mk-ed-panel-title">{SAMPLE_PROPERTY.title}</h3>
                  <dl className="mk-ed-dl">
                    <div>
                      <dt>Unit</dt>
                      <dd>{SAMPLE_PROPERTY.unit}</dd>
                    </div>
                    <div>
                      <dt>Listing</dt>
                      <dd>{SAMPLE_PROPERTY.listingStatus}</dd>
                    </div>
                    <div>
                      <dt>Lease</dt>
                      <dd>{SAMPLE_PROPERTY.leaseStatus}</dd>
                    </div>
                  </dl>
                  <div className="mk-ed-inline-actions">
                    <button type="button" className="mk-ed-btn mk-ed-btn--secondary" onClick={() => go("payments")}>
                      View payments
                    </button>
                    <button type="button" className="mk-ed-btn mk-ed-btn--secondary" onClick={() => go("maintenance")}>
                      View maintenance
                    </button>
                  </div>
                </>
              ) : null}

              {step === "payments" ? (
                <>
                  <h3 className="mk-ed-panel-title">Collections · illustrative</h3>
                  <ul className="mk-ed-bullets">
                    <li>{SAMPLE_PAYMENTS.rentDue}</li>
                    <li>{SAMPLE_PAYMENTS.lastReceipt}</li>
                    <li>{SAMPLE_PAYMENTS.openCases}</li>
                  </ul>
                </>
              ) : null}

              {step === "maintenance" ? (
                <>
                  <h3 className="mk-ed-panel-title">
                    {SAMPLE_MAINTENANCE.ticket} · {SAMPLE_MAINTENANCE.title}
                  </h3>
                  <p className="mk-ed-status">Status: {SAMPLE_MAINTENANCE.status}</p>
                  <ol className="mk-ed-stages">
                    {SAMPLE_MAINTENANCE.stages.map((label, i) => (
                      <li key={label} className={i <= SAMPLE_MAINTENANCE.activeStage ? "is-done" : ""}>
                        {label}
                      </li>
                    ))}
                  </ol>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <noscript>
          <div className="mk-ed-tour__noscript">
            <p>{SAMPLE_PORTFOLIO.name}</p>
            <ul>
              {SAMPLE_PORTFOLIO.properties.map((p) => (
                <li key={p.id}>
                  {p.name} — {p.units} units
                </li>
              ))}
            </ul>
            <p>
              Payments: {SAMPLE_PAYMENTS.rentDue}. Maintenance: {SAMPLE_MAINTENANCE.title} ({SAMPLE_MAINTENANCE.status}).
            </p>
          </div>
        </noscript>
      </div>
    </section>
  );
}
