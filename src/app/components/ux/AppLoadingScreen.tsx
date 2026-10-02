import { Loader2 } from "lucide-react";

type AppLoadingScreenProps = {
  label?: string;
};

export function AppLoadingScreen({ label = "Loading…" }: AppLoadingScreenProps) {
  return (
    <div className="desktop-shell flex min-h-[100dvh] items-center justify-center px-4 text-ink" role="status" aria-live="polite" aria-busy="true">
      <div className="desktop-shell-ambient" aria-hidden />
      <div className="relative z-[1] flex flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-surface-border bg-surface/90 shadow-xs">
          <Loader2 className="h-6 w-6 animate-spin text-brand-forest" aria-hidden />
        </div>
        <p className="text-sm font-medium text-ink-secondary">{label}</p>
      </div>
    </div>
  );
}
