#!/usr/bin/env node
/**
 * TUT Liquidity Pool Setup Script
 * Tolani Ecosystem DAO
 * 
 * This script deploys initial liquidity to Uniswap V3.
 * Target: Late 2026 with $20K-$30K USD equivalent
 * 
 * Usage:
 *   npx hardhat run scripts/tokenomics/setup-liquidity.js --network <network>
 * 
 * Prerequisites:
 * - TUT tokens minted and available
 * - ETH/USDC available for pairing
 * - Uniswap V3 contracts accessible on network
 */

const { ethers } = require("hardhat");
const { LIQUIDITY_CONFIG, WALLETS } = require("./config");

// Uniswap V3 addresses (mainnet/testnet)
const UNISWAP_ADDRESSES = {
  // Mainnet
  1: {
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    positionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    swapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  // Sepolia
  11155111: {
    factory: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c",
    positionManager: "0x1238536071E1c677A632429e3655c799b22cDA52",
    swapRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
    WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Circle's testnet USDC
  },
};

// Uniswap V3 Pool Fee Tiers
const FEE_TIERS = {
  LOWEST: 100,    // 0.01% - stablecoins
  LOW: 500,       // 0.05% - stable pairs
  MEDIUM: 3000,   // 0.30% - most pairs (recommended for new tokens)
  HIGH: 10000,    // 1.00% - exotic pairs
};

async function main() {
  console.log("\n💧 TUT Liquidity Pool Setup");
  console.log("============================\n");
  
  // Get network info
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const [deployer] = await ethers.getSigners();
  
  console.log(`Network:  ${network.name} (Chain ID: ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  
  // Get Uniswap addresses for this network
  const uniswap = UNISWAP_ADDRESSES[chainId];
  if (!uniswap) {
    console.error(`❌ Uniswap not configured for chain ${chainId}`);
    process.exit(1);
  }
  
  // Safety check for mainnet
  if (chainId === 1) {
    console.log("\n⚠️  MAINNET LIQUIDITY DEPLOYMENT!");
    console.log("    This will deploy real funds!");
    console.log("    Remove this check when ready.\n");
    process.exit(1);
  }
  
  // Get token address
  const tokenAddress = process.env.TUT_TOKEN_ADDRESS;
  if (!tokenAddress) {
    console.error("❌ TUT_TOKEN_ADDRESS not set!");
    process.exit(1);
  }
  
  // Print configuration
  console.log(`\n📊 Liquidity Configuration:`);
  console.log(`   TUT Allocation: ${ethers.formatEther(LIQUIDITY_CONFIG.tutAllocation)} TUT`);
  console.log(`   Target USD:     $${LIQUIDITY_CONFIG.targetUSD.toLocaleString()}`);
  console.log(`   ETH Price:      $${LIQUIDITY_CONFIG.ethPrice}`);
  console.log(`   ETH Required:   ~${LIQUIDITY_CONFIG.ethRequired.toFixed(4)} ETH`);
  console.log(`   TUT Price:      $${LIQUIDITY_CONFIG.tutPrice.toFixed(4)}`);
  console.log(`   Initial FDV:    $${LIQUIDITY_CONFIG.initialFDV.toLocaleString()}`);
  
  // Get contracts
  const TUT = await ethers.getContractAt("IERC20", tokenAddress);
  const WETH = await ethers.getContractAt("IERC20", uniswap.WETH);
  
  // Check balances
  const tutBalance = await TUT.balanceOf(deployer.address);
  const ethBalance = await ethers.provider.getBalance(deployer.address);
  
  console.log(`\n💰 Available Balances:`);
  console.log(`   TUT: ${ethers.formatEther(tutBalance)}`);
  console.log(`   ETH: ${ethers.formatEther(ethBalance)}`);
  
  const requiredTUT = LIQUIDITY_CONFIG.tutAllocation;
  const requiredETH = ethers.parseEther(LIQUIDITY_CONFIG.ethRequired.toFixed(18));
  
  if (tutBalance < requiredTUT) {
    console.error(`\n❌ Insufficient TUT!`);
    console.error(`   Have: ${ethers.formatEther(tutBalance)} TUT`);
    console.error(`   Need: ${ethers.formatEther(requiredTUT)} TUT`);
    process.exit(1);
  }
  
  if (ethBalance < requiredETH) {
    console.error(`\n❌ Insufficient ETH!`);
    console.error(`   Have: ${ethers.formatEther(ethBalance)} ETH`);
    console.error(`   Need: ${ethers.formatEther(requiredETH)} ETH`);
    process.exit(1);
  }
  
  console.log(`\n✅ Sufficient balances for liquidity deployment`);
  
  // Position Manager ABI (minimal)
  const positionManagerABI = [
    "function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96) external payable returns (address pool)",
    "function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline)) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)",
  ];
  
  const positionManager = new ethers.Contract(
    uniswap.positionManager,
    positionManagerABI,
    deployer
  );
  
  // Calculate sqrtPriceX96 for initial price
  // Price = TUT/WETH (how much WETH for 1 TUT)
  // At $0.0125 TUT and $3500 ETH: 1 TUT = 0.0125/3500 = 0.00000357 ETH
  const tutPriceInETH = LIQUIDITY_CONFIG.tutPrice / LIQUIDITY_CONFIG.ethPrice;
  console.log(`\n📐 Price Calculation:`);
  console.log(`   1 TUT = ${tutPriceInETH.toFixed(10)} ETH`);
  
  // Determine token ordering (Uniswap requires token0 < token1 by address)
  const [token0, token1] = tokenAddress.toLowerCase() < uniswap.WETH.toLowerCase()
    ? [tokenAddress, uniswap.WETH]
    : [uniswap.WETH, tokenAddress];
  
  const isTUTToken0 = token0.toLowerCase() === tokenAddress.toLowerCase();
  console.log(`   Token0: ${isTUTToken0 ? 'TUT' : 'WETH'} (${token0})`);
  console.log(`   Token1: ${isTUTToken0 ? 'WETH' : 'TUT'} (${token1})`);
  
  // Calculate sqrtPriceX96
  // sqrtPriceX96 = sqrt(price) * 2^96
  // price = token1/token0
  let price;
  if (isTUTToken0) {
    // price = WETH/TUT = how much WETH per TUT
    price = tutPriceInETH;
  } else {
    // price = TUT/WETH = how much TUT per WETH
    price = 1 / tutPriceInETH;
  }
  
  const sqrtPrice = Math.sqrt(price);
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * (2 ** 96)));
  console.log(`   sqrtPriceX96: ${sqrtPriceX96}`);
  
  // Display deployment plan
  console.log(`\n📋 Deployment Plan:`);
  console.log(`   1. Wrap ETH to WETH`);
  console.log(`   2. Approve TUT and WETH for Position Manager`);
  console.log(`   3. Create TUT/WETH pool (${FEE_TIERS.MEDIUM / 10000}% fee tier)`);
  console.log(`   4. Add initial liquidity`);
  
  console.log(`\n⏳ Starting in 5 seconds... (Ctrl+C to cancel)`);
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 1: Wrap ETH
  console.log(`\n🔄 Step 1: Wrapping ETH to WETH...`);
  const WETH_ABI = ["function deposit() payable", "function approve(address, uint256) returns (bool)"];
  const wethContract = new ethers.Contract(uniswap.WETH, WETH_ABI, deployer);
  
  const wrapTx = await wethContract.deposit({ value: requiredETH });
  await wrapTx.wait();
  console.log(`   ✅ Wrapped ${ethers.formatEther(requiredETH)} ETH to WETH`);
  
  // Step 2: Approve tokens
  console.log(`\n🔄 Step 2: Approving tokens...`);
  
  const tutApproveTx = await TUT.approve(uniswap.positionManager, requiredTUT);
  await tutApproveTx.wait();
  console.log(`   ✅ Approved TUT`);
  
  const wethApproveTx = await wethContract.approve(uniswap.positionManager, requiredETH);
  await wethApproveTx.wait();
  console.log(`   ✅ Approved WETH`);
  
  // Step 3: Create pool
  console.log(`\n🔄 Step 3: Creating pool...`);
  
  try {
    const createPoolTx = await positionManager.createAndInitializePoolIfNecessary(
      token0,
      token1,
      FEE_TIERS.MEDIUM,
      sqrtPriceX96
    );
    const poolReceipt = await createPoolTx.wait();
    console.log(`   ✅ Pool created/initialized`);
    console.log(`   TX: ${poolReceipt.hash}`);
  } catch (error) {
    if (error.message.includes("already initialized")) {
      console.log(`   ⚠️  Pool already exists, continuing...`);
    } else {
      throw error;
    }
  }
  
  // Step 4: Add liquidity
  console.log(`\n🔄 Step 4: Adding liquidity...`);
  
  // Full range ticks for 0.3% fee tier
  const tickSpacing = 60; // for 0.3% fee
  const tickLower = -887220; // MIN_TICK rounded to tick spacing
  const tickUpper = 887220;  // MAX_TICK rounded to tick spacing
  
  const amount0Desired = isTUTToken0 ? requiredTUT : requiredETH;
  const amount1Desired = isTUTToken0 ? requiredETH : requiredTUT;
  
  const mintParams = {
    token0,
    token1,
    fee: FEE_TIERS.MEDIUM,
    tickLower,
    tickUpper,
    amount0Desired,
    amount1Desired,
    amount0Min: 0, // Accept any amount for testnet
    amount1Min: 0,
    recipient: deployer.address,
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };
  
  try {
    const mintTx = await positionManager.mint(mintParams);
    const mintReceipt = await mintTx.wait();
    console.log(`   ✅ Liquidity added!`);
    console.log(`   TX: ${mintReceipt.hash}`);
  } catch (error) {
    console.error(`   ❌ Failed to add liquidity: ${error.message}`);
    throw error;
  }
  
  console.log(`\n✅ Liquidity Pool Setup Complete!`);
  console.log(`\n📊 Summary:`);
  console.log(`   Pool:     TUT/WETH (0.3% fee)`);
  console.log(`   TUT:      ${ethers.formatEther(requiredTUT)}`);
  console.log(`   WETH:     ${ethers.formatEther(requiredETH)}`);
  console.log(`   Price:    $${LIQUIDITY_CONFIG.tutPrice.toFixed(4)} per TUT`);
  console.log(`   TVL:      ~$${(LIQUIDITY_CONFIG.targetUSD * 2).toLocaleString()}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
