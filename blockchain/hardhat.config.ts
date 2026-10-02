import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: path.join(projectRoot, ".env"), quiet: true });

const deployerKey = process.env.HARDHAT_DEPLOYER_PRIVATE_KEY?.trim();
const accounts = deployerKey ? [deployerKey.startsWith("0x") ? deployerKey : `0x${deployerKey}`] : [];
const mainnetAccounts = process.env.ALLOW_MAINNET_CONTRACT_DEPLOY === "true" ? accounts : [];

export default defineConfig({
  plugins: [hardhatToolboxMochaEthers],
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
      type: "edr-simulated",
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      type: "http",
    },
    polygonAmoy: {
      url: process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/",
      accounts,
      chainId: 80002,
      type: "http",
    },
    polygonMainnet: {
      url: process.env.POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com",
      accounts: mainnetAccounts,
      chainId: 137,
      type: "http",
    },
  },
  ...(process.env.POLYGONSCAN_API_KEY
    ? {
        verify: {
          etherscan: {
            apiKey: process.env.POLYGONSCAN_API_KEY,
          },
        },
      }
    : {}),
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
});
