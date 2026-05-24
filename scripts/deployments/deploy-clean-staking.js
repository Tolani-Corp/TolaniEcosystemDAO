/**
 * Deploy a clean Base mainnet StakingPool.
 *
 * The deprecated pool was deployed with admin/rewards roles assigned to the TUT
 * token address. This script deploys a replacement, grants Safe + Timelock
 * admin/rewards roles, and can renounce deployer roles after grants succeed.
 *
 * Default mode is dry-run. To send transactions, set:
 *   EXECUTE_STAKING_DEPLOY=true
 *
 * To remove deployer roles on the new pool, also set:
 *   RENOUNCE_STAKING_DEPLOYER=true
 */

require("dotenv").config();
const { ethers } = require("hardhat");
const {
  BASE_MAINNET_ADDRESSES,
  configuredSafeAddress,
  isExecuteMode,
} = require("./base-mainnet-addresses");

const EXECUTE = isExecuteMode(process.env.EXECUTE_STAKING_DEPLOY);
const RENOUNCE_DEPLOYER = isExecuteMode(process.env.RENOUNCE_STAKING_DEPLOYER);
const FORCE_REDEPLOY = isExecuteMode(process.env.FORCE_STAKING_REDEPLOY);
const SAFE_ADDRESS = configuredSafeAddress();

async function requireCode(address, label) {
  const code = await ethers.provider.getCode(address);
  if (code === "0x") {
    throw new Error(`${label} has no contract code on Base: ${address}`);
  }
}

async function maybeTx(description, fn) {
  if (!EXECUTE) {
    console.log(`DRY-RUN: ${description}`);
    return null;
  }

  const tx = await fn();
  console.log(`TX: ${tx.hash}`);
  await tx.wait(2);
  console.log(`Done: ${description}`);
  return tx;
}

