import type { ReactNode } from "react";

/** Glass content panel for marketing subpages (about, legal, explorer, etc.). */
export function MarketingSubpage({ children }: { children: ReactNode }) {
  return (
    <div className="mk-subpage">
      <div className="mk-container mk-subpage-inner">
        <div className="mk-subpage-panel">{children}</div>
      </div>
    </div>
  );
}
