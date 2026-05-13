const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("========================================");
  console.log("  Deploying All Property Hub Contracts");
  console.log("========================================\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Network:", hre.network.name, "\n");

  const deployments = {};

  console.log("1. Deploying PropertyToken...");
  const PropertyToken = await hre.ethers.getContractFactory("PropertyToken");
  const token = await PropertyToken.deploy(
    "Property Hub Token",
    "PROP",
    hre.ethers.parseEther("1000000"),
    18,
    "PROP-001",
    hre.ethers.parseEther("500000"),
  );
  await token.waitForDeployment();
  deployments.propertyToken = await token.getAddress();
  console.log("OK PropertyToken:", deployments.propertyToken, "\n");

  console.log("2. Deploying PropertyEscrow...");
  const PropertyEscrow = await hre.ethers.getContractFactory("PropertyEscrow");
  const escrow = await PropertyEscrow.deploy(deployer.address);
  await escrow.waitForDeployment();
  deployments.propertyEscrow = await escrow.getAddress();
  console.log("OK PropertyEscrow:", deployments.propertyEscrow, "\n");

  console.log("3. Deploying PropertyOwnership...");
  const PropertyOwnership = await hre.ethers.getContractFactory("PropertyOwnership");
  const ownership = await PropertyOwnership.deploy();
  await ownership.waitForDeployment();
  deployments.propertyOwnership = await ownership.getAddress();
  console.log("OK PropertyOwnership:", deployments.propertyOwnership, "\n");

  console.log("4. Deploying PropertyLease...");
  const PropertyLease = await hre.ethers.getContractFactory("PropertyLease");
  const lease = await PropertyLease.deploy();
  await lease.waitForDeployment();
  deployments.propertyLease = await lease.getAddress();
  console.log("OK PropertyLease:", deployments.propertyLease, "\n");

  console.log("5. Deploying VerificationRegistry...");
  const VerificationRegistry = await hre.ethers.getContractFactory("VerificationRegistry");
  const verificationRegistry = await VerificationRegistry.deploy();
  await verificationRegistry.waitForDeployment();
  deployments.verificationRegistry = await verificationRegistry.getAddress();
  console.log("OK VerificationRegistry:", deployments.verificationRegistry, "\n");

  saveAllDeployments(deployments);
  updateEnvFile(deployments);

  console.log("========================================");
  console.log("  All contracts deployed successfully!");
  console.log("========================================\n");

  console.log("DEPLOYMENT SUMMARY:");
  console.log("-------------------");
  for (const [name, address] of Object.entries(deployments)) {
    console.log(`${name}: ${address}`);
  }
}

function saveAllDeployments(deployments) {
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const allDeployments = {
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
    contracts: deployments,
  };

  const filePath = path.join(deploymentsDir, "all_deployments.json");
  fs.writeFileSync(filePath, JSON.stringify(allDeployments, null, 2));
  console.log("All deployment info saved to", filePath, "\n");
}

function updateEnvFile(deployments) {
  const envPath = path.join(__dirname, "../.env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  let envContent = fs.readFileSync(envPath, "utf-8");

  const mapping = {
    propertyToken: "VITE_PROPERTY_TOKEN_ADDRESS",
    propertyEscrow: "VITE_PROPERTY_ESCROW_ADDRESS",
    propertyOwnership: "VITE_PROPERTY_OWNERSHIP_ADDRESS",
    propertyLease: "VITE_PROPERTY_LEASE_ADDRESS",
    verificationRegistry: "VITE_VERIFICATION_REGISTRY_ADDRESS",
  };

  for (const [key, value] of Object.entries(deployments)) {
    const envKey = mapping[key];
    if (!envKey) {
      continue;
    }

    const regex = new RegExp(`^${envKey}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${envKey}=${value}`);
    } else {
      envContent += `\n${envKey}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent);
  console.log("Updated .env with all contract addresses\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
