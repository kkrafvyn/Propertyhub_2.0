import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { NotFound } from "./pages/NotFound";
import { consumerRoutes } from "./routes/consumer.routes";
import { businessRoutes } from "./routes/business.routes";
import { adminRoutes } from "./routes/admin.routes";

/**
 * BaytMiftah REOS Master Router
 * ──────────────────────────────
 * Composes the active route trees for the final two-product model:
 *   1. Consumer (Web + Mobile)
 *   2. Business Platform (Web + Desktop + Mobile)
 *
 * Internal admin workflows remain under the Business Platform for role-aware
 * access and compatibility. A separate Admin Mobile product is not part of the
 * final architecture.
 *
 * All wrapped with the master Root shell and SurfaceProvider.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      ...consumerRoutes,
      ...businessRoutes,
      ...adminRoutes,
      { path: "*", Component: NotFound },
    ],
  },
]);
