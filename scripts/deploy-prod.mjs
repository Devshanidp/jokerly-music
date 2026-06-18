#!/usr/bin/env node
/**
 * Production deploy with a fixed primary domain.
 * Skips Vercel auto-domain promotion, then aliases music.devshanidp.xyz explicitly.
 */
import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PRIMARY_HOST = "music.devshanidp.xyz";
const EXTRA_ALIASES = ["www.devshanidp.xyz", "devshanidp.xyz"];

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const localBin = join(root, "node_modules", ".bin", process.platform === "win32" ? "vercel.cmd" : "vercel");

function runVercel(args) {
  if (existsSync(localBin)) {
    return execFileSync(localBin, args, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "inherit"],
      cwd: root,
    });
  }

  const quoted = args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg)).join(" ");
  return execSync(`vercel ${quoted}`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "inherit"],
    cwd: root,
    shell: true,
  });
}

console.log("Deploying production build…");
const raw = runVercel(["deploy", "--prod", "--skip-domain", "--yes", "--format", "json"]);
const data = JSON.parse(raw.trim());
const deploymentUrl = data.url ?? data.deployment?.url;

if (!deploymentUrl) {
  console.error("Could not read deployment URL from Vercel.");
  process.exit(1);
}

const deploymentHost = deploymentUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
const aliases = [PRIMARY_HOST, ...EXTRA_ALIASES];

for (const alias of aliases) {
  console.log(`Aliasing https://${alias} → ${deploymentHost}`);
  runVercel(["alias", "set", deploymentHost, alias]);
}

console.log(`\nProduction ready: https://${PRIMARY_HOST}/`);
console.log(`Deployment: ${deploymentUrl}`);
