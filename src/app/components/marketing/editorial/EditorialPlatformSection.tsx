import { useMarketingContent } from "./MarketingContentContext";
import { useEditorialReveal } from "./useEditorialReveal";

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
        <ul className="mk-ed-surfaces">
          {platform.surfaces.map((surface) => (
            <li key={surface.label} className="mk-ed-surfaces__card" data-group={surface.group}>
              <p className="mk-ed-surfaces__group">{surface.group}</p>
              <h3>{surface.label}</h3>
              <p>{surface.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
