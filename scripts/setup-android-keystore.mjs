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
const assetLinks = JSON.parse(readFileSync(assetLinksPath, "utf8"));
assetLinks[0].target.sha256_cert_fingerprints = [fingerprint];
writeFileSync(assetLinksPath, `${JSON.stringify(assetLinks, null, 2)}\n`);

console.log("Keystore ready:", keystorePath);
console.log("SHA256 fingerprint:", fingerprint);
console.log("Updated assetlinks.json");
