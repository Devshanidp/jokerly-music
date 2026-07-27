import { mkdir, copyFile, access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(__dirname, "..");
const repoRoot = resolve(desktopRoot, "..");
const sourcePng = join(repoRoot, "public", "icon-512.png");
const buildDir = join(desktopRoot, "build");
const outPng = join(buildDir, "icon-256.png");
const outIco = join(buildDir, "icon.ico");

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(sourcePng))) {
    throw new Error(`Missing brand icon: ${sourcePng}`);
  }

  await mkdir(buildDir, { recursive: true });

  // electron-builder likes multi-size ico; generate a clean 256px master first
  await sharp(sourcePng).resize(256, 256).png().toFile(outPng);

  const icoBuffer = await pngToIco([
    await sharp(sourcePng).resize(16, 16).png().toBuffer(),
    await sharp(sourcePng).resize(32, 32).png().toBuffer(),
    await sharp(sourcePng).resize(48, 48).png().toBuffer(),
    await sharp(sourcePng).resize(64, 64).png().toBuffer(),
    await sharp(sourcePng).resize(128, 128).png().toBuffer(),
    await sharp(sourcePng).resize(256, 256).png().toBuffer(),
  ]);

  await writeFile(outIco, icoBuffer);
  await copyFile(sourcePng, join(buildDir, "icon-512.png"));

  console.log(`Desktop icons ready:\n  ${outIco}\n  ${outPng}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
