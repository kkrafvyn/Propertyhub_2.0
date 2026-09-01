import { getWorkspaceRoute, WORKSPACE_ENTRY_PATH } from "./workspace";
import { WORKSPACE_PAGE_SLUGS } from "../app/lib/workspace-role-nav";

export const DESKTOP_LAST_ORG_KEY = "bm_desktop_last_org";

const WORKSPACE_PAGE_SET = new Set(WORKSPACE_PAGE_SLUGS);

export function persistDesktopLastOrg(slug: string) {
  if (!slug) return;
  try {
    localStorage.setItem(DESKTOP_LAST_ORG_KEY, slug);
  } catch {
    // ignore storage failures
  }
}

export function getDesktopLastOrg(): string | null {
  try {
    return localStorage.getItem(DESKTOP_LAST_ORG_KEY);
  } catch {
    return null;
  }
}

/**
 * Resolve Electron menu / tray shortcuts into router paths.
 * Workspace shortcuts may omit the org slug; we inject the last visited org.
 */
export function resolveDesktopRoute(route: string): string {
  const trimmed = route.trim();
  if (!trimmed.startsWith("/workspace")) {
    return trimmed;
  }

  const [pathname, search = ""] = trimmed.split("?");
  if (pathname === WORKSPACE_ENTRY_PATH) {
    const lastOrg = getDesktopLastOrg();
    if (lastOrg && !search) {
      return getWorkspaceRoute(lastOrg, "my-work");
    }
    return search ? `${WORKSPACE_ENTRY_PATH}?${search}` : WORKSPACE_ENTRY_PATH;
  }

  const segments = pathname.slice(WORKSPACE_ENTRY_PATH.length + 1).split("/").filter(Boolean);
  if (segments.length === 0) {
    return WORKSPACE_ENTRY_PATH;
  }

  const [first, second] = segments;

  if (segments.length >= 2) {
    return trimmed;
  }

  if (WORKSPACE_PAGE_SET.has(first)) {
    const lastOrg = getDesktopLastOrg();
    if (lastOrg) {
      return getWorkspaceRoute(lastOrg, first);
    }
    return `${WORKSPACE_ENTRY_PATH}?next=${encodeURIComponent(first)}`;
  }

  return trimmed;
}
