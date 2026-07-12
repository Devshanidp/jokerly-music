#!/usr/bin/env node
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

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

async function resize(outPath, size) {
  mkdirSync(dirname(outPath), { recursive: true });
  await sharp(source).resize(size, size, { fit: "cover" }).png().toFile(outPath);
}

async function writeIcons(map, fileName) {
  for (const [folder, size] of Object.entries(map)) {
    await resize(join(resRoot, folder, fileName), size);
  }
}

await writeIcons(launcherSizes, "ic_launcher.png");
await writeIcons(maskableSizes, "ic_maskable.png");
await writeIcons(drawableSizes, "splash.png");
await writeIcons(drawableSizes, "ic_notification_icon.png");
console.log("Android icons synced from public/icon-512.png");
