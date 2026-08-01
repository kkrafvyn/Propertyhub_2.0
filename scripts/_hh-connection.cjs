/** Shared Hardhat 3 connection helper for deploy scripts. */
async function connectHardhat() {
  const { network } = require("hardhat");
  const connection = await network.connect();
  const networkName =
    process.env.HARDHAT_NETWORK ||
    connection.networkName ||
    connection.networkConfig?.name ||
    "unknown";

  return {
    ethers: connection.ethers,
    networkName,
  };
}

module.exports = { connectHardhat };
