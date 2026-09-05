import { createBrowserRouter, createHashRouter, type RouteObject } from "react-router";
import { Root } from "./components/Root";
import { NotFound } from "./pages/NotFound";
import { PageLoadingSkeleton } from "./components/ux";
import { consumerRoutes } from "./routes/consumer.routes";
import { businessRoutes } from "./routes/business.routes";
import { adminRoutes } from "./routes/admin.routes";
import { isDesktopWorkspaceBuild } from "../lib/desktop-app";

/**
 * BaytMiftah REOS Master Router
 * ──────────────────────────────
 * Composes the active route trees for the final two-product model:
 *   1. Consumer (Web + Mobile)
 *   2. Business Platform (Web + Desktop + Mobile)
 *
 * Packaged Desktop uses hash routing and workspace-only entry (see build:desktop).
 *
 * Internal admin workflows remain under the Business Platform for role-aware
 * access and compatibility. A separate Admin Mobile product is not part of the
 * final architecture.
 *
 * All wrapped with the master Root shell and SurfaceProvider.
 */
const routeTree: RouteObject[] = [
  {
    path: "/",
    Component: Root,
    HydrateFallback: PageLoadingSkeleton,
    children: [
      ...consumerRoutes,
      ...businessRoutes,
      ...adminRoutes,
      { path: "*", Component: NotFound },
    ],
  },
];

/** Hash routing is required for packaged Electron (file://); web keeps browser history. */
export const router = isDesktopWorkspaceBuild()
  ? createHashRouter(routeTree)
  : createBrowserRouter(routeTree);
