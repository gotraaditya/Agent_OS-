const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron");
const path = require("node:path");

const DEVELOPMENT_URL = "http://127.0.0.1:3000";

// --- IPC Handlers ---
// Native folder picker dialog — called from renderer via preload bridge
ipcMain.handle("dialog:openFolder", async () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  const result = await dialog.showOpenDialog(focusedWindow, {
    properties: ["openDirectory"],
    title: "Select Project Folder"
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    title: "AI Team Manager",
    backgroundColor: "#101114",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // Required for IPC invoke to work through preload
    }
  });

  window.once("ready-to-show", () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (app.isPackaged) {
    // TODO(Phase 14): Point this at the packaged frontend during release work.
    window.loadFile(path.join(__dirname, "..", "web", "out", "index.html"));
  } else {
    window.loadURL(DEVELOPMENT_URL);
  }
}

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
