import { lazy, Suspense } from "react";
import { Home } from "./Home";
import { isMarketingSite } from "../../lib/site-mode";

const MarketingHome = lazy(() => import("./marketing/MarketingHome").then((module) => ({ default: module.MarketingHome })));

/**
 * Serves the public marketing homepage on baytmiftah.com
 * and the marketplace home on app.baytmiftah.com.
 */
export function ConsumerIndex() {
  return isMarketingSite() ? <Suspense fallback={null}><MarketingHome /></Suspense> : <Home />;
}
