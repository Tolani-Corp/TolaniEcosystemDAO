/**
 * Test Base Sepolia Training Contracts
 * 
 * Tests:
 * 1. Check wallet balances (ETH, uTUT, MockBridgedTUT)
 * 2. Mint uTUT tokens
 * 3. Test TUTConverter (uTUT → MockBridgedTUT)
 * 4. Check TrainingRewards campaign status
 */

require("dotenv").config();
const { ethers } = require("hardhat");

// Base Sepolia Contract Addresses
const CONTRACTS = {
  uTUT: "0xf4758a12583F424B65CC860A2ff3D3B501cf591C",
  MockBridgedTUT: "0x05AbCD77f178cF43E561091f263Eaa66353Dce87",
  TUTConverter: "0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2",
  TrainingRewards: "0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC",
};

// ABIs (minimal for testing)
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

const UTUT_ABI = [
  ...ERC20_ABI,
  "function mint(address to, uint256 amount)",
  "function burn(uint256 amount)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function MINTER_ROLE() view returns (bytes32)",
];

const CONVERTER_ABI = [
  "function convertToTut(uint256 amount) returns (uint256)",
  "function convertToUtut(uint256 amount) returns (uint256)",
  "function CONVERSION_FACTOR() view returns (uint256)",
  "function tutToken() view returns (address)",
  "function ututToken() view returns (address)",
  "function totalTutDeposited() view returns (uint256)",
  "function totalUtutMinted() view returns (uint256)",
  "function paused() view returns (bool)",
];

const TRAINING_ABI = [
  "function campaigns(bytes32) view returns (uint256 rewardPerCompletion, uint256 budget, uint256 spent, bool active)",
  "function userCompletions(address, bytes32) view returns (bool)",
  "function CAMPAIGN_MANAGER_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
];

