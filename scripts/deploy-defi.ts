import { ethers } from "hardhat";

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
    // Test tokens on Sepolia
    WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Circle's USDC on Sepolia
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
  const networkName = network.name === "unknown" ? "sepolia" : network.name;
  console.log("Network:", networkName, "(chainId:", network.chainId, ")");

  const uniswapAddresses = networkName === "mainnet" ? UNISWAP_V3.mainnet : UNISWAP_V3.sepolia;

  // ============ Deploy LiquidityManager ============
  console.log("\n--- Deploying LiquidityManager ---");
  const LiquidityManager = await ethers.getContractFactory("LiquidityManager");
  const liquidityManager = await LiquidityManager.deploy(
    EXISTING_CONTRACTS.tutToken,
    uniswapAddresses.positionManager,
    uniswapAddresses.factory,
    EXISTING_CONTRACTS.timelock // Governance controls
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
  console.log("Next Steps:");
  console.log("1. Create governance proposal to fund StakingPool with TUT rewards");
  console.log("2. Create governance proposal to add liquidity via LiquidityManager");
  console.log("3. Add LP token pools to LiquidityIncentives after creating Uniswap pools");
  console.log("");
  console.log("To create TUT-ETH pool:");
  console.log(`  - First, call LiquidityManager.createPool(${uniswapAddresses.WETH}, 3000, <sqrtPriceX96>)`);
  console.log("  - Then add liquidity with addLiquidity()");
  console.log("");

  // Return addresses for use in other scripts
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
