/**
 * Desktop workstation build/runtime flags.
 * The packaged Electron app is workspace-only — not the consumer marketplace.
 */

export function isDesktopWorkspaceBuild(): boolean {
  return import.meta.env.VITE_DESKTOP_WORKSPACE_ONLY === "true";
}

export function isDesktopWorkspaceApp(): boolean {
  if (isDesktopWorkspaceBuild()) return true;
  if (typeof window === "undefined") return false;
  return (
    !!window.__ELECTRON__ ||
    !!window.__BAYTMIFTAH_DESKTOP__ ||
    (typeof navigator !== "undefined" && /electron/i.test(navigator.userAgent))
  );
}
