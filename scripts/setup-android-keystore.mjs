#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const twaRoot = join(root, "android-twa");
const keystorePath = join(twaRoot, "jokerly.keystore");
const propsPath = join(twaRoot, "keystore.properties");
const assetLinksPath = join(root, "public", ".well-known", "assetlinks.json");

const storePassword = process.env.JOKERLY_KEYSTORE_PASSWORD ?? "jokerlyMusic2026";
const keyPassword = process.env.JOKERLY_KEY_PASSWORD ?? storePassword;
const keyAlias = "jokerly";

function findKeytool() {
  const candidates = [
    process.env.JAVA_HOME ? join(process.env.JAVA_HOME, "bin", "keytool.exe") : null,
    "C:\\Users\\ShaN\\.bubblewrap\\jdk\\jdk-17.0.11+9\\bin\\keytool.exe",
    "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\keytool.exe",
    "keytool",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate === "keytool" || existsSync(candidate)) return candidate;
  }
  throw new Error("keytool not found. Set JAVA_HOME and retry.");
}

function runKeytool(args) {
  const keytool = findKeytool();
  return execFileSync(keytool, args, { encoding: "utf8" });
}

if (!existsSync(keystorePath)) {
  console.log("Creating Android signing keystore…");
  runKeytool([
    "-genkeypair",
    "-v",
    "-keystore",
    keystorePath,
    "-alias",
    keyAlias,
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "10000",
    "-storepass",
    storePassword,
    "-keypass",
    keyPassword,
    "-dname",
    "CN=Jokerly Music, OU=Mobile, O=Shanid, L=Unknown, ST=Unknown, C=US",
  ]);
}

writeFileSync(
  propsPath,
  [
    "storeFile=jokerly.keystore",
    `storePassword=${storePassword}`,
    `keyPassword=${keyPassword}`,
    `keyAlias=${keyAlias}`,
    "",
  ].join("\n")
);

const listing = runKeytool([
  "-list",
  "-v",
  "-keystore",
  keystorePath,
  "-alias",
  keyAlias,
  "-storepass",
  storePassword,
]);

const match = listing.match(/SHA256:\s*([0-9A-F:]+)/i);
if (!match) {
  throw new Error("Could not read SHA256 fingerprint from keystore.");
}

const fingerprint = match[1].toUpperCase();
// Play App Signing key (Google re-signs Play Store builds with this cert).
const PLAY_APP_SIGNING_FINGERPRINT =
  "B8:4F:AD:56:4B:FE:7E:BC:3C:5B:19:D3:F6:26:BF:26:E7:5A:E6:E3:B3:F7:8D:C8:0C:D2:C3:12:ED:9C:27:42";

const assetLinks = JSON.parse(readFileSync(assetLinksPath, "utf8"));
const fingerprints = new Set([fingerprint, PLAY_APP_SIGNING_FINGERPRINT]);
for (const existing of assetLinks[0].target.sha256_cert_fingerprints ?? []) {
  fingerprints.add(existing);
}
assetLinks[0].target.sha256_cert_fingerprints = [...fingerprints];
writeFileSync(assetLinksPath, `${JSON.stringify(assetLinks, null, 2)}\n`);

console.log("Keystore ready:", keystorePath);
console.log("SHA256 fingerprint:", fingerprint);
console.log("Updated assetlinks.json");
