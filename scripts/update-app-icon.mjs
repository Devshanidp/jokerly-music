#!/usr/bin/env node
import sharp from "sharp";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2];
if (!src) {
  console.error("Usage: node scripts/update-app-icon.mjs <source-image>");
  process.exit(1);
}

const meta = await sharp(src).metadata();
console.log(`Source: ${meta.width}x${meta.height}`);

const size = Math.min(meta.width, meta.height);
const left = Math.round((meta.width - size) / 2);
const top = Math.round((meta.height - size) / 2);
console.log(`Crop: ${size}x${size} at (${left}, ${top})`);

const base = () =>
  sharp(src).extract({ left, top, width: size, height: size });

const sizes = [16, 32, 48, 72, 96, 128, 144, 152, 167, 180, 192, 384, 512];
for (const s of sizes) {
  const out = join(root, "public", `icon-${s}.png`);
  await base().resize(s, s, { fit: "cover" }).png().toFile(out);
  console.log(`wrote ${out}`);
}

await base().resize(512, 512).png().toFile(join(root, "public", "icon.png"));
await base().resize(512, 512).png().toFile(join(root, "public", "logo.png"));
await base().resize(180, 180).png().toFile(join(root, "public", "apple-touch-icon.png"));
await base()
  .resize(180, 180)
  .png()
  .toFile(join(root, "public", "apple-touch-icon-precomposed.png"));
await base().resize(180, 180).png().toFile(join(root, "src", "app", "apple-icon.png"));
await base().resize(192, 192).png().toFile(join(root, "src", "app", "icon.png"));

// Simple favicon from 32px PNG (browsers accept PNG-as-ICO in many cases;
// also write a proper multi-size ico via png buffer rename for static use)
await base().resize(32, 32).png().toFile(join(root, "public", "favicon.ico"));

console.log("Web icons updated.");
