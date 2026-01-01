/**
 * Fix TUTConverter accounting - deposit TUT properly
 */
require("dotenv").config();
const { ethers } = require("hardhat");

const CONVERTER_ADDRESS = "0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2";
const MOCK_TUT_ADDRESS = "0x05AbCD77f178cF43E561091f263Eaa66353Dce87";

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
];

const CONVERTER_ABI = [
  "function depositTut(uint256 amount) external",
  "function totalTutDeposited() view returns (uint256)",
  "function totalUtutMinted() view returns (uint256)",
  "function tutToken() view returns (address)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`\n🔧 Fixing TUTConverter Accounting...\n`);
  
  const mockTUT = new ethers.Contract(MOCK_TUT_ADDRESS, ERC20_ABI, signer);
  const converter = new ethers.Contract(CONVERTER_ADDRESS, CONVERTER_ABI, signer);

  // Check current state
  const converterBalance = await mockTUT.balanceOf(CONVERTER_ADDRESS);
  const totalDeposited = await converter.totalTutDeposited();
  const totalMinted = await converter.totalUtutMinted();

  console.log(`Current converter TUT balance: ${ethers.formatUnits(converterBalance, 18)}`);
  console.log(`Recorded totalTutDeposited: ${ethers.formatUnits(totalDeposited, 18)}`);
  console.log(`Recorded totalUtutMinted: ${ethers.formatUnits(totalMinted, 6)}`);

  // If there's TUT in the converter but not recorded, we have a problem
  // The solution is to use depositTut properly
  
  // First, let's withdraw the untracked TUT if possible, or just deposit fresh TUT
  // The simplest fix: deposit more TUT through the proper channel
  
  const depositAmount = ethers.parseUnits("1000000", 18); // 1M TUT
  console.log(`\n⏳ Approving converter to spend TUT...`);
  const approveTx = await mockTUT.approve(CONVERTER_ADDRESS, depositAmount);
  await approveTx.wait();
  console.log(`✅ Approved`);

  console.log(`\n⏳ Depositing 1M TUT through depositTut()...`);
  const depositTx = await converter.depositTut(depositAmount);
  console.log(`TX Hash: ${depositTx.hash}`);
  await depositTx.wait();
  console.log(`✅ Deposited!`);

  // Check new state
  const newBalance = await mockTUT.balanceOf(CONVERTER_ADDRESS);
  const newDeposited = await converter.totalTutDeposited();
  console.log(`\nNew converter TUT balance: ${ethers.formatUnits(newBalance, 18)}`);
  console.log(`New totalTutDeposited: ${ethers.formatUnits(newDeposited, 18)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
