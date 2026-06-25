const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktop", {
  platform: process.platform,
  backendUrl: "http://127.0.0.1:8000"
});

