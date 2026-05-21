import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  BellRing,
  Download,
  ExternalLink,
  Smartphone,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { PageLoadingState } from "../components/PageStates";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useMobileShell } from "../mobile/MobileShellContext";
import {
  publicDiscoveryService,
  type MobileExperienceSnapshot,
} from "../../lib/public-discovery.service";

function detectPreferredPlatform(): MobileExperienceSnapshot["platforms"][number]["platform"] | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  const userAgent = navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "ios";
  }

  if (/android/.test(userAgent)) {
    return "android";
  }

  return null;
}

export function GetTheApp() {
  const { isMobileShell } = useMobileShell();
  const [snapshot, setSnapshot] = useState<MobileExperienceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await publicDiscoveryService.getMobileExperienceSnapshot();
        setSnapshot(data);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const preferredPlatform = detectPreferredPlatform();
  const preferredRelease = snapshot?.platforms.find((platform) => platform.platform === preferredPlatform) || null;

  const handleOpenExternal = (url: string) => {
    if (typeof window === "undefined") {
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background">
      {!isMobileShell && <Navbar />}

      <div className={isMobileShell ? "pt-4 pb-32 px-4" : "pt-24 pb-16 px-4"}>
        <div className="max-w-6xl mx-auto">
          <section className="rounded-[2rem] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,1),rgba(246,244,238,1))] p-8 md:p-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <Smartphone className="w-3.5 h-3.5" />
              Get The App
            </div>
            <h1 className="mt-5 text-4xl md:text-5xl font-semibold tracking-tight">
              Keep search, offers, and follow-up moving even when you are nowhere near your laptop.
            </h1>
            <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
              Install the public mobile releases for faster alerts, field coordination, and buyer-side momentum from the same account you use on the web.
            </p>
            {preferredRelease && (
              <p className="mt-4 text-sm font-medium text-primary">
                Recommended for this device: {preferredRelease.label} {preferredRelease.latestVersion}
              </p>
            )}
          </section>

          {loading || !snapshot ? (
            <div className="mt-10">
              <PageLoadingState label="Loading mobile release channels..." />
            </div>
          ) : (
            <>
              <section className="mt-10">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-primary/80 font-semibold">
                      Public Release Channels
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold">Download the latest live builds</h2>
                    <p className="mt-3 text-muted-foreground">{snapshot.releaseHeadline}</p>
                  </div>
                  <span className="rounded-full border border-primary/15 bg-primary/5 px-4 py-2 text-sm text-primary">
                    {snapshot.browserPushLabel}
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {snapshot.platforms.map((platform) => (
                    <Card
                      key={platform.platform}
                      className={`p-6 ${
                        platform.platform === preferredPlatform
                          ? "border-primary/30 shadow-[0_20px_60px_rgba(15,23,42,0.08)]"
                          : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">{platform.label}</p>
                          <h3 className="mt-1 text-2xl font-semibold capitalize">{platform.platform}</h3>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {platform.platform === preferredPlatform && (
                            <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                              Best match for this device
                            </span>
                          )}
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <Download className="w-5 h-5" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Latest</p>
                          <p className="mt-2 font-semibold">{platform.latestVersion}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Minimum</p>
                          <p className="mt-2 font-semibold">{platform.minimumVersion}</p>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button
                          type="button"
                          variant={platform.platform === preferredPlatform ? "default" : "outline"}
                          onClick={() => handleOpenExternal(platform.updateUrl)}
                        >
                          <ExternalLink className="w-4 h-4" />
                          Download {platform.platform === "ios" ? "for iOS" : "for Android"}
                        </Button>
                        {platform.forceUpdate && (
                          <span className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-700">
                            Force update enabled
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>

              <section className="mt-14 grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-6">
                <Card className="p-6">
                  <p className="text-sm uppercase tracking-[0.2em] text-primary/80 font-semibold">
                    Why It Matters
                  </p>
                  <div className="mt-5 space-y-4">
                    {snapshot.highlights.map((item) => (
                      <div key={item} className="rounded-2xl border border-border bg-secondary/30 p-4">
                        <p className="text-foreground/90">{item}</p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6 bg-foreground text-white">
                  <p className="text-sm uppercase tracking-[0.2em] text-white/70 font-semibold">
                    Best Mobile Moments
                  </p>
                  <div className="mt-5 space-y-4">
                    {snapshot.fieldMoments.map((item) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-white/85">{item}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link to="/search">
                      <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
                        Browse Listings
                      </Button>
                    </Link>
                    <Link to="/signup">
                      <Button className="bg-white text-foreground hover:bg-white/90">
                        <BellRing className="w-4 h-4" />
                        Create Account
                      </Button>
                    </Link>
                  </div>
                </Card>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
