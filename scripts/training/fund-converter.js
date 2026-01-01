/**
 * Fund TUTConverter with TUT tokens
 */
const { ethers } = require("hardhat");

const MOCK_TUT = "0x05AbCD77f178cF43E561091f263Eaa66353Dce87";
const CONVERTER = "0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2";

async function main() {
  const [signer] = await ethers.getSigners();
  
  console.log("Funding TUTConverter with TUT...\n");
  
  const mockTUT = await ethers.getContractAt("MockBridgedTUT", MOCK_TUT);
  
  // Check deployer balance
  const balance = await mockTUT.balanceOf(signer.address);
  console.log(`Deployer TUT balance: ${ethers.formatEther(balance)}`);
  
  // Transfer 1M TUT to converter
  const amount = ethers.parseEther("1000000");
  console.log(`\nTransferring 1,000,000 TUT to converter...`);
  
  const tx = await mockTUT.transfer(CONVERTER, amount);
  console.log(`TX: ${tx.hash}`);
  await tx.wait(2);
  
  // Verify
  const converterBalance = await mockTUT.balanceOf(CONVERTER);
  console.log(`\n✅ Converter TUT balance: ${ethers.formatEther(converterBalance)} TUT`);
}

main().catch(console.error);
