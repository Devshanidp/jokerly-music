const { app, BrowserWindow, shell, session, components } = require("electron");
const path = require("path");

const APP_URL = process.env.SHANSMUSIC_URL || "https://music.devshanidp.xyz";
const BACKGROUND = "#0A0610";

/** Hosts that should stay inside the Electron window (app + OAuth). */
const IN_APP_HOSTS = new Set([
  "music.devshanidp.xyz",
  "www.devshanidp.xyz",
  "devshanidp.xyz",
  "accounts.spotify.com",
  "login.spotify.com",
]);

// Spotify Web Playback needs autoplay + DRM (Widevine via castlabs EVS build)
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

let mainWindow = null;

function isInAppUrl(urlString) {
  try {
    const url = new URL(urlString);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (IN_APP_HOSTS.has(url.hostname)) return true;
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
    return false;
  } catch {
    return false;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 420,
    minHeight: 640,
    backgroundColor: BACKGROUND,
    autoHideMenuBar: true,
    title: "ShaN'sMusic",
    icon: path.join(__dirname, "build", "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      // Needed for EME / protected media in Chromium
      plugins: true,
    },
    show: false,
  });

  mainWindow.once("ready-to-show", () => {
    if (mainWindow) mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isInAppUrl(url)) {
      return { action: "allow" };
    }
    void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isInAppUrl(url)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  // Chrome-like UA so catalog / DRM paths treat us as a normal desktop browser
  const chromeUA =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
  void mainWindow.loadURL(APP_URL, { userAgent: chromeUA });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    // Castlabs EVS: wait for Widevine CDM before opening the player
    if (components && typeof components.whenReady === "function") {
      try {
        await components.whenReady();
        console.log("[ShaN'sMusic] DRM components:", components.status?.() ?? "ready");
      } catch (error) {
        console.error("[ShaN'sMusic] Widevine init failed:", error);
      }
    }

    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      if (
        permission === "media" ||
        permission === "notifications" ||
        permission === "mediaKeySystem"
      ) {
        callback(true);
        return;
      }
      callback(false);
    });

    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
