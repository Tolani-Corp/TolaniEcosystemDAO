/**
 * Test the TUT → uTUT conversion (which should work)
 */
require("dotenv").config();
const { ethers } = require("hardhat");

const CONTRACTS = {
  uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
  MockBridgedTUT: "0x05AbCD77f178cF43E561091f263Eaa66353Dce87",
  TUTConverter: "0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2",
};

const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

const CONVERTER_ABI = [
  "function convertToTut(uint256 amount) returns (uint256)",
  "function convertToUtut(uint256 amount) returns (uint256)",
  "function totalTutDeposited() view returns (uint256)",
  "function totalUtutMinted() view returns (uint256)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log(`\n🔄 Testing TUT → uTUT Conversion\n`);
  console.log(`Wallet: ${signer.address}`);

  const mockTUT = new ethers.Contract(CONTRACTS.MockBridgedTUT, ERC20_ABI, signer);
  const uTUT = new ethers.Contract(CONTRACTS.uTUT, ERC20_ABI, signer);
  const converter = new ethers.Contract(CONTRACTS.TUTConverter, CONVERTER_ABI, signer);

  // Check balances before
  const tutBalance = await mockTUT.balanceOf(signer.address);
  const ututBalance = await uTUT.balanceOf(signer.address);
  const deposited = await converter.totalTutDeposited();
  const minted = await converter.totalUtutMinted();

  console.log(`\n📊 BEFORE:`);
  console.log(`   TUT balance: ${ethers.formatUnits(tutBalance, 18)}`);
  console.log(`   uTUT balance: ${ethers.formatUnits(ututBalance, 6)}`);
  console.log(`   Converter totalTutDeposited: ${ethers.formatUnits(deposited, 18)}`);
  console.log(`   Converter totalUtutMinted: ${ethers.formatUnits(minted, 6)}`);

  // Convert 1000 TUT to uTUT
  const tutAmount = ethers.parseUnits("1000", 18); // 1000 TUT
  const expectedUtut = tutAmount / BigInt(10 ** 12); // = 1000 uTUT (6 decimals)

  console.log(`\n📈 Converting 1000 TUT to ~1000 uTUT...`);
  console.log(`   Expected uTUT: ${ethers.formatUnits(expectedUtut, 6)}`);

  // Approve converter
  console.log(`\n⏳ Approving converter...`);
  const approveTx = await mockTUT.approve(CONTRACTS.TUTConverter, tutAmount);
  await approveTx.wait();
  console.log(`✅ Approved`);

  // Convert
  console.log(`\n⏳ Converting TUT → uTUT...`);
  try {
    const convertTx = await converter.convertToUtut(tutAmount);
    console.log(`TX Hash: ${convertTx.hash}`);
    await convertTx.wait();
    console.log(`✅ Conversion successful!`);

    // Check balances after
    const newTutBalance = await mockTUT.balanceOf(signer.address);
    const newUtutBalance = await uTUT.balanceOf(signer.address);
    const newDeposited = await converter.totalTutDeposited();
    const newMinted = await converter.totalUtutMinted();

    console.log(`\n📊 AFTER:`);
    console.log(`   TUT balance: ${ethers.formatUnits(newTutBalance, 18)}`);
    console.log(`   uTUT balance: ${ethers.formatUnits(newUtutBalance, 6)}`);
    console.log(`   Converter totalTutDeposited: ${ethers.formatUnits(newDeposited, 18)}`);
    console.log(`   Converter totalUtutMinted: ${ethers.formatUnits(newMinted, 6)}`);

    // Now try converting back
    console.log(`\n\n🔄 Now testing uTUT → TUT conversion...`);
    const ututAmount = ethers.parseUnits("100", 6); // 100 uTUT
    
    console.log(`\n⏳ Converting 100 uTUT to TUT...`);
    const convertBackTx = await converter.convertToTut(ututAmount);
    console.log(`TX Hash: ${convertBackTx.hash}`);
    await convertBackTx.wait();
    console.log(`✅ Reverse conversion successful!`);

    // Final balances
    const finalTut = await mockTUT.balanceOf(signer.address);
    const finalUtut = await uTUT.balanceOf(signer.address);
    console.log(`\n📊 FINAL:`);
    console.log(`   TUT balance: ${ethers.formatUnits(finalTut, 18)}`);
    console.log(`   uTUT balance: ${ethers.formatUnits(finalUtut, 6)}`);

  } catch (error) {
    console.log(`\n❌ Error: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
