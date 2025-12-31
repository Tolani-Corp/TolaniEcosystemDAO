const { ethers } = require("hardhat");

// Existing contract addresses (Sepolia)
const EXISTING_CONTRACTS = {
  tutToken: "0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6",
  governor: "0x1aB158036C5cdb5ACcfb0ae1B390A7E89273C86f",
  timelock: "0x9d0ccD1371B3a1f570B353c46840C268Aac57872",
  treasury: "0xBB9d207ee665e9680458F2E451098f23D707Ad25",
};

// Uniswap V3 addresses
const UNISWAP_V3 = {
  // Sepolia testnet
  sepolia: {
    positionManager: "0x1238536071E1c677A632429e3655c799b22cDA52",
    factory: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c",
    WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  },
  // Mainnet
  mainnet: {
    positionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
    factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  }
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying DeFi contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Detect network
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const networkName = chainId === 1 ? "mainnet" : "sepolia";
  console.log("Network:", networkName, "(chainId:", chainId, ")");

  const uniswapAddresses = networkName === "mainnet" ? UNISWAP_V3.mainnet : UNISWAP_V3.sepolia;

  // ============ Deploy LiquidityManager ============
  console.log("\n--- Deploying LiquidityManager ---");
  const LiquidityManager = await ethers.getContractFactory("LiquidityManager");
  const liquidityManager = await LiquidityManager.deploy(
    EXISTING_CONTRACTS.tutToken,
    uniswapAddresses.positionManager,
    uniswapAddresses.factory,
    EXISTING_CONTRACTS.timelock
  );
  await liquidityManager.waitForDeployment();
  const liquidityManagerAddr = await liquidityManager.getAddress();
  console.log("LiquidityManager deployed to:", liquidityManagerAddr);

  // ============ Deploy StakingPool ============
  console.log("\n--- Deploying StakingPool ---");
  const StakingPool = await ethers.getContractFactory("StakingPool");
  const stakingPool = await StakingPool.deploy(
    EXISTING_CONTRACTS.tutToken,
    EXISTING_CONTRACTS.timelock
  );
  await stakingPool.waitForDeployment();
  const stakingPoolAddr = await stakingPool.getAddress();
  console.log("StakingPool deployed to:", stakingPoolAddr);

  // ============ Deploy LiquidityIncentives ============
  console.log("\n--- Deploying LiquidityIncentives ---");
  const rewardPerSecond = ethers.parseEther("1"); // 1 TUT per second
  const startTime = Math.floor(Date.now() / 1000);
  const duration = 365 * 24 * 60 * 60; // 1 year

  const LiquidityIncentives = await ethers.getContractFactory("LiquidityIncentives");
  const liquidityIncentives = await LiquidityIncentives.deploy(
    EXISTING_CONTRACTS.tutToken,
    rewardPerSecond,
    startTime,
    duration,
    EXISTING_CONTRACTS.timelock
  );
  await liquidityIncentives.waitForDeployment();
  const liquidityIncentivesAddr = await liquidityIncentives.getAddress();
  console.log("LiquidityIncentives deployed to:", liquidityIncentivesAddr);

  // ============ Summary ============
  console.log("\n========================================");
  console.log("DeFi Contracts Deployment Summary");
  console.log("========================================");
  console.log("Network:", networkName);
  console.log("");
  console.log("Deployed Contracts:");
  console.log("  LiquidityManager:", liquidityManagerAddr);
  console.log("  StakingPool:", stakingPoolAddr);
  console.log("  LiquidityIncentives:", liquidityIncentivesAddr);
  console.log("");
  console.log("Existing Contracts:");
  console.log("  TUT Token:", EXISTING_CONTRACTS.tutToken);
  console.log("  Governor:", EXISTING_CONTRACTS.governor);
  console.log("  Timelock:", EXISTING_CONTRACTS.timelock);
  console.log("  Treasury:", EXISTING_CONTRACTS.treasury);
  console.log("");
  console.log("Uniswap V3 Addresses:");
  console.log("  Position Manager:", uniswapAddresses.positionManager);
  console.log("  Factory:", uniswapAddresses.factory);
  console.log("  WETH:", uniswapAddresses.WETH);
  console.log("  USDC:", uniswapAddresses.USDC);
  console.log("");
  console.log("========================================");
  console.log("");
  console.log("DeFi Features:");
  console.log("");
  console.log("1. LiquidityManager - DAO-controlled liquidity on Uniswap V3");
  console.log("   - Create TUT/ETH, TUT/USDC, TUT/USDT pools");
  console.log("   - Add/remove liquidity via governance");
  console.log("   - Collect trading fees to treasury");
  console.log("");
  console.log("2. StakingPool - Stake TUT to earn rewards");
  console.log("   - FLEXIBLE: No lock, 1x rewards");
  console.log("   - BRONZE: 30 days lock, 1.25x rewards");
  console.log("   - SILVER: 90 days lock, 1.5x rewards");
  console.log("   - GOLD: 180 days lock, 2x rewards");
  console.log("   - DIAMOND: 365 days lock, 3x rewards");
  console.log("");
  console.log("3. LiquidityIncentives - LP token farming");
  console.log("   - Deposit LP tokens to earn TUT");
  console.log("   - Multiple pools with different weights");
  console.log("");
  console.log("Next Steps:");
  console.log("1. Create governance proposal to fund StakingPool");
  console.log("2. Create TUT pools on Uniswap via LiquidityManager");
  console.log("3. Add LP pools to LiquidityIncentives");
  console.log("");

  return {
    liquidityManager: liquidityManagerAddr,
    stakingPool: stakingPoolAddr,
    liquidityIncentives: liquidityIncentivesAddr,
  };
}

main()
  .then((addresses) => {
    console.log("Deployment successful!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
