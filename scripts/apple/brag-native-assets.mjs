#!/usr/bin/env node
/**
 * Native iOS simulator captures for App Store (iPhone 6.7" + iPad 13") with fictional review data.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exportAppPreview } from "./brag-ffmpeg.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const assetsRoot = path.resolve(root, "../apple-store-assets");
const developerDir = process.env.DEVELOPER_DIR || "/Applications/Xcode-beta.app/Contents/Developer";
const skipProvision = process.argv.includes("--skip-provision");
const variantArg = process.argv.find((a) => a.startsWith("--variant="));
const variantFilter = variantArg?.split("=")[1] || "all";

const IPHONE_UDID = process.env.BRAG_IPHONE_UDID || "B459533F-00DD-4E91-9756-D586CEDE2AC2";
const IPAD_UDID = process.env.BRAG_IPAD_UDID || "F376A366-DEE4-4A82-867D-741E292AC463";

const APPS = {
  consumer: {
    bundleId: "com.baymiftah.app",
    iosDir: "ios",
    ddApp: ".tmp/dd-ios/Build/Products/Debug-iphonesimulator/App.app",
    reviewKey: "consumer",
  },
  workspace: {
    bundleId: "com.baymiftah.workspace",
    iosDir: "ios-business",
    ddApp: ".tmp/dd-ios-business/Build/Products/Debug-iphonesimulator/App.app",
    reviewKey: "workspace",
  },
};

function simctl(args, opts = {}) {
  const res = spawnSync("xcrun", ["simctl", ...args], {
    encoding: "utf8",
    env: { ...process.env, DEVELOPER_DIR: developerDir },
    ...opts,
  });
  if (res.status !== 0 && !opts.allowFail) {
    throw new Error(`simctl ${args.join(" ")} failed: ${res.stderr || res.stdout}`);
  }
  return res;
}

async function runNode(script) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, DEVELOPER_DIR: developerDir },
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`))));
  });
}

async function readReviewCreds(kind) {
  const file = path.join(root, "secrets/app-review", `${kind}.json`);
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function buildSimulatorApp(appKey) {
  const app = APPS[appKey];
  await runNode(`scripts/mobile-sync.mjs ${appKey === "consumer" ? "consumer" : "business"}`);
  const workspace = path.join(root, app.iosDir, "App/App.xcworkspace");
  await new Promise((resolve, reject) => {
    const dd = path.join(root, `.tmp/dd-${appKey === "consumer" ? "ios" : "ios-business"}`);
    const child = spawn(
      "xcodebuild",
      [
        "-workspace",
        workspace,
        "-scheme",
        "App",
        "-configuration",
        "Debug",
        "-destination",
        "generic/platform=iOS Simulator",
        "-derivedDataPath",
        dd,
        "CODE_SIGNING_ALLOWED=NO",
        "build",
      ],
      {
        cwd: root,
        stdio: "inherit",
        env: { ...process.env, DEVELOPER_DIR: developerDir },
      },
    );
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`xcodebuild failed for ${appKey}`))));
  });
}

async function boot(udid) {
  simctl(["boot", udid], { allowFail: true });
  for (let i = 0; i < 60; i += 1) {
    const list = simctl(["list", "devices", "booted"]);
    if (list.stdout.includes(udid)) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Simulator ${udid} did not boot`);
}

async function shutdown(udid) {
  simctl(["shutdown", udid], { allowFail: true });
}

function activateSimulator() {
  spawnSync("open", ["-a", "Simulator"], { stdio: "ignore" });
}

async function simType(text) {
  activateSimulator();
  await new Promise((r) => setTimeout(r, 800));
  const script = `
    tell application "Simulator" to activate
    delay 0.4
    tell application "System Events"
      keystroke "${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"
    end tell
  `;
  spawnSync("osascript", ["-e", script], { stdio: "ignore" });
}

async function simKey(code) {
  const script = `
    tell application "Simulator" to activate
    delay 0.2
    tell application "System Events" to key code ${code}
  `;
  spawnSync("osascript", ["-e", script], { stdio: "ignore" });
}

async function tapRelative(udid, rx, ry) {
  activateSimulator();
  await new Promise((r) => setTimeout(r, 500));
  const script = `
    tell application "Simulator" to activate
    delay 0.3
    tell application "System Events"
      tell process "Simulator"
        set frontmost to true
        set {x, y} to position of window 1
        set {w, h} to size of window 1
        click at {(x + (w * ${rx})), (y + (h * ${ry}))}
      end tell
    end tell
  `;
  spawnSync("osascript", ["-e", script], { stdio: "ignore" });
}

async function dismissCookieBanner() {
  await tapRelative(null, 0.35, 0.92);
  await new Promise((r) => setTimeout(r, 600));
}

async function loginInApp(email, password) {
  await tapRelative(null, 0.5, 0.42);
  await new Promise((r) => setTimeout(r, 400));
  await simType(email);
  await simKey(48); // tab
  await simType(password);
  await simKey(36); // return
  await new Promise((r) => setTimeout(r, 5000));
  await dismissCookieBanner();
  await new Promise((r) => setTimeout(r, 2000));
}

async function screenshot(udid, outPath) {
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  simctl(["io", udid, "screenshot", outPath]);
}

async function recordPreview(udid, outMov, seconds = 18) {
  await fs.mkdir(path.dirname(outMov), { recursive: true });
  const proc = spawn(
    "xcrun",
    ["simctl", "io", udid, "recordVideo", "--codec=h264", "--force", outMov],
    { env: { ...process.env, DEVELOPER_DIR: developerDir }, stdio: ["ignore", "pipe", "pipe"] },
  );
  let started = false;
  proc.stderr?.on("data", (buf) => {
    if (/Recording started/.test(buf.toString())) started = true;
  });
  for (let i = 0; i < 40 && !started; i += 1) await new Promise((r) => setTimeout(r, 250));
  await new Promise((r) => setTimeout(r, seconds * 1000));
  proc.kill("SIGINT");
  await new Promise((resolve) => proc.on("exit", resolve));
  return outMov;
}

async function captureVariantOnDevice(variant, deviceKey, udid) {
  const app = APPS[variant];
  const creds = await readReviewCreds(app.reviewKey);
  const appPath = path.join(root, app.ddApp);
  try {
    await fs.access(appPath);
  } catch {
    await buildSimulatorApp(variant);
  }

  await boot(udid);
  simctl(["install", udid, appPath]);
  simctl(["terminate", udid, app.bundleId], { allowFail: true });
  simctl(["launch", udid, app.bundleId]);
  await new Promise((r) => setTimeout(r, 8000));

  const base = path.join(assetsRoot, variant, "screenshots", `native-${deviceKey}`);
  await screenshot(udid, path.join(base, "01-sign-in-native.png"));
  await loginInApp(creds.email, creds.password);
  await screenshot(udid, path.join(base, "02-after-sign-in.png"));

  if (variant === "consumer") {
    await tapRelative(udid, 0.12, 0.94);
    await new Promise((r) => setTimeout(r, 1500));
    await screenshot(udid, path.join(base, "03-home-tab.png"));
    await tapRelative(udid, 0.38, 0.94);
    await new Promise((r) => setTimeout(r, 1500));
    await screenshot(udid, path.join(base, "04-explore-tab.png"));
  } else {
    await tapRelative(udid, 0.2, 0.12);
    await new Promise((r) => setTimeout(r, 2000));
    await screenshot(udid, path.join(base, "03-workspace-nav.png"));
  }

  const rawMov = path.join(assetsRoot, variant, "preview", `native-${deviceKey}-raw.mov`);
  await simctl(["terminate", udid, app.bundleId], { allowFail: true });
  simctl(["launch", udid, app.bundleId]);
  await new Promise((r) => setTimeout(r, 6000));
  await recordPreview(udid, rawMov, 18);

  const outMp4 =
    deviceKey === "ipad-13"
      ? path.join(assetsRoot, variant, "preview", `ipad-13-app-preview.mp4`)
      : path.join(assetsRoot, variant, "preview", `iphone-67-app-preview.mp4`);

  const target =
    deviceKey === "ipad-13"
      ? { width: 2064, height: 2752 }
      : { width: 886, height: 1920 };

  await exportAppPreview({
    input: rawMov,
    output: outMp4,
    width: target.width,
    height: target.height,
    minSeconds: 15,
    maxSeconds: 30,
  });

  return { base, outMp4, rawMov };
}

async function main() {
  if (!skipProvision) {
    if (variantFilter === "all" || variantFilter === "workspace") {
      await runNode("scripts/apple/provision-review-workspace.mjs");
    }
    if (variantFilter === "all" || variantFilter === "consumer") {
      await runNode("scripts/apple/provision-review-consumer.mjs");
    }
  }

  const manifestPath = path.join(assetsRoot, "BRAG-MANIFEST.json");
  let manifest = {};
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch {
    manifest = { variants: {} };
  }
  manifest.native = manifest.native || {};

  const jobs = [];
  if (variantFilter === "all" || variantFilter === "consumer") {
    jobs.push(["consumer", "iphone-6.7", IPHONE_UDID], ["consumer", "ipad-13", IPAD_UDID]);
  }
  if (variantFilter === "all" || variantFilter === "workspace") {
    jobs.push(["workspace", "iphone-6.7", IPHONE_UDID], ["workspace", "ipad-13", IPAD_UDID]);
  }

  for (const [variant, deviceKey, udid] of jobs) {
    console.log(`\n=== ${variant} on ${deviceKey} (${udid}) ===`);
    try {
      const result = await captureVariantOnDevice(variant, deviceKey, udid);
      manifest.native[`${variant}:${deviceKey}`] = {
        udid,
        screenshotsDir: path.relative(assetsRoot, result.base),
        previewMp4: path.relative(assetsRoot, result.outMp4),
      };
    } finally {
      await shutdown(udid);
    }
  }

  manifest.generatedAt = new Date().toISOString();
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log("\n✅ Native simulator assets captured.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
