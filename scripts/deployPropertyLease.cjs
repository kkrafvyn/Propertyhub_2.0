const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying PropertyLease contract...");

  const PropertyLease = await hre.ethers.getContractFactory("PropertyLease");
  
  const lease = await PropertyLease.deploy();

  await lease.waitForDeployment();
  const leaseAddress = await lease.getAddress();

  console.log("PropertyLease deployed to:", leaseAddress);

  const deploymentInfo = {
    network: hre.network.name,
    contractName: "PropertyLease",
    address: leaseAddress,
    deployedAt: new Date().toISOString(),
    transactionHash: lease.deploymentTransaction()?.hash,
  };

  saveDeploymentInfo("PropertyLease", deploymentInfo);
  updateEnvFile("VITE_PROPERTY_LEASE_ADDRESS", leaseAddress);

  return leaseAddress;
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
