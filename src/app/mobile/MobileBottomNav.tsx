import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../i18n/LocaleContext";
import { ConsumerTabBar } from "./ConsumerTabBar";
import { buildConsumerTabItems, resolveConsumerTabId } from "./consumer-bottom-tabs";
import "./mobile.css";

type BottomNavVariant = "phone" | "tablet";

export function MobileBottomNav({ variant = "phone" }: { variant?: BottomNavVariant }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const tabs = buildConsumerTabItems(t, user);
  const activeId = resolveConsumerTabId(location.pathname);

  return (
    <ConsumerTabBar
      tabs={tabs}
      activeId={activeId}
      onTabPress={(tab) => navigate(tab.href, tab.href === "/login" ? { state: { from: location.pathname } } : undefined)}
      className={variant === "tablet" ? "tablet-tab-bar" : ""}
      ariaLabel={variant === "tablet" ? t("mobile.tabletNav") : t("mobile.primaryNav")}
    />
  );
}

export { resolveConsumerTabId as resolveConsumerTabId };
