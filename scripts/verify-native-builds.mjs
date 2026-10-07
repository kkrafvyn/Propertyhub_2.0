import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

function mustExist(rel, label) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`Missing ${label}: ${rel}`);
    process.exit(1);
  }
  const stat = fs.statSync(abs);
  console.log(`OK ${label}: ${rel} (${stat.size} bytes)`);
}

mustExist("dist/index.html", "desktop web bundle");
mustExist(
  path.join("dist-desktop", "win-unpacked", "BaytMiftah Workspace.exe"),
  "Windows unpacked executable",
);
mustExist("dist-desktop/baytmiftah-desktop-setup.exe", "Windows NSIS installer");

const apkDir = path.join(root, "android", "app", "build", "outputs", "apk", "debug");
if (!fs.existsSync(apkDir)) {
  console.error("Missing Android debug APK output directory. Run npm run android:build.");
  process.exit(1);
}
const apks = fs.readdirSync(apkDir).filter((f) => f.endsWith(".apk"));
if (!apks.length) {
  console.error("No debug APK found under android/app/build/outputs/apk/debug");
  process.exit(1);
}
for (const apk of apks) {
  mustExist(path.join("android", "app", "build", "outputs", "apk", "debug", apk), "Android APK");
}

console.log("Native build artifacts verified.");
