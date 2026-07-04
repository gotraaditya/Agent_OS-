const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  backendUrl: "http://127.0.0.1:8000",

  /** Opens a native OS folder picker dialog. Returns the selected path string, or null if cancelled. */
  openFolderDialog: () => ipcRenderer.invoke("dialog:openFolder")
});
