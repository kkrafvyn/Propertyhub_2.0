import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function writeLocalProperties(androidProjects) {
  const sdk =
    process.env.ANDROID_HOME ||
    process.env.ANDROID_SDK_ROOT ||
    path.join(os.homedir(), "AppData", "Local", "Android", "Sdk");
  if (!fs.existsSync(sdk)) {
    console.error("Android SDK not found. Install Android Studio or set ANDROID_HOME.");
    process.exit(1);
  }
  const contents = `sdk.dir=${sdk.replace(/\\/g, "/")}\n`;
  for (const dir of androidProjects) {
    fs.writeFileSync(path.join(root, dir, "local.properties"), contents, "utf8");
  }
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

const variant = process.argv[2] === "business" ? "business" : "consumer";
const androidProject = variant === "business" ? "android-business" : "android";
writeLocalProperties(["android", "android-business"]);
const jdkHome = resolveJdkHome();
const sdk =
  process.env.ANDROID_HOME ||
  process.env.ANDROID_SDK_ROOT ||
  path.join(os.homedir(), "AppData", "Local", "Android", "Sdk");

const androidProjectDir = path.join(root, androidProject);
const projectGradlew = path.join(androidProjectDir, "gradlew.bat");

const sync = spawnSync(process.execPath, [path.join(root, "scripts", "mobile-sync.mjs"), variant], {
  cwd: root,
  stdio: "inherit",
});
if (sync.status !== 0) process.exit(sync.status ?? 1);

const gradleCmd =
  process.platform === "win32"
    ? `"${projectGradlew}" assembleDebug`
    : `"${projectGradlew.replace(/gradlew.bat$/, "gradlew")}" assembleDebug`;
const build = spawnSync(gradleCmd, {
  cwd: androidProjectDir,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, JAVA_HOME: jdkHome, ANDROID_HOME: sdk },
});
if (build.status !== 0) process.exit(build.status ?? 1);

const apk = path.join(androidProjectDir, "app/build/outputs/apk/debug/app-debug.apk");
console.log(`\n✅ Debug APK: ${apk}`);
