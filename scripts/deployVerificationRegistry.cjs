const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying VerificationRegistry contract...");

  const VerificationRegistry = await hre.ethers.getContractFactory("VerificationRegistry");
  const registry = await VerificationRegistry.deploy();

  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();

  console.log("VerificationRegistry deployed to:", registryAddress);

  const deploymentInfo = {
    network: hre.network.name,
    contractName: "VerificationRegistry",
    address: registryAddress,
    deployedAt: new Date().toISOString(),
    transactionHash: registry.deploymentTransaction()?.hash,
  };

  saveDeploymentInfo("VerificationRegistry", deploymentInfo);
  updateEnvFile("VITE_VERIFICATION_REGISTRY_ADDRESS", registryAddress);
}

function saveDeploymentInfo(contractName, info) {
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filePath = path.join(deploymentsDir, `${contractName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(info, null, 2));
  console.log(`Deployment info saved to ${filePath}`);
}

function updateEnvFile(key, value) {
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) {
    fs.writeFileSync(envPath, "");
  }

  let envContent = fs.readFileSync(envPath, "utf-8");
  const regex = new RegExp(`^${key}=.*$`, "m");

  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }

  fs.writeFileSync(envPath, envContent.trimStart());
  console.log(`Updated .env with ${key}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
