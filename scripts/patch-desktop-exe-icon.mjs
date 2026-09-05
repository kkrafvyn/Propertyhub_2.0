import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import rcedit from "rcedit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const iconPath = path.join(projectRoot, "electron", "build", "icon.ico");
const exePath = path.join(projectRoot, "dist-desktop", "win-unpacked", "BaytMiftah Workspace.exe");

async function main() {
  if (!fs.existsSync(exePath)) {
    console.warn(`Desktop exe not found, skipping icon patch: ${exePath}`);
    return;
  }

  if (!fs.existsSync(iconPath)) {
    throw new Error(`Missing icon file: ${iconPath}`);
  }

  await rcedit(exePath, { icon: iconPath });
  console.log(`Applied desktop icon to ${exePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
