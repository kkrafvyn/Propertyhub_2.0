import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const CACHE = path.join(ROOT, ".cache", "security-tools");
const REPO_MOUNT = ROOT + ":/repo";
const SRC_MOUNT = ROOT + ":/src";

function binName(base) {
  return process.platform === "win32" ? base + ".exe" : base;
}

function dockerAvailable() {
  return spawnSync("docker", ["info"], { encoding: "utf8" }).status === 0;
}

function findUserSemgrep() {
  const appData = process.env.APPDATA;
  if (!appData) return null;
  const pythonRoot = path.join(appData, "Python");
  if (!existsSync(pythonRoot)) return null;

  for (const version of readdirSync(pythonRoot)) {
    const candidate = path.join(pythonRoot, version, "Scripts", binName("semgrep"));
    if (existsSync(candidate) && spawnSync(candidate, ["--version"], { encoding: "utf8" }).status === 0) {
      return candidate;
    }
  }
  return null;
}

function semgrepAvailable() {
  // nosemgrep: detect-child-process - command is a fixed security scanner binary.
  if (spawnSync("semgrep", ["--version"], { encoding: "utf8" }).status === 0) {
    return { command: "semgrep", prefixArgs: [], via: "path" };
  }

  const userSemgrep = findUserSemgrep();
  if (userSemgrep) {
    return { command: userSemgrep, prefixArgs: [], via: "pip" };
  }

  if (dockerAvailable()) {
    return {
      command: "docker",
      prefixArgs: ["run", "--rm", "-v", SRC_MOUNT, "returntocorp/semgrep", "semgrep"],
      via: "docker",
    };
  }

  return null;
}

/**
 * @param {"gitleaks"|"semgrep"|"trivy"} tool
 * @returns {{ command: string, prefixArgs: string[], via: string } | null}
 */
export function resolveSecurityTool(tool) {
  if (tool === "semgrep") {
    return semgrepAvailable();
  }

  // nosemgrep: detect-child-process - tool is restricted to the documented scanner allowlist.
  if (spawnSync(tool, ["--version"], { encoding: "utf8" }).status === 0) {
    return { command: tool, prefixArgs: [], via: "path" };
  }

  const cached = path.join(CACHE, binName(tool));
  if (existsSync(cached)) {
    return { command: cached, prefixArgs: [], via: "cache" };
  }

  if (tool === "gitleaks" && existsSync(path.join(CACHE, "gitleaks.exe"))) {
    return { command: path.join(CACHE, "gitleaks.exe"), prefixArgs: [], via: "cache" };
  }

  if (!dockerAvailable()) return null;

  if (tool === "gitleaks") {
    return {
      command: "docker",
      prefixArgs: [
        "run",
        "--rm",
        "-v",
        REPO_MOUNT,
        "zricethezav/gitleaks:v8.24.2",
        "detect",
        "--source",
        "/repo",
        "--config",
        "/repo/.gitleaks.toml",
      ],
      via: "docker",
    };
  }

  if (tool === "trivy") {
    return {
      command: "docker",
      prefixArgs: ["run", "--rm", "-v", REPO_MOUNT, "aquasec/trivy:latest", "fs"],
      via: "docker",
    };
  }

  return null;
}

/**
 * @param {{ command: string, prefixArgs: string[], via: string }} resolved
 * @param {string[]} args
 */
export function runResolvedTool(resolved, args) {
  const useShell = resolved.via === "docker" && process.platform === "win32";
  /** @type {NodeJS.ProcessEnv} */
  const env = { ...process.env };
  if (resolved.via === "pip") {
    const scriptsDir = path.dirname(resolved.command);
    env.PATH = `${scriptsDir}${path.delimiter}${env.PATH || ""}`;
  }
  // nosemgrep: detect-child-process - resolved commands come only from the scanner resolver above.
  return spawnSync(resolved.command, [...resolved.prefixArgs, ...args], {
    encoding: "utf8",
    cwd: ROOT,
    shell: useShell,
    env,
  });
}
