import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

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
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 80002,
      type: "http",
    },
    polygonMainnet: {
      url: process.env.POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
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
    tests: "../test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
});