async function main() {
  console.log("\n🔷 BASE SEPOLIA CONTRACT TEST SUITE 🔷\n");
  console.log("=".repeat(60));

  // Get signer
  const [signer] = await ethers.getSigners();
  const wallet = signer.address;
  console.log(`📍 Wallet: ${wallet}`);

  // Check ETH balance
  const ethBalance = await ethers.provider.getBalance(wallet);
  console.log(`⛽ ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  if (ethBalance < ethers.parseEther("0.001")) {
    console.log("\n❌ Insufficient ETH! Get free Base Sepolia ETH from:");
    console.log("   https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
    console.log("   https://faucets.chain.link");
    return;
  }

  // Connect to contracts
  const uTUT = new ethers.Contract(CONTRACTS.uTUT, UTUT_ABI, signer);
  const mockTUT = new ethers.Contract(CONTRACTS.MockBridgedTUT, ERC20_ABI, signer);
  const converter = new ethers.Contract(CONTRACTS.TUTConverter, CONVERTER_ABI, signer);
  const training = new ethers.Contract(CONTRACTS.TrainingRewards, TRAINING_ABI, signer);

  console.log("\n" + "=".repeat(60));
  console.log("📊 TOKEN BALANCES");
  console.log("=".repeat(60));

  // Check token balances
  try {
    const uTUTBalance = await uTUT.balanceOf(wallet);
    const mockTUTBalance = await mockTUT.balanceOf(wallet);
    const uTUTDecimals = await uTUT.decimals();
    const mockTUTDecimals = await mockTUT.decimals();

    console.log(`🎓 uTUT Balance: ${ethers.formatUnits(uTUTBalance, uTUTDecimals)} uTUT`);
    console.log(`🪙 MockBridgedTUT Balance: ${ethers.formatUnits(mockTUTBalance, mockTUTDecimals)} MockTUT`);

    // Check converter's TUT reserve balance
    const converterTutBalance = await mockTUT.balanceOf(CONTRACTS.TUTConverter);
    console.log(`\n🏦 Converter TUT Reserve: ${ethers.formatUnits(converterTutBalance, 18)} TUT`);
    
    // Check conversion factor
    const factor = await converter.CONVERSION_FACTOR();
    console.log(`📈 Conversion Factor: 1 uTUT = ${factor.toString()} wei TUT`);
    console.log(`   (1,000,000 uTUT = 1 TUT)`);
    
    // Check converter state
    const tutTokenAddr = await converter.tutToken();
    const ututTokenAddr = await converter.ututToken();
    console.log(`\n📝 Converter Config:`);
    console.log(`   TUT Token: ${tutTokenAddr}`);
    console.log(`   uTUT Token: ${ututTokenAddr}`);

  } catch (error) {
    console.log(`❌ Error reading balances: ${error.message}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎓 TEST 1: MINT uTUT TOKENS");
  console.log("=".repeat(60));

  try {
    // Check if we have MINTER_ROLE
    const MINTER_ROLE = await uTUT.MINTER_ROLE();
    const hasMinterRole = await uTUT.hasRole(MINTER_ROLE, wallet);
    console.log(`🔑 Has MINTER_ROLE: ${hasMinterRole}`);

    if (hasMinterRole) {
      const mintAmount = ethers.parseUnits("100", 6); // 100 uTUT
      console.log(`\n⏳ Minting 100 uTUT to ${wallet}...`);
      
      const tx = await uTUT.mint(wallet, mintAmount);
      console.log(`📤 TX Hash: ${tx.hash}`);
      await tx.wait();
      console.log(`✅ Minted 100 uTUT successfully!`);

      const newBalance = await uTUT.balanceOf(wallet);
      console.log(`📊 New uTUT Balance: ${ethers.formatUnits(newBalance, 6)} uTUT`);
    } else {
      console.log(`⚠️ Wallet doesn't have MINTER_ROLE - skipping mint test`);
      console.log(`   The TrainingRewards contract should have MINTER_ROLE for automated rewards`);
    }
  } catch (error) {
    console.log(`❌ Mint Error: ${error.message}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🔄 TEST 2: uTUT → MockTUT CONVERSION");
  console.log("=".repeat(60));

  try {
    const currentUTUT = await uTUT.balanceOf(wallet);
    const converterTutBalance = await mockTUT.balanceOf(CONTRACTS.TUTConverter);
    
    console.log(`📊 Your uTUT: ${ethers.formatUnits(currentUTUT, 6)} uTUT`);
    console.log(`🏦 Converter TUT Reserve: ${ethers.formatUnits(converterTutBalance, 18)} TUT`);
    
    if (currentUTUT > 0n) {
      const convertAmount = ethers.parseUnits("10", 6); // Convert 10 uTUT
      const expectedTut = convertAmount * BigInt(10 ** 12); // 10 uTUT = 10 * 10^12 wei TUT
      
      console.log(`\n📈 Converting 10 uTUT would give: ${ethers.formatUnits(expectedTut, 18)} TUT`);
      
      // Check if converter has enough TUT
      if (converterTutBalance < expectedTut) {
        console.log(`\n⚠️ Converter doesn't have enough TUT reserve!`);
        console.log(`   Needed: ${ethers.formatUnits(expectedTut, 18)} TUT`);
        console.log(`   Available: ${ethers.formatUnits(converterTutBalance, 18)} TUT`);
        console.log(`\n💡 The converter needs TUT deposited before uTUT→TUT conversions work.`);
        console.log(`   Solution: Fund the converter with MockBridgedTUT tokens`);
        
        // Let's fund the converter
        console.log(`\n⏳ Funding converter with 1000 TUT from your balance...`);
        const fundAmount = ethers.parseUnits("1000", 18);
        const transferTx = await mockTUT.transfer(CONTRACTS.TUTConverter, fundAmount);
        await transferTx.wait();
        console.log(`✅ Funded converter with 1000 TUT!`);
        
        // Now try conversion
        console.log(`\n⏳ Converting 10 uTUT to TUT...`);
        const convertTx = await converter.convertToTut(convertAmount);
        console.log(`📤 TX Hash: ${convertTx.hash}`);
        await convertTx.wait();
        console.log(`✅ Conversion successful!`);
      } else {
        console.log(`\n⏳ Converting 10 uTUT to TUT...`);
        const convertTx = await converter.convertToTut(convertAmount);
        console.log(`📤 TX Hash: ${convertTx.hash}`);
        await convertTx.wait();
        console.log(`✅ Conversion successful!`);
      }

      const newUTUT = await uTUT.balanceOf(wallet);
      const newMockTUT = await mockTUT.balanceOf(wallet);
      console.log(`📊 New uTUT Balance: ${ethers.formatUnits(newUTUT, 6)} uTUT`);
      console.log(`📊 New MockTUT Balance: ${ethers.formatUnits(newMockTUT, 18)} MockTUT`);
    } else {
      console.log(`⚠️ No uTUT balance to convert - skipping conversion test`);
    }
  } catch (error) {
    console.log(`❌ Conversion Error: ${error.message}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🏆 TEST 3: TRAINING REWARDS STATUS");
  console.log("=".repeat(60));

  try {
    // Check campaign IDs
    const campaignIds = {
      CONSTRUCTION: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_CONSTRUCTION_TECH_V1")),
      AI_CLOUD: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_AI_CLOUD_V1")),
      ESG: ethers.keccak256(ethers.toUtf8Bytes("TOLANI_ESG_TRACK_V1")),
    };

    console.log("\n📋 Campaign Status:");
    for (const [name, id] of Object.entries(campaignIds)) {
      try {
        const campaign = await training.campaigns(id);
        const [rewardPerCompletion, budget, spent, active] = campaign;
        
        console.log(`\n   ${name}:`);
        console.log(`   - Reward: ${ethers.formatUnits(rewardPerCompletion, 6)} uTUT`);
        console.log(`   - Budget: ${ethers.formatUnits(budget, 6)} uTUT`);
        console.log(`   - Spent: ${ethers.formatUnits(spent, 6)} uTUT`);
        console.log(`   - Active: ${active}`);
      } catch (e) {
        console.log(`   ${name}: Not configured yet`);
      }
    }

    // Check manager role
    const MANAGER_ROLE = await training.CAMPAIGN_MANAGER_ROLE();
    const hasManagerRole = await training.hasRole(MANAGER_ROLE, wallet);
    console.log(`\n🔑 Has CAMPAIGN_MANAGER_ROLE: ${hasManagerRole}`);

  } catch (error) {
    console.log(`❌ Training Rewards Error: ${error.message}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ TEST SUITE COMPLETE");
  console.log("=".repeat(60));
  console.log("\n📍 Contract Addresses (Base Sepolia):");
  console.log(`   uTUT: ${CONTRACTS.uTUT}`);
  console.log(`   MockBridgedTUT: ${CONTRACTS.MockBridgedTUT}`);
  console.log(`   TUTConverter: ${CONTRACTS.TUTConverter}`);
  console.log(`   TrainingRewards: ${CONTRACTS.TrainingRewards}`);
  console.log("\n🔗 View on BaseScan: https://sepolia.basescan.org/address/" + CONTRACTS.uTUT);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
