const { contextBridge, ipcRenderer } = require("electron");

const offlineStore = {
  listOutbox: (organizationId) => ipcRenderer.invoke("offline:listOutbox", organizationId),
  upsertOutbox: (entry) => ipcRenderer.invoke("offline:upsertOutbox", entry),
  removeOutbox: (id) => ipcRenderer.invoke("offline:removeOutbox", id),
  saveDraft: (draft) => ipcRenderer.invoke("offline:saveDraft", draft),
  getDraft: (id) => ipcRenderer.invoke("offline:getDraft", id),
  listDrafts: () => ipcRenderer.invoke("offline:listDrafts"),
  listConflicts: (organizationId) => ipcRenderer.invoke("offline:listConflicts", organizationId),
  recordConflict: (conflict) => ipcRenderer.invoke("offline:recordConflict", conflict),
  resolveConflict: (id) => ipcRenderer.invoke("offline:resolveConflict", id),
  clearAll: () => ipcRenderer.invoke("offline:clearAll"),
};

contextBridge.exposeInMainWorld("__ELECTRON__", true);
contextBridge.exposeInMainWorld("__BAYTMIFTAH_DESKTOP__", {
  platform: process.platform,
  surface: "business-desktop",
  workspaceOnly: true,
  versions: process.versions,
});
contextBridge.exposeInMainWorld("desktopAPI", {
  isDesktop: true,
  platform: process.platform,
  sendNotification: (title, body) => {
    // Reserved for native notifications.
    console.info("[desktop notification]", title, body);
  },
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),
  onOAuthCallback: (callback) => {
    if (typeof callback !== "function") return () => undefined;
    const handler = (_event, session) => callback(session);
    ipcRenderer.on("auth:oauth-callback", handler);
    return () => ipcRenderer.removeListener("auth:oauth-callback", handler);
  },
  minimizeWindow: () => undefined,
  maximizeWindow: () => undefined,
  closeWindow: () => undefined,
  getAppVersion: () => ipcRenderer.invoke("app:getVersion"),
  printDocument: async () => ({ success: false }),
  saveExportFile: async () => ({ success: false, canceled: true }),
  openImportFile: async () => ({ success: false, canceled: true }),
  onNavigate: () => () => undefined,
  offlineStore,
});
