import { useEffect, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { appUpdateService } from "../../../lib/app-update.service";
import { isElectron } from "../../../lib/surface-detection";
import { Button } from "../ui/Button";

export function AppUpdateBanner() {
  const [info, setInfo] = useState<Awaited<ReturnType<typeof appUpdateService.checkForUpdates>> | null>(
    null,
  );
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void appUpdateService.checkForUpdates().then((result) => {
      if (cancelled) return;
      setInfo(result);
      const shouldShow =
        result.update_available &&
        (result.force_update || !appUpdateService.wasDismissed(result.latest_version));
      setVisible(shouldShow);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible || !info) return null;

  const handleUpdate = () => {
    if (info.download_url) {
      window.open(info.download_url, "_blank", "noopener,noreferrer");
    } else {
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    appUpdateService.dismiss(info.latest_version);
    setVisible(false);
  };

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[100] mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border border-primary/30 bg-surface p-4 shadow-xl md:left-auto md:right-6"
      role="status"
      aria-live="polite"
    >
      <div className="rounded-xl bg-primary/10 p-2 text-primary">
        {isElectron() ? <Download className="h-5 w-5" /> : <RefreshCw className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">
          {info.force_update ? "Update required" : "A new version is available"}
        </p>
        <p className="text-sm text-ink-secondary">
          You are on v{info.current_version}. Latest is v{info.latest_version}.
          {info.changelog ? ` ${info.changelog}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" variant="gradient" onClick={handleUpdate}>
          {isElectron() ? "Download update" : "Refresh app"}
        </Button>
        {!info.force_update ? (
          <button
            type="button"
            className="rounded-lg p-2 text-ink-muted hover:bg-surface-hover hover:text-ink"
            aria-label="Dismiss update notice"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
