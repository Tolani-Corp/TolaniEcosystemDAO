/**
 * Deploy TUT Converter to Base L2
 * 
 * For testnet: Creates a mock bridged TUT and deploys TUTConverter
 * For mainnet: Would use actual bridge (Superbridge, etc.)
 * 
 * Usage:
 *   npx hardhat run scripts/training/deploy-tut-converter-base.js --network baseSepolia
 */

const { ethers } = require("hardhat");

// Base Sepolia addresses
const CONTRACTS = {
  uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C"
};

// Mock TUT for testing (ERC20 with 18 decimals)
const MOCK_TUT_BYTECODE = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockBridgedTUT is ERC20, Ownable {
    constructor() ERC20("Bridged TUT Token", "TUT") Ownable(msg.sender) {
        // Mint 10M TUT for testing
        _mint(msg.sender, 10_000_000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
`;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("=".repeat(60));
  console.log("DEPLOY TUT CONVERTER TO BASE L2");
  console.log("=".repeat(60));
  console.log(`Network: Base Sepolia (${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("");

  // Step 1: Deploy Mock Bridged TUT (for testnet)
  console.log("1️⃣  Deploying Mock Bridged TUT Token...");
  
  // Get the MockBridgedTUT factory
  const MockTUT = await ethers.getContractFactory("MockBridgedTUT");
  const mockTUT = await MockTUT.deploy();
  const deployTx = await mockTUT.deploymentTransaction();
  console.log(`   ⏳ Waiting for confirmation... (tx: ${deployTx.hash.slice(0, 10)}...)`);
  await deployTx.wait(2); // Wait for 2 confirmations
  
  const mockTUTAddress = await mockTUT.getAddress();
  console.log(`   ✅ MockBridgedTUT: ${mockTUTAddress}`);
  
  // Wait a bit for RPC to sync
  await new Promise(r => setTimeout(r, 3000));
  
  const tutBalance = await mockTUT.balanceOf(deployer.address);
  console.log(`   💰 Deployer TUT: ${ethers.formatEther(tutBalance)} TUT`);

  // Step 2: Deploy TUTConverterSimple
  console.log("\n2️⃣  Deploying TUTConverterSimple...");
  
  const TUTConverter = await ethers.getContractFactory("TUTConverterSimple");
  const converter = await TUTConverter.deploy(
    deployer.address,    // admin
    mockTUTAddress,      // TUT token
    CONTRACTS.uTUT       // uTUT token
  );
  const converterTx = await converter.deploymentTransaction();
  console.log(`   ⏳ Waiting for confirmation... (tx: ${converterTx.hash.slice(0, 10)}...)`);
  await converterTx.wait(2);
  
  const converterAddress = await converter.getAddress();
  console.log(`   ✅ TUTConverter: ${converterAddress}`);
  
  await new Promise(r => setTimeout(r, 2000));

  // Step 3: Fund converter with TUT for redemptions
  console.log("\n3️⃣  Funding converter with TUT...");
  
  const fundAmount = ethers.parseEther("1000000"); // 1M TUT
  const approveTx = await mockTUT.approve(converterAddress, fundAmount);
  await approveTx.wait();
  
  // Transfer TUT to converter for redemptions
  const transferTx = await mockTUT.transfer(converterAddress, fundAmount);
  await transferTx.wait();
  
  const converterTUTBalance = await mockTUT.balanceOf(converterAddress);
  console.log(`   ✅ Converter TUT Balance: ${ethers.formatEther(converterTUTBalance)} TUT`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log("");
  console.log("📋 Contract Addresses:");
  console.log(`   MockBridgedTUT: ${mockTUTAddress}`);
  console.log(`   TUTConverter:   ${converterAddress}`);
  console.log(`   uTUT:           ${CONTRACTS.uTUT}`);
  console.log("");
  console.log("📊 Conversion Rate:");
  console.log("   1,000,000 uTUT (6 decimals) = 1 TUT (18 decimals)");
  console.log("");
  console.log("📝 Verify Commands:");
  console.log(`   npx hardhat verify --network baseSepolia ${mockTUTAddress}`);
  console.log(`   npx hardhat verify --network baseSepolia ${converterAddress} "${deployer.address}" "${mockTUTAddress}" "${CONTRACTS.uTUT}"`);
  
  // Save addresses
  const fs = require("fs");
  const deployment = {
    network: "baseSepolia",
    chainId: Number(network.chainId),
    timestamp: new Date().toISOString(),
    contracts: {
      MockBridgedTUT: mockTUTAddress,
      TUTConverter: converterAddress,
      uTUT: CONTRACTS.uTUT
    }
  };
  
  fs.writeFileSync(
    `./deployments/baseSepolia-tut-converter-${Date.now()}.json`,
    JSON.stringify(deployment, null, 2)
  );
  console.log("\n💾 Deployment saved to ./deployments/");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
