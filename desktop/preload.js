"use strict";

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("__SHANSMUSIC_DESKTOP__", {
  platform: "windows",
  version: "1.0.1",
});
