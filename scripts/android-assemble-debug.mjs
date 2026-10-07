import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function run(cwd, cmd, args, extraEnv = {}) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...extraEnv },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function writeLocalProperties() {
  const sdk =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    path.join(os.homedir(), "AppData", "Local", "Android", "Sdk");
  if (!fs.existsSync(sdk)) {
    console.error("Android SDK not found. Install Android Studio or set ANDROID_HOME.");
    process.exit(1);
  }
  fs.writeFileSync(
    path.join(root, "android", "local.properties"),
    `sdk.dir=${sdk.replace(/\\/g, "/")}\n`,
    "utf8",
  );
}

function resolveJdkHome() {
  const candidates = [
    process.env.ANDROID_JAVA_HOME,
    process.env.JAVA_HOME,
    "C:/Program Files/Android/Android Studio/jbr",
    path.join(os.homedir(), "AppData", "Local", "Programs", "Android Studio", "jbr"),
  ].filter(Boolean);

  for (const home of candidates) {
    const java = path.join(home, "bin", "java.exe");
    if (!fs.existsSync(java)) continue;
    const v = spawnSync(java, ["-version"], { encoding: "utf8" });
    const text = `${v.stderr || ""}${v.stdout || ""}`;
    const major = Number(text.match(/version "(\d+)/)?.[1] || 0);
    if (major >= 21) {
      console.log(`Using JDK ${major} at ${home}`);
      return home;
    }
  }
  console.error(
    "JDK 21+ required for Capacitor Android. Set ANDROID_JAVA_HOME to Android Studio JBR or install Temurin 21.",
  );
  process.exit(1);
}

writeLocalProperties();
const jdkHome = resolveJdkHome();
const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  path.join(os.homedir(), "AppData", "Local", "Android", "Sdk");

run(root, "node", ["scripts/mobile-sync.mjs", "consumer"]);
run(path.join(root, "android"), "gradlew.bat", ["assembleDebug"], {
  JAVA_HOME: jdkHome,
  ANDROID_HOME: sdk,
});
