#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outputPath = path.join(projectRoot, "src", "lib", "database.types.ts");
const patchScript = path.join(projectRoot, "scripts", "patch-database-types.py");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function getProjectRef(env) {
  if (env.SUPABASE_PROJECT_REF) return env.SUPABASE_PROJECT_REF;
  if (env.VITE_SUPABASE_URL) {
    return new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0];
  }
  return null;
}

const env = {
  ...loadEnvFile(path.join(projectRoot, ".env")),
  ...loadEnvFile(path.join(projectRoot, "supabase", ".env.local")),
  ...process.env,
};

const projectRef = getProjectRef(env);

if (!projectRef) {
  console.warn("Missing Supabase project ref — applying patch-database-types.py fallback.");
  const patch = spawnSync("python", [patchScript], { stdio: "inherit", cwd: projectRoot });
  process.exit(patch.status ?? 1);
}

const result = spawnSync(
  "npx",
  [
    "supabase",
    "gen",
    "types",
    "typescript",
    "--project-id",
    projectRef,
    "--schema",
    "public",
  ],
  { encoding: "utf8", cwd: projectRoot },
);

if (result.status !== 0) {
  console.warn("Supabase CLI type generation failed — applying patch-database-types.py fallback.");
  console.warn(result.stderr || result.stdout);
  const patch = spawnSync("python", [patchScript], { stdio: "inherit", cwd: projectRoot });
  process.exit(patch.status ?? 1);
}

fs.writeFileSync(outputPath, result.stdout, "utf8");
console.log(`Wrote ${outputPath}`);

const patch = spawnSync("python", [patchScript], { stdio: "inherit", cwd: projectRoot });
process.exit(patch.status ?? 0);
