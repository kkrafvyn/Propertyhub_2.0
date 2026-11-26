import { useMarketingContent } from "./MarketingContentContext";
import { useEditorialReveal } from "./useEditorialReveal";
import { ArrowUpRight } from "lucide-react";
import { appPath } from "../../../../lib/marketing-urls";
import { trackMarketingEvent } from "./marketing-editorial-analytics";

export function EditorialPlatformSection() {
  const { extras } = useMarketingContent();
  const { platform } = extras;
  const ref = useEditorialReveal<HTMLElement>();

  return (
    <section id="platform" ref={ref} className="mk-ed-section mk-ed-section--surface mk-ed-reveal" aria-labelledby="platform-heading">
      <div className="mk-ed-container">
        <p className="mk-ed-kicker">{platform.kicker}</p>
        <h2 id="platform-heading" className="mk-ed-heading">
          {platform.title}
        </h2>
        <p className="mk-ed-lead">{platform.lead}</p>
        <div className="mk-ed-audiences">
          <a href={appPath("/search")} className="mk-ed-audience" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "audience_explore" })}>
            <img src="/marketing/hero/interior-1280.webp" width="1280" height="800" alt="A light-filled apartment interior" loading="lazy" />
            <div><span className="mk-ed-kicker">For your next move</span><h3>Find a place.<br />Make it yours.</h3><p>Homes, land, commercial spaces, and stays. Explore the possibilities in one place.</p><span className="mk-ed-audience__link">Explore properties <ArrowUpRight size={19} aria-hidden="true" /></span></div>
          </a>
          <a href={appPath("/signup")} className="mk-ed-audience mk-ed-audience--business" onClick={() => trackMarketingEvent("marketing_cta_click", { placement: "audience_workspace" })}>
            <img src="/marketing/hero/community-1280.webp" width="1280" height="800" alt="Contemporary homes in a residential community" loading="lazy" />
            <div><span className="mk-ed-kicker">For landlords & property teams</span><h3>Less chasing.<br />More clarity.</h3><p>Keep listings, leads, leases, collections, and maintenance moving with your team.</p><span className="mk-ed-audience__link">Create your workspace <ArrowUpRight size={19} aria-hidden="true" /></span></div>
          </a>
        </div>
        <details className="mk-ed-platform-details"><summary>Explore the full platform</summary><ul className="mk-ed-surfaces">
          {platform.surfaces.map((surface) => (
            <li key={surface.label} className="mk-ed-surfaces__card" data-group={surface.group}>
              <p className="mk-ed-surfaces__group">{surface.group}</p>
              <h3>{surface.label}</h3>
              <p>{surface.detail}</p>
            </li>
          ))}
        </ul></details>
      </div>
    </section>
  );
}
