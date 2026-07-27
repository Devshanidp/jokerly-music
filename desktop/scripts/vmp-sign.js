/**
 * Castlabs EVS VMP signing — required for Spotify Widevine playback.
 * Runs after electron-builder packs (and signs) the Windows app directory.
 *
 * Setup (one-time):
 *   python -m pip install --upgrade castlabs-evs
 *   python -m castlabs_evs.account signup
 *   (or) python -m castlabs_evs.account reauth
 */
"use strict";

const { execFileSync } = require("child_process");

exports.default = async function vmpSign(context) {
  if (context.electronPlatformName !== "win32") return;

  const appOutDir = context.appOutDir;
  const productName = context.packager.appInfo.productFilename || "ShaN'sMusic";

  console.log(`[VMP] Signing ${productName} in ${appOutDir}`);

  try {
    execFileSync(
      "python",
      ["-m", "castlabs_evs.vmp", "-n", "sign-pkg", appOutDir, "-H", productName],
      {
        stdio: "inherit",
        env: {
          ...process.env,
          EVS_NO_ASK: "1",
        },
      }
    );
    console.log("[VMP] Signature OK");
  } catch (error) {
    console.error("[VMP] Signing failed. Spotify DRM will not work until EVS signing succeeds.");
    console.error("[VMP] Run: python -m castlabs_evs.account signup   (or reauth)");
    console.error("[VMP]", error instanceof Error ? error.message : error);
    throw error;
  }
};
