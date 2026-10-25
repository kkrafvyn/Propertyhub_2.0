import { Sparkles, type LucideIcon } from "lucide-react";
import { openBaytMiftahAIPanel } from "../lib/baytmiftah/ai-panel";

export type ConsumerTabItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
};

interface ConsumerTabBarProps {
  tabs: readonly ConsumerTabItem[];
  activeId: string;
  onTabPress: (tab: ConsumerTabItem) => void;
  className?: string;
  ariaLabel?: string;
}

export function ConsumerTabBar({
  tabs,
  activeId,
  onTabPress,
  className = "",
  ariaLabel = "Primary navigation",
}: ConsumerTabBarProps) {
  return (
    <nav className={`mobile-tab-bar ${className}`.trim()} aria-label={ariaLabel}>
      <div className="mobile-tab-bar-inner">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeId === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={`mobile-tab-button ${isActive ? "is-active" : ""}`}
              onClick={() => onTabPress(tab)}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
            >
              <span className="mobile-tab-icon-wrap" aria-hidden="true">
                {isActive && <span className="mobile-tab-active-pill" />}
                <Icon className="mobile-tab-icon" />
              </span>
              <span className="mobile-tab-label">{tab.label}</span>
            </button>
          );
        })}
        <button type="button" className="mobile-tab-button" onClick={openBaytMiftahAIPanel} aria-label="Open BaytMiftah AI">
          <span className="mobile-tab-icon-wrap" aria-hidden="true"><Sparkles className="mobile-tab-icon" /></span>
          <span className="mobile-tab-label">Assist</span>
        </button>
      </div>
    </nav>
  );
}
