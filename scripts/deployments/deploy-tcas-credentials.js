/**
 * Deploy TCAS non-transferable ecosystem credential contract.
 *
 * Usage:
 *   npx hardhat run scripts/deployments/deploy-tcas-credentials.js --network baseSepolia
 *   npx hardhat run scripts/deployments/deploy-tcas-credentials.js --network base
 *
 * Optional env:
 *   TCAS_ADMIN_ADDRESS=0x...
 *   TCAS_ISSUER_ADDRESS=0x...
 *   TCAS_ISSUER_TYPE="Tolani Foundation"
 *   TCAS_REVOKER_ADDRESS=0x...
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  const chain = await ethers.provider.getNetwork();
  const adminAddress = process.env.TCAS_ADMIN_ADDRESS || deployer.address;
  const issuerAddress = process.env.TCAS_ISSUER_ADDRESS || "";
  const issuerType = process.env.TCAS_ISSUER_TYPE || "Tolani Credential Authority";
  const revokerAddress = process.env.TCAS_REVOKER_ADDRESS || "";

  console.log("\n" + "=".repeat(64));
  console.log("TCAS CREDENTIAL CONTRACT DEPLOYMENT");
  console.log("=".repeat(64));
  console.log(`Network:  ${network.name} (${chain.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Admin:    ${adminAddress}`);

  const Credential = await ethers.getContractFactory("TolaniEcosystemNFT");
  const credential = await Credential.deploy(adminAddress);
  await credential.waitForDeployment();
  const credentialAddress = await credential.getAddress();

  console.log(`\nTolaniEcosystemNFT: ${credentialAddress}`);

  if (issuerAddress) {
    const tx = await credential.approveIssuer(issuerAddress, issuerType);
    await tx.wait();
    console.log(`Issuer approved: ${issuerAddress} (${issuerType})`);
  }

  if (revokerAddress) {
    const role = await credential.REVOKER_ROLE();
    const tx = await credential.grantRole(role, revokerAddress);
    await tx.wait();
    console.log(`Revoker role granted: ${revokerAddress}`);
  }

  const output = {
    network: network.name,
    chainId: Number(chain.chainId),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    admin: adminAddress,
    TolaniEcosystemNFT: credentialAddress,
    optionalIssuer: issuerAddress || null,
    optionalIssuerType: issuerAddress ? issuerType : null,
    optionalRevoker: revokerAddress || null,
  };

  const outputDir = path.join(__dirname, "..", "..", "deployments");
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${network.name}-tcas-credentials-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nDeployment record: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
