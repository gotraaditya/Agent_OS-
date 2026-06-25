const { app, BrowserWindow, shell } = require("electron");
const path = require("node:path");

const DEVELOPMENT_URL = "http://127.0.0.1:3000";

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
      sandbox: true
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

