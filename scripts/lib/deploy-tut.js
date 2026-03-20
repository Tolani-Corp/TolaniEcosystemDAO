const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

const DEFAULT_INITIAL_SUPPLY = ethers.parseEther("50000000");
const DEFAULT_MAX_CAP = ethers.parseEther("100000000");
const DEFAULT_TRUSTED_FORWARDER = "0x000000000000000000000000000000000000dEaD";

function resolveConfig(overrides = {}) {
  return {
    owner: overrides.owner,
    trustedForwarder: overrides.trustedForwarder,
    initialSupply: overrides.initialSupply ?? DEFAULT_INITIAL_SUPPLY,
    maxCap: overrides.maxCap ?? DEFAULT_MAX_CAP,
  };
}

async function deployCanonicalTUT(overrides = {}) {
  const [signer] = await ethers.getSigners();
  const config = resolveConfig(overrides);
  const owner = config.owner ?? signer.address;
  const trustedForwarder = config.trustedForwarder ?? DEFAULT_TRUSTED_FORWARDER;

  const TUTToken = await ethers.getContractFactory("TUTToken");
  const implementation = await TUTToken.deploy(trustedForwarder);
  await implementation.waitForDeployment();

  const implementationAddress = await implementation.getAddress();
  const initData = TUTToken.interface.encodeFunctionData("initialize", [
    owner,
    config.initialSupply,
    config.maxCap,
    trustedForwarder,
  ]);

  const ERC1967Proxy = await ethers.getContractFactory("ERC1967Proxy");
  const proxy = await ERC1967Proxy.deploy(implementationAddress, initData);
  await proxy.waitForDeployment();

  const proxyAddress = await proxy.getAddress();
  const token = TUTToken.attach(proxyAddress);

  return {
    token,
    owner,
    trustedForwarder,
    implementationAddress,
    proxyAddress,
    initialSupply: config.initialSupply,
    maxCap: config.maxCap,
  };
}

function saveDeploymentManifest(label, deployment, directory = "deployments") {
  const outputDir = path.join(process.cwd(), directory);
  fs.mkdirSync(outputDir, { recursive: true });

  const manifest = {
    label,
    network: network.name,
    owner: deployment.owner,
    trustedForwarder: deployment.trustedForwarder,
    implementationAddress: deployment.implementationAddress,
    proxyAddress: deployment.proxyAddress,
    initialSupply: deployment.initialSupply.toString(),
    maxCap: deployment.maxCap.toString(),
    createdAt: new Date().toISOString(),
  };

  const fileName = `${label}-${network.name}.json`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, JSON.stringify(manifest, null, 2));
  return filePath;
}

module.exports = {
  DEFAULT_INITIAL_SUPPLY,
  DEFAULT_MAX_CAP,
  DEFAULT_TRUSTED_FORWARDER,
  deployCanonicalTUT,
  saveDeploymentManifest,
};
