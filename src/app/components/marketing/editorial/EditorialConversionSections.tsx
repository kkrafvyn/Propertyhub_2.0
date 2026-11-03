import { Link } from 'react-router';
import { useMarketingContent } from './MarketingContentContext';
import { useEditorialReveal } from './useEditorialReveal';
import { trackMarketingEvent } from './marketing-editorial-analytics';
import { appPath } from '../../../../lib/marketing-urls';

function StoreButton({ href, label, store }: { href: string; label: string; store: string }) {
  if (!href.trim()) return null;
  return (
    <a
      href={href}
      className="mk-ed-btn mk-ed-btn--secondary"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackMarketingEvent('marketing_store_click', { store, label })}
    >
      {label}
    </a>
  );
}

export function EditorialStoreStripSection() {
  const { extras } = useMarketingContent();
  const { storeLinks } = extras;
  const ref = useEditorialReveal<HTMLElement>();
  if (!storeLinks.showStrip) return null;

  const hasStoreUrl = [storeLinks.consumerPlayUrl, storeLinks.consumerAppleUrl, storeLinks.workspacePlayUrl, storeLinks.workspaceAppleUrl]
    .some((url) => url.trim().length > 0);

  return (
    <section id="apps" ref={ref} className="mk-ed-section mk-ed-section--muted mk-ed-reveal" aria-labelledby="apps-heading">
      <div className="mk-ed-container mk-ed-callout">
        <p className="mk-ed-kicker">Mobile apps</p>
        <h2 id="apps-heading" className="mk-ed-heading">{storeLinks.headline}</h2>
        <p className="mk-ed-lead">{storeLinks.lead}</p>
        <div className="mk-ed-inline-actions mk-ed-store-actions">
          <StoreButton href={storeLinks.consumerPlayUrl} label="Consumer on Google Play" store="consumer_play" />
          <StoreButton href={storeLinks.consumerAppleUrl} label="Consumer on App Store" store="consumer_apple" />
          <StoreButton href={storeLinks.workspacePlayUrl} label="Workspace on Google Play" store="workspace_play" />
          <StoreButton href={storeLinks.workspaceAppleUrl} label="Workspace on App Store" store="workspace_apple" />
          {!hasStoreUrl ? (
            <Link
              to={storeLinks.fallbackHref}
              className="mk-ed-btn mk-ed-btn--primary"
              onClick={() => trackMarketingEvent('marketing_cta_click', { placement: 'store_fallback' })}
            >
              {storeLinks.fallbackLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function EditorialAppPreviewSection() {
  const { extras } = useMarketingContent();
  const { appPreviews } = extras;
  const ref = useEditorialReveal<HTMLElement>();
  if (!appPreviews.showConsumer && !appPreviews.showWorkspace) return null;

  return (
    <section id="app-previews" ref={ref} className="mk-ed-section mk-ed-reveal" aria-labelledby="app-previews-heading">
      <div className="mk-ed-container">
        <p className="mk-ed-kicker">In-app experience</p>
        <h2 id="app-previews-heading" className="mk-ed-heading">See the product in motion</h2>
        <p className="mk-ed-lead">Screen recordings from the consumer and workspace apps using demo portfolio data.</p>
        <div className="mk-ed-app-preview-grid">
          {appPreviews.showConsumer ? (
            <figure className="mk-ed-app-preview">
              <video
                muted
                playsInline
                loop
                autoPlay
                preload="metadata"
                poster={appPreviews.consumerPosterSrc}
                aria-label="BaytMiftah consumer app preview"
                onPlay={() => trackMarketingEvent('marketing_app_preview_play', { variant: 'consumer' })}
              >
                <source src={appPreviews.consumerVideoSrc} type="video/mp4" />
              </video>
              <figcaption>Consumer — discovery and journeys</figcaption>
            </figure>
          ) : null}
          {appPreviews.showWorkspace ? (
            <figure className="mk-ed-app-preview">
              <video
                muted
                playsInline
                loop
                autoPlay
                preload="metadata"
                poster={appPreviews.workspacePosterSrc}
                aria-label="BaytMiftah workspace app preview"
                onPlay={() => trackMarketingEvent('marketing_app_preview_play', { variant: 'workspace' })}
              >
                <source src={appPreviews.workspaceVideoSrc} type="video/mp4" />
              </video>
              <figcaption>Workspace — listings, leads, and operations</figcaption>
            </figure>
          ) : null}
        </div>
        <p className="mk-ed-note mt-4">
          <a href={appPath('/search')} className="mk-ed-link" onClick={() => trackMarketingEvent('marketing_cta_click', { placement: 'preview_explore' })}>
            Explore live properties on the web app
          </a>
        </p>
      </div>
    </section>
  );
}
