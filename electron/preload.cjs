const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopAPI", {
  isDesktop: true,
  platform: process.platform,
  sendNotification: (title, body) => ipcRenderer.send("desktop:notify", { title, body }),
  openExternal: (url) => ipcRenderer.send("desktop:open-external", url),
  minimizeWindow: () => ipcRenderer.send("desktop:minimize"),
  maximizeWindow: () => ipcRenderer.send("desktop:maximize"),
  closeWindow: () => ipcRenderer.send("desktop:close"),
  getAppVersion: () => ipcRenderer.invoke("desktop:get-version"),
  printDocument: () => ipcRenderer.invoke("desktop:print"),
  saveExportFile: (filename, data) => ipcRenderer.invoke("desktop:save-export", { filename, data }),
  openImportFile: (filters) => ipcRenderer.invoke("desktop:open-import", { filters }),
  onNavigate: (callback) => {
    const handler = (_event, route) => callback(route);
    ipcRenderer.on("desktop:navigate", handler);
    return () => ipcRenderer.removeListener("desktop:navigate", handler);
  },
});
