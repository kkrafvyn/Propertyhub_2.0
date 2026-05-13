const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying PropertyEscrow contract...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const PropertyEscrow = await hre.ethers.getContractFactory("PropertyEscrow");
  
  const escrow = await PropertyEscrow.deploy(deployer.address);

  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();

  console.log("PropertyEscrow deployed to:", escrowAddress);

  const deploymentInfo = {
    network: hre.network.name,
    contractName: "PropertyEscrow",
    address: escrowAddress,
    escrowAgent: deployer.address,
    deployedAt: new Date().toISOString(),
    transactionHash: escrow.deploymentTransaction()?.hash,
  };

  saveDeploymentInfo("PropertyEscrow", deploymentInfo);
  updateEnvFile("VITE_PROPERTY_ESCROW_ADDRESS", escrowAddress);

  return escrowAddress;
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
