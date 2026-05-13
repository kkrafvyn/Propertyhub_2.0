const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying PropertyOwnership contract...");

  const PropertyOwnership = await hre.ethers.getContractFactory("PropertyOwnership");
  
  const ownership = await PropertyOwnership.deploy();

  await ownership.waitForDeployment();
  const ownershipAddress = await ownership.getAddress();

  console.log("PropertyOwnership deployed to:", ownershipAddress);

  const deploymentInfo = {
    network: hre.network.name,
    contractName: "PropertyOwnership",
    address: ownershipAddress,
    deployedAt: new Date().toISOString(),
    transactionHash: ownership.deploymentTransaction()?.hash,
  };

  saveDeploymentInfo("PropertyOwnership", deploymentInfo);
  updateEnvFile("VITE_PROPERTY_OWNERSHIP_ADDRESS", ownershipAddress);

  return ownershipAddress;
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
  let envContent = fs.readFileSync(envPath, "utf-8");

  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`Updated .env with ${key}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
