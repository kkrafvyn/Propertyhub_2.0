const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const offlineStore = require("./offline-store.cjs");

const startUrl = process.env.ELECTRON_START_URL;
const isDev = Boolean(startUrl);
const DESKTOP_ENTRY_HASH = "/login";
const AUTH_CALLBACK_PROTOCOL = "baytmiftah";
const AUTH_CALLBACK_HOST = "auth";

// Only these schemes may ever be handed to the OS. Blocks javascript:, file:,
// and third-party custom protocol handlers reaching shell.openExternal.
const SAFE_EXTERNAL_PROTOCOLS = new Set(["https:", "mailto:"]);

let mainWindow = null;

function isSafeExternalUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    return SAFE_EXTERNAL_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

// URLs that are allowed to load inside the app window itself. Anything else is
// either rejected or pushed out to the external browser.
function isTrustedAppUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("file://")) return true;
  if (isDev) return url.startsWith(String(startUrl).replace(/\/+$/, ""));
  return false;
}

function resolveIndexHtml() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar", "dist", "index.html");
  }
  return path.join(__dirname, "..", "dist", "index.html");
}

function resolvePreloadPath() {
  return path.join(__dirname, "preload.cjs");
}

function resolveAppIcon() {
  const buildIcon = path.join(__dirname, "build", "icon.ico");
  if (fs.existsSync(buildIcon)) return buildIcon;

  const candidates = [
    path.join(__dirname, "build", "icon.png"),
    path.join(__dirname, "..", "public", "brand", "app-icon-workspace.svg"),
    path.join(__dirname, "..", "public", "brand", "app-icon.svg"),
    path.join(__dirname, "..", "public", "icons", "icon-512.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function registerProtocolClient() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(AUTH_CALLBACK_PROTOCOL, process.execPath, [
        path.resolve(process.argv[1]),
      ]);
    }
  } else {
    app.setAsDefaultProtocolClient(AUTH_CALLBACK_PROTOCOL);
  }
}

function parseAuthCallback(url) {
  if (!url || typeof url !== "string") return null;
  if (!url.startsWith(`${AUTH_CALLBACK_PROTOCOL}://`)) return null;

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== AUTH_CALLBACK_HOST) return null;

    const params = new URLSearchParams(parsed.search.replace(/^\?/, ""));
    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    for (const [key, value] of hashParams.entries()) {
      params.set(key, value);
    }

    const code = params.get("code");
    if (code) {
      return { type: "code", code };
    }

    // Implicit-flow bearer tokens are deliberately rejected. Desktop OAuth
    // must complete through an authorization code and PKCE.
    return null;
  } catch {
    return null;
  }
}

function deliverAuthCallback(url) {
  const payload = parseAuthCallback(url);
  if (!payload || !mainWindow) return false;

  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.send("auth:oauth-callback", payload);
  return true;
}

function extractDeepLink(argv) {
  return argv.find((arg) => arg.startsWith(`${AUTH_CALLBACK_PROTOCOL}://`));
}

function registerOfflineIpc() {
  ipcMain.handle("offline:listOutbox", (_event, organizationId) =>
    offlineStore.listOutbox(organizationId),
  );
  ipcMain.handle("offline:upsertOutbox", (_event, entry) => offlineStore.upsertOutbox(entry));
  ipcMain.handle("offline:removeOutbox", (_event, id) => {
    offlineStore.removeOutbox(id);
    return true;
  });
  ipcMain.handle("offline:saveDraft", (_event, draft) => offlineStore.saveDraft(draft));
  ipcMain.handle("offline:getDraft", (_event, id) => offlineStore.getDraft(id));
  ipcMain.handle("offline:listDrafts", () => offlineStore.listDrafts());
  ipcMain.handle("offline:listConflicts", (_event, organizationId) =>
    offlineStore.listConflicts(organizationId),
  );
  ipcMain.handle("offline:recordConflict", (_event, conflict) =>
    offlineStore.recordConflict(conflict),
  );
  ipcMain.handle("offline:resolveConflict", (_event, id) => {
    offlineStore.resolveConflict(id);
    return true;
  });
  ipcMain.handle("app:getVersion", () => app.getVersion());
  ipcMain.handle("shell:openExternal", (_event, url) => {
    if (!isSafeExternalUrl(url)) {
      console.warn("[desktop] blocked openExternal for untrusted URL");
      return false;
    }
    shell.openExternal(url);
    return true;
  });
}

function attachSecurityGuards(win) {
  // Never let renderer content spawn an in-app window on a remote origin;
  // safe links go to the user's real browser instead.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  // Block navigations away from the bundled app (phishing / bridge capture).
  win.webContents.on("will-navigate", (event, url) => {
    if (isTrustedAppUrl(url)) return;
    event.preventDefault();
    if (isSafeExternalUrl(url)) shell.openExternal(url);
  });

  // The app has no use for <webview>; deny ambient privilege escalation.
  win.webContents.on("will-attach-webview", (event) => event.preventDefault());
}

function attachWindowDiagnostics(win) {
  win.webContents.on("did-fail-load", (_event, code, description, url) => {
    console.error("[desktop] did-fail-load", code, description, url);
  });

  win.webContents.on("render-process-gone", (_event, details) => {
    console.error("[desktop] render-process-gone", details);
  });

  win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level >= 2) {
      console.error(`[desktop renderer ${level}]`, message, sourceId, line);
    }
  });
}

function createWindow() {
  const iconPath = resolveAppIcon();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "BaytMiftah Workspace",
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: resolvePreloadPath(),
    },
  });

  mainWindow = win;
  attachSecurityGuards(win);
  attachWindowDiagnostics(win);

  if (isDev) {
    const url = startUrl.includes("#")
      ? startUrl
      : `${startUrl.replace(/\/$/, "")}#${DESKTOP_ENTRY_HASH}`;
    win.loadURL(url);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(resolveIndexHtml(), { hash: DESKTOP_ENTRY_HASH });
  }

  win.on("closed", () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const deepLink = extractDeepLink(argv);
    if (deepLink && deliverAuthCallback(deepLink)) return;

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.whenReady().then(() => {
  registerProtocolClient();
  offlineStore.init(app.getPath("userData"));
  registerOfflineIpc();
  createWindow();

  const launchDeepLink = extractDeepLink(process.argv);
  if (launchDeepLink) {
    deliverAuthCallback(launchDeepLink);
  }
});

app.on("open-url", (event, url) => {
  event.preventDefault();
  deliverAuthCallback(url);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
