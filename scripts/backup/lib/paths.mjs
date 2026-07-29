import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.join(__dirname, "..", "..", "..");
export const BACKUPS_ROOT = path.join(PROJECT_ROOT, "backups");

export function createBackupDir(label = "manual") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(BACKUPS_ROOT, `${stamp}_${label}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
