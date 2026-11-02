import { Suspense, useEffect, useState, type ComponentType } from "react";
import { useEditorialReveal } from "./useEditorialReveal";
import { useMarketingContent } from "./MarketingContentContext";

export function EditorialRolesSection() {
  const { extras } = useMarketingContent();
  const roles = extras.roles;
  const [active, setActive] = useState<string>(roles[0]?.id ?? "executive");
  const role = roles.find((item) => item.id === active) ?? roles[0]!;
  const ref = useEditorialReveal<HTMLElement>();
  return <section id="teams" ref={ref} className="mk-ed-section mk-ed-reveal" aria-labelledby="teams-heading"><div className="mk-ed-container">
    <p className="mk-ed-kicker">{extras.teams.kicker}</p><h2 id="teams-heading" className="mk-ed-heading">{extras.teams.title}</h2>
    <p className="mk-ed-lead">{extras.teams.lead}</p>
    <div className="mk-ed-roles__tabs" role="group" aria-label="Team roles">{roles.map((item) => <button key={item.id} type="button" aria-pressed={active === item.id} className={"mk-ed-roles__tab" + (active === item.id ? " is-active" : "")} onClick={() => setActive(item.id)}>{item.label}</button>)}</div>
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
    <section id="consumers" ref={ref} className="mk-ed-section mk-ed-section--surface mk-ed-reveal" aria-labelledby="consumers-heading">
      <div className="mk-ed-container">
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
  const { extras } = useMarketingContent();
  const ref = useEditorialReveal<HTMLElement>();
  return <section id="integrations" ref={ref} className="mk-ed-section mk-ed-reveal" aria-labelledby="integrations-heading"><div className="mk-ed-container">
    <p className="mk-ed-kicker">{extras.integrations.kicker}</p><h2 id="integrations-heading" className="mk-ed-heading">{extras.integrations.title}</h2><p className="mk-ed-lead">{extras.integrations.lead}</p>
    <ul className="mk-ed-integration-list">{extras.integrationItems.map((item) => <li key={item.name}><strong>{item.name}</strong><span className="mk-ed-badge mk-ed-badge--conditional">Setup required</span><p>{item.detail}</p></li>)}</ul>
  </div></section>;
}