async function waitForCode(address, label) {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const code = await ethers.provider.getCode(address);
    if (code !== "0x") return;

    if (attempt < 10) {
      console.log(`Waiting for ${label} code (${attempt}/10)...`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }

  throw new Error(`${label} has no contract code after deployment wait: ${address}`);
}

async function grantIfMissing(pool, role, roleName, account, accountLabel) {
  const hasRole = await pool.hasRole(role, account);
  console.log(`${roleName} ${accountLabel}: ${hasRole}`);
  if (!hasRole) {
    await maybeTx(`grant ${roleName} to ${accountLabel}`, () => pool.grantRole(role, account));
  }
}

async function renounceIfHeld(pool, role, roleName, deployer) {
  const hasRole = await pool.hasRole(role, deployer.address);
  console.log(`${roleName} deployer: ${hasRole}`);
  if (hasRole) {
    if (!RENOUNCE_DEPLOYER) {
      console.log(`SKIP: set RENOUNCE_STAKING_DEPLOYER=true to renounce ${roleName} from deployer`);
      return;
    }

    await maybeTx(`renounce ${roleName} from deployer`, () => pool.renounceRole(role, deployer.address));
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\nBASE MAINNET CLEAN STAKING DEPLOY");
  console.log("=".repeat(70));
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Official Base TUT: ${BASE_MAINNET_ADDRESSES.tut}`);
  console.log(`Current StakingPool: ${BASE_MAINNET_ADDRESSES.stakingPool}`);
  console.log(`Deprecated StakingPool: ${BASE_MAINNET_ADDRESSES.deprecatedStakingPool || "none"}`);
  console.log(`Safe: ${SAFE_ADDRESS}`);
  console.log(`Timelock: ${BASE_MAINNET_ADDRESSES.timelock}`);
  console.log(`Renounce deployer roles: ${RENOUNCE_DEPLOYER}`);
  console.log(`Force redeploy: ${FORCE_REDEPLOY}`);

  if (network.chainId !== BigInt(BASE_MAINNET_ADDRESSES.chainId)) {
    throw new Error(`Run this on Base mainnet (${BASE_MAINNET_ADDRESSES.chainId})`);
  }

  if (deployer.address.toLowerCase() !== BASE_MAINNET_ADDRESSES.deployer.toLowerCase()) {
    throw new Error(`Signer is not expected deployer: ${BASE_MAINNET_ADDRESSES.deployer}`);
  }

  await requireCode(BASE_MAINNET_ADDRESSES.tut, "Official Base TUT");
  await requireCode(SAFE_ADDRESS, "Safe");
  await requireCode(BASE_MAINNET_ADDRESSES.timelock, "Timelock");

  const tut = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", BASE_MAINNET_ADDRESSES.tut);
  const deprecatedPoolAddress = BASE_MAINNET_ADDRESSES.deprecatedStakingPool || BASE_MAINNET_ADDRESSES.stakingPool;
  if (
    BASE_MAINNET_ADDRESSES.deprecatedStakingPool &&
    BASE_MAINNET_ADDRESSES.stakingPool.toLowerCase() !== BASE_MAINNET_ADDRESSES.deprecatedStakingPool.toLowerCase()
  ) {
    await requireCode(BASE_MAINNET_ADDRESSES.stakingPool, "Current StakingPool");
    if (!FORCE_REDEPLOY) {
      const message = `Clean staking pool is already configured at ${BASE_MAINNET_ADDRESSES.stakingPool}. Set FORCE_STAKING_REDEPLOY=true to replace it.`;
      if (EXECUTE) throw new Error(message);
      console.log(message);
      return;
    }
  }

  const deprecatedPool = await ethers.getContractAt("StakingPool", deprecatedPoolAddress);
  const deprecatedTotalStaked = await deprecatedPool.totalStaked();
  const deprecatedTutBalance = await tut.balanceOf(deprecatedPoolAddress);

  console.log("\nDeprecated Pool");
  console.log(`totalStaked: ${ethers.formatEther(deprecatedTotalStaked)} TUT`);
  console.log(`TUT balance: ${ethers.formatEther(deprecatedTutBalance)} TUT`);

  if (deprecatedTotalStaked > 0n || deprecatedTutBalance > 0n) {
    throw new Error("Deprecated staking pool is not empty. Stop and plan user migration before replacement.");
  }

  if (!EXECUTE) {
    console.log("\nDRY-RUN: deploy StakingPool with deployer as temporary bootstrap admin");
    console.log("DRY-RUN: grant DEFAULT_ADMIN_ROLE and REWARDS_MANAGER_ROLE to Safe");
    console.log("DRY-RUN: grant DEFAULT_ADMIN_ROLE and REWARDS_MANAGER_ROLE to Timelock");
    if (RENOUNCE_DEPLOYER) {
      console.log("DRY-RUN: renounce deployer DEFAULT_ADMIN_ROLE and REWARDS_MANAGER_ROLE");
    }
    console.log("\nDry-run complete. Set EXECUTE_STAKING_DEPLOY=true to deploy.");
    return;
  }

  const StakingPool = await ethers.getContractFactory("StakingPool");
  const pool = await StakingPool.deploy(BASE_MAINNET_ADDRESSES.tut, deployer.address);
  const deploymentTx = pool.deploymentTransaction();
  console.log(`Deploy TX: ${deploymentTx.hash}`);
  const receipt = await deploymentTx.wait(2);
  if (!receipt || receipt.status !== 1) {
    throw new Error(`StakingPool deployment failed: ${deploymentTx.hash}`);
  }

  const poolAddress = await pool.getAddress();
  await waitForCode(poolAddress, "New StakingPool");
  console.log(`\nNew StakingPool: ${poolAddress}`);

  const adminRole = await pool.DEFAULT_ADMIN_ROLE();
  const rewardsRole = await pool.REWARDS_MANAGER_ROLE();

  await grantIfMissing(pool, adminRole, "DEFAULT_ADMIN_ROLE", SAFE_ADDRESS, "Safe");
  await grantIfMissing(pool, rewardsRole, "REWARDS_MANAGER_ROLE", SAFE_ADDRESS, "Safe");
  await grantIfMissing(pool, adminRole, "DEFAULT_ADMIN_ROLE", BASE_MAINNET_ADDRESSES.timelock, "Timelock");
  await grantIfMissing(pool, rewardsRole, "REWARDS_MANAGER_ROLE", BASE_MAINNET_ADDRESSES.timelock, "Timelock");

  await renounceIfHeld(pool, rewardsRole, "REWARDS_MANAGER_ROLE", deployer);
  await renounceIfHeld(pool, adminRole, "DEFAULT_ADMIN_ROLE", deployer);

  console.log("\nVerification");
  console.log(`Safe admin: ${await pool.hasRole(adminRole, SAFE_ADDRESS)}`);
  console.log(`Safe rewards manager: ${await pool.hasRole(rewardsRole, SAFE_ADDRESS)}`);
  console.log(`Timelock admin: ${await pool.hasRole(adminRole, BASE_MAINNET_ADDRESSES.timelock)}`);
  console.log(`Timelock rewards manager: ${await pool.hasRole(rewardsRole, BASE_MAINNET_ADDRESSES.timelock)}`);
  console.log(`Deployer admin: ${await pool.hasRole(adminRole, deployer.address)}`);
  console.log(`Deployer rewards manager: ${await pool.hasRole(rewardsRole, deployer.address)}`);

  console.log("\n" + "=".repeat(70));
  console.log("Clean staking deployment completed.");
  console.log(`Update BASE_MAINNET_ADDRESSES.stakingPool to ${poolAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
