#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "public", "icon-512.png");
const resRoot = join(root, "android-twa", "app", "src", "main", "res");

if (!existsSync(source)) {
  console.error("Missing source icon:", source);
  process.exit(1);
}

const launcherSizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

const maskableSizes = {
  "mipmap-mdpi": 108,
  "mipmap-hdpi": 162,
  "mipmap-xhdpi": 216,
  "mipmap-xxhdpi": 324,
  "mipmap-xxxhdpi": 432,
};

const drawableSizes = {
  "drawable-mdpi": 48,
  "drawable-hdpi": 72,
  "drawable-xhdpi": 96,
  "drawable-xxhdpi": 144,
  "drawable-xxxhdpi": 192,
};

function resize(outPath, size) {
  mkdirSync(dirname(outPath), { recursive: true });
  execFileSync(
    "magick",
    [source, "-resize", `${size}x${size}`, outPath],
    { stdio: "inherit" }
  );
}

function writeIcons(map, fileName) {
  for (const [folder, size] of Object.entries(map)) {
    resize(join(resRoot, folder, fileName), size);
  }
}

try {
  writeIcons(launcherSizes, "ic_launcher.png");
  writeIcons(maskableSizes, "ic_maskable.png");
  writeIcons(drawableSizes, "splash.png");
  writeIcons(drawableSizes, "ic_notification_icon.png");
  console.log("Android icons synced from public/icon-512.png");
} catch {
  for (const [folder] of Object.entries(launcherSizes)) {
    mkdirSync(join(resRoot, folder), { recursive: true });
    copyFileSync(source, join(resRoot, folder, "ic_launcher.png"));
    copyFileSync(source, join(resRoot, folder, "ic_maskable.png"));
  }
  for (const folder of Object.keys(drawableSizes)) {
    mkdirSync(join(resRoot, folder), { recursive: true });
    copyFileSync(source, join(resRoot, folder, "splash.png"));
    copyFileSync(source, join(resRoot, folder, "ic_notification_icon.png"));
  }
  console.log("ImageMagick not found; copied icon-512.png to Android resource folders.");
}
