import { useEffect, useState } from "react";
import { Box, ExternalLink, Maximize2, RotateCcw } from "lucide-react";
import { normalizeMatterportTourUrl } from "../../../lib/virtual-tour";

export function Property3DTour({ tourUrl, propertyName }: {
  tourUrl?: string | null;
  propertyName: string;
}) {
  const safeUrl = normalizeMatterportTourUrl(tourUrl);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setLoaded(false); }, [safeUrl]);
  if (!safeUrl) return null;

  return (
    <section id="property-3d-tour" aria-label="Interactive property 3D tour"
      className="scroll-mt-24 rounded-3xl border border-surface-border bg-surface p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-ink">Explore in 3D</h2>
          </div>
          <p className="mt-1 text-sm text-ink-secondary">Walk through the provider's interactive scan at your own pace.</p>
        </div>
        <a className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-surface-border px-4 text-sm font-semibold text-primary hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-primary"
          href={safeUrl} target="_blank" rel="noopener noreferrer">
          Open full tour <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
      {loaded ? (
        <div className="relative">
          <iframe
            title={`Interactive 3D tour of ${propertyName}`}
            src={safeUrl}
            loading="lazy"
            allow="fullscreen; xr-spatial-tracking; accelerometer; gyroscope"
            sandbox="allow-scripts allow-same-origin allow-presentation allow-pointer-lock"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-[4/5] w-full rounded-2xl border border-surface-border bg-surface-subtle sm:aspect-video"
          />
          <button type="button" onClick={() => setLoaded(false)}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-surface-border px-3 text-sm text-ink-secondary hover:bg-surface-hover">
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Stop tour
          </button>
        </div>
      ) : (
        <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-2xl bg-surface-subtle p-6 text-center sm:aspect-[16/7]">
          <Box className="h-10 w-10 text-primary" aria-hidden="true" />
          <p className="max-w-sm text-sm text-ink-secondary">Loading the tour shares your connection with Matterport. The scan opens only when you choose to view it.</p>
          <button type="button" onClick={() => setLoaded(true)}
            className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <Maximize2 className="h-4 w-4" aria-hidden="true" /> Start 3D tour
          </button>
        </div>
      )}
      <p className="mt-3 text-xs text-ink-muted">Provided by the property advertiser via Matterport. Visual representations may differ from the property's current condition.</p>
    </section>
  );
}
