const { app, BrowserWindow } = require("electron");
const path = require("path");

const startUrl = process.env.ELECTRON_START_URL;
const isDev = Boolean(startUrl);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL(startUrl);
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  win.webContents.on("did-finish-load", () => {
    win.webContents.executeJavaScript(
      "window.__BAYTMIFTAH_DESKTOP__ = true; window.__ELECTRON__ = true;",
      true,
    );
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
