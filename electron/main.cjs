const { app, BrowserWindow, Menu, Tray, ipcMain, shell, Notification, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow = null;
let tray = null;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

// Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    title: "BaytMiftah REOS — Real Estate Operating System",
    icon: path.join(__dirname, "../public/favicon.ico"),
    backgroundColor: "#ffffff",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Smooth appearance once ready
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle external link clicks safely in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL || devServerUrl);
  } else {
    // In production or when starting built app
    const indexPath = path.join(__dirname, "../dist/index.html");
    mainWindow.loadFile(indexPath).catch(() => {
      // Fallback if dev server is running
      mainWindow.loadURL(devServerUrl);
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  createApplicationMenu();
  createSystemTray();
}

function createApplicationMenu() {
  const isMac = process.platform === "darwin";

  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "File",
      submenu: [
        {
          label: "New Property Listing",
          accelerator: "CmdOrCtrl+N",
          click: () => mainWindow?.webContents.send("desktop:navigate", "/workspace?next=new"),
        },
        {
          label: "Search Listings",
          accelerator: "CmdOrCtrl+F",
          click: () => mainWindow?.webContents.send("desktop:navigate", "/search"),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "REOS Workspaces",
      submenu: [
        {
          label: "Command Center",
          accelerator: "CmdOrCtrl+1",
          click: () => mainWindow?.webContents.send("desktop:navigate", "/workspace"),
        },
        {
          label: "Properties & Units",
          accelerator: "CmdOrCtrl+2",
          click: () => mainWindow?.webContents.send("desktop:navigate", "/workspace/estates"),
        },
        {
          label: "Leases & Occupancy",
          accelerator: "CmdOrCtrl+3",
          click: () => mainWindow?.webContents.send("desktop:navigate", "/app/leases"),
        },
        {
          label: "Immutable Ledger & Payments",
          accelerator: "CmdOrCtrl+4",
          click: () => mainWindow?.webContents.send("desktop:navigate", "/app/payments"),
        },
        {
          label: "Maintenance & SLA Work Orders",
          accelerator: "CmdOrCtrl+5",
          click: () => mainWindow?.webContents.send("desktop:navigate", "/app/maintenance"),
        },
        { type: "separator" },
        {
          label: "REOS Copilot (AI)",
          accelerator: "CmdOrCtrl+K",
          click: () => mainWindow?.webContents.send("desktop:navigate", "/workspace/ai-assistant"),
        },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation & Support",
          click: () => shell.openExternal("https://baytmiftah.com"),
        },
        {
          label: "About BaytMiftah REOS",
          click: () => {
            if (Notification.isSupported()) {
              new Notification({
                title: "BaytMiftah REOS Desktop",
                body: "Ghana-first Real Estate Operating System for Discovery, ERP & AI.",
              }).show();
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createSystemTray() {
  try {
    const iconPath = path.join(__dirname, "../public/favicon.ico");
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Open BaytMiftah REOS",
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          } else {
            createMainWindow();
          }
        },
      },
      {
        label: "Marketplace Search",
        click: () => mainWindow?.webContents.send("desktop:navigate", "/search"),
      },
      {
        label: "Workspace Command Center",
        click: () => mainWindow?.webContents.send("desktop:navigate", "/workspace"),
      },
      { type: "separator" },
      {
        label: "Quit",
        click: () => app.quit(),
      },
    ]);

    tray.setToolTip("BaytMiftah REOS — Real Estate Operating System");
    tray.setContextMenu(contextMenu);
    tray.on("click", () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus();
        } else {
          mainWindow.show();
        }
      }
    });
  } catch {
    // Tray icon optional on some platforms
  }
}

// IPC Handlers
ipcMain.on("desktop:notify", (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

ipcMain.on("desktop:open-external", (_event, url) => {
  if (url && (url.startsWith("http:") || url.startsWith("https:"))) {
    shell.openExternal(url);
  }
});

ipcMain.on("desktop:minimize", () => mainWindow?.minimize());
ipcMain.on("desktop:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on("desktop:close", () => mainWindow?.close());
ipcMain.handle("desktop:get-version", () => app.getVersion());

ipcMain.handle("desktop:save-export", async (_event, { filename, data }) => {
  if (!mainWindow) return { success: false };
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename || "reos-export.json",
    filters: [
      { name: "JSON / CSV Documents", extensions: ["json", "csv", "xlsx"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  if (canceled || !filePath) return { success: false, canceled: true };
  try {
    fs.writeFileSync(filePath, typeof data === "string" ? data : JSON.stringify(data, null, 2), "utf8");
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("desktop:open-import", async (_event, { filters }) => {
  if (!mainWindow) return { success: false };
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: filters || [
      { name: "Data Files (CSV, JSON)", extensions: ["csv", "json"] },
      { name: "All Files", extensions: ["*"] },
    ],
  });
  if (canceled || !filePaths.length) return { success: false, canceled: true };
  try {
    const content = fs.readFileSync(filePaths[0], "utf8");
    return { success: true, filePath: filePaths[0], content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("desktop:print", async () => {
  if (!mainWindow) return { success: false };
  mainWindow.webContents.print({ silent: false, printBackground: true });
  return { success: true };
});

app.whenReady().then(() => {
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
