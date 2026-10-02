import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Wallet } from "ethers";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const force = process.argv.includes("--force");
const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

function getValue(name) {
  const match = existing.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match?.[1]?.trim() || "";
}

if (getValue("HARDHAT_DEPLOYER_PRIVATE_KEY") && !force) {
  console.log("Hardhat deployer already configured; private key was not changed.");
  process.exit(0);
}

const wallet = Wallet.createRandom();
const updates = {
  HARDHAT_DEPLOYER_PRIVATE_KEY: wallet.privateKey,
  HARDHAT_DEPLOYER_ADDRESS: wallet.address,
  POLYGON_AMOY_RPC_URL: getValue("POLYGON_AMOY_RPC_URL") || "https://rpc-amoy.polygon.technology/",
  POLYGON_MAINNET_RPC_URL: getValue("POLYGON_MAINNET_RPC_URL") || "https://polygon-rpc.com",
};

let next = existing;
for (const [name, value] of Object.entries(updates)) {
  const line = `${name}=${value}`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  next = pattern.test(next) ? next.replace(pattern, line) : `${next.trimEnd()}\n${line}\n`;
}
fs.writeFileSync(envPath, next, { mode: 0o600 });
console.log(`Created dedicated Hardhat deployer ${wallet.address}. Private key saved only in ignored root .env.`);
