const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying PropertyToken contract...");

  const PropertyToken = await hre.ethers.getContractFactory("PropertyToken");
  
  const token = await PropertyToken.deploy(
    "BaytMiftah Token", // name
    "PROP", // symbol
    ethers.parseEther("1000000"), // 1M tokens initial supply
    18, // decimals
    "PROP-001", // propertyId
    ethers.parseEther("500000") // 500k MATIC property value
  );

  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log("PropertyToken deployed to:", tokenAddress);

  // Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    contractName: "PropertyToken",
    address: tokenAddress,
    deployedAt: new Date().toISOString(),
    transactionHash: token.deploymentTransaction()?.hash,
  };

  saveDeploymentInfo("PropertyToken", deploymentInfo);
  updateEnvFile("VITE_PROPERTY_TOKEN_ADDRESS", tokenAddress);

  return tokenAddress;
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
