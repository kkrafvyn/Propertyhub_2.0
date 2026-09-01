import { Home } from "./Home";
import { MarketingHome } from "./marketing/MarketingHome";
import { isMarketingSite } from "../../lib/site-mode";

/**
 * Serves the public marketing homepage on baytmiftah.com
 * and the marketplace home on app.baytmiftah.com.
 */
export function ConsumerIndex() {
  return isMarketingSite() ? <MarketingHome /> : <Home />;
}
