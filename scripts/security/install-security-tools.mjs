#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CACHE = path.join(ROOT, ".cache", "security-tools");
const GITLEAKS_VERSION = "8.24.2";
const TRIVY_VERSION = "0.74.0";

function platformKey() {
  if (process.platform === "win32") return "windows_x64";
  if (process.platform === "darwin") return process.arch === "arm64" ? "darwin_arm64" : "darwin_x64";
  return process.arch === "arm64" ? "linux_arm64" : "linux_x64";
}

function binName(base) {
  return process.platform === "win32" ? `${base}.exe` : base;
}

async function downloadFile(url, dest) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed ${url}: ${response.status}`);
  mkdirSync(path.dirname(dest), { recursive: true });
  await pipeline(response.body, createWriteStream(dest));
}

async function ensureGitleaks() {
  const dest = path.join(CACHE, binName("gitleaks"));
  if (existsSync(dest)) {
    console.log(`  ✓ gitleaks  ${dest}`);
    return dest;
  }

  if (process.platform === "win32") {
    const zipUrl = `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_windows_x64.zip`;
    const zipPath = path.join(CACHE, `gitleaks_${GITLEAKS_VERSION}_windows_x64.zip`);
    console.log(`  downloading gitleaks ${GITLEAKS_VERSION}…`);
    await downloadFile(zipUrl, zipPath);
    const unzip = spawnSync(
      "powershell",
      ["-Command", `Expand-Archive -Force '${zipPath}' '${CACHE}'`],
      { stdio: "inherit" },
    );
    if (unzip.status !== 0) throw new Error("Failed to extract gitleaks zip");
    if (existsSync(path.join(CACHE, "gitleaks.exe"))) {
      console.log(`  ✓ gitleaks  ${path.join(CACHE, "gitleaks.exe")}`);
      return path.join(CACHE, "gitleaks.exe");
    }
  } else {
    const key = platformKey();
    const asset = `gitleaks_${GITLEAKS_VERSION}_${key}.tar.gz`;
    const url = `https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/${asset}`;
    const archive = path.join(CACHE, asset);
    console.log(`  downloading gitleaks ${GITLEAKS_VERSION}…`);
    await downloadFile(url, archive);
    const extractResult = spawnSync("tar", ["-xzf", archive, "-C", CACHE], { stdio: "inherit" });
    if (extractResult.status !== 0) throw new Error("Failed to extract gitleaks archive");
  }

  console.log(`  ✓ gitleaks  ${dest}`);
  return dest;
}

async function ensureTrivy() {
  const dest = path.join(CACHE, binName("trivy"));
  if (existsSync(dest)) {
    console.log(`  ✓ trivy     ${dest}`);
    return dest;
  }

  if (process.platform === "win32") {
    const zipUrl = `https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_windows-64bit.zip`;
    const zipPath = path.join(CACHE, `trivy_${TRIVY_VERSION}_windows-64bit.zip`);
    console.log(`  downloading trivy ${TRIVY_VERSION}…`);
    await downloadFile(zipUrl, zipPath);
    const unzip = spawnSync(
      "powershell",
      ["-Command", `Expand-Archive -Force '${zipPath}' '${CACHE}'`],
      { stdio: "inherit" },
    );
    if (unzip.status !== 0) throw new Error("Failed to extract trivy zip");
  } else {
    const key = platformKey();
    const asset = `trivy_${TRIVY_VERSION}_${key}.tar.gz`;
    const url = `https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/${asset}`;
    const archive = path.join(CACHE, asset);
    console.log(`  downloading trivy ${TRIVY_VERSION}…`);
    await downloadFile(url, archive);
    const extractResult = spawnSync("tar", ["-xzf", archive, "-C", CACHE], { stdio: "inherit" });
    if (extractResult.status !== 0) throw new Error("Failed to extract trivy archive");
  }

  if (!existsSync(dest)) throw new Error("Trivy binary missing after extract");
  console.log(`  ✓ trivy     ${dest}`);
  return dest;
}

function ensureSemgrepViaPip() {
  const probe = spawnSync("semgrep", ["--version"], { encoding: "utf8" });
  if (probe.status === 0) {
    console.log(`  ✓ semgrep   ${probe.stdout.trim() || "on PATH"}`);
    return "semgrep";
  }

  const pipCandidates = [
    ["py", "-m", "pip", "install", "--user", "semgrep"],
    ["python3", "-m", "pip", "install", "--user", "semgrep"],
    ["pip3", "install", "--user", "semgrep"],
  ];

  for (const cmd of pipCandidates) {
    const pipProbe = spawnSync(cmd[0], [cmd[1], "--version"], {
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    if (pipProbe.status !== 0) continue;
    console.log(`  installing semgrep via ${cmd[0]}…`);
    const install = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit", shell: process.platform === "win32" });
    if (install.status === 0) {
      const version = spawnSync("semgrep", ["--version"], { encoding: "utf8" });
      if (version.status === 0) {
        console.log(`  ✓ semgrep   ${version.stdout.trim()}`);
        return "semgrep";
      }
    }
  }

  console.log("  ○ semgrep   run: py -m pip install semgrep");
  return null;
}

function printUsage() {
  console.log("\nLocal commands (no Docker required):");
  console.log("  npm run security:secrets");
  console.log("  npm run security:sast");
  console.log("  npm run security:container");
  console.log("");
}

async function main() {
  mkdirSync(CACHE, { recursive: true });
  console.log("\nBaytMiftah local security tools\n");
  await ensureGitleaks();
  await ensureTrivy();
  ensureSemgrepViaPip();
  printUsage();
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
