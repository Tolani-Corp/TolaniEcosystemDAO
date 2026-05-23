/**
 * Reconcile Base mainnet admin roles to the configured Safe.
 *
 * Default mode is dry-run. To send transactions, set:
 *   EXECUTE_ROLE_TRANSFER=true
 *
 * To renounce deployer admin roles after grants succeed, also set:
 *   RENOUNCE_DEPLOYER_ROLES=true
 */

require("dotenv").config();
const { ethers } = require("hardhat");
const {
  BASE_MAINNET_ADDRESSES,
  configuredSafeAddress,
  isExecuteMode,
} = require("./base-mainnet-addresses");

const EXECUTE = isExecuteMode(process.env.EXECUTE_ROLE_TRANSFER || process.env.EXECUTE_RECONCILIATION);
const RENOUNCE_DEPLOYER = isExecuteMode(process.env.RENOUNCE_DEPLOYER_ROLES);
const SAFE_ADDRESS = configuredSafeAddress();

const CONTRACTS = [
  {
    label: "uTUT",
    artifact: "uTUT",
    address: BASE_MAINNET_ADDRESSES.uTut,
    roles: ["DEFAULT_ADMIN_ROLE", "PAUSER_ROLE", "UPGRADER_ROLE"],
    grantOnly: ["MINTER_ROLE"],
  },
  {
    label: "TUTConverter",
    artifact: "TUTConverter",
    address: BASE_MAINNET_ADDRESSES.tutConverter,
    roles: ["DEFAULT_ADMIN_ROLE", "PAUSER_ROLE", "UPGRADER_ROLE", "TREASURY_ROLE"],
  },
  {
    label: "TrainingRewards",
    artifact: "contracts/training/TrainingRewards.sol:TrainingRewards",
    address: BASE_MAINNET_ADDRESSES.trainingRewards,
    roles: ["DEFAULT_ADMIN_ROLE", "CAMPAIGN_MANAGER_ROLE", "PAUSER_ROLE", "UPGRADER_ROLE"],
  },
  {
    label: "SessionKeyRegistry",
    artifact: "SessionKeyRegistry",
    address: BASE_MAINNET_ADDRESSES.sessionKeyRegistry,
    roles: ["DEFAULT_ADMIN_ROLE", "SESSION_MANAGER_ROLE", "PAUSER_ROLE", "UPGRADER_ROLE"],
  },
  {
    label: "StakingPool",
    artifact: "StakingPool",
    address: BASE_MAINNET_ADDRESSES.stakingPool,
    roles: ["DEFAULT_ADMIN_ROLE", "REWARDS_MANAGER_ROLE"],
  },
  {
    label: "Timelock",
    artifact: "TolaniEcosystemTimelock",
    address: BASE_MAINNET_ADDRESSES.timelock,
    roles: ["DEFAULT_ADMIN_ROLE"],
    grantOnly: ["EXECUTOR_ROLE"],
  },
];

async function getRole(contract, roleName) {
  if (roleName === "DEFAULT_ADMIN_ROLE") return ethers.ZeroHash;
  if (typeof contract[roleName] !== "function") return null;

  try {
    return await contract[roleName]();
  } catch {
    return null;
  }
}

async function canGrantRole(contract, role, deployer) {
  if (typeof contract.getRoleAdmin !== "function") return false;

  try {
    const adminRole = await contract.getRoleAdmin(role);
    const hasAdmin = await contract.hasRole(adminRole, deployer.address);
    return { hasAdmin, adminRole };
  } catch {
    return { hasAdmin: false, adminRole: null };
  }
}

async function maybeGrant(contract, role, roleName, deployer) {
  const grantStatus = await canGrantRole(contract, role, deployer);

  if (!grantStatus.hasAdmin) {
    console.log(`   BLOCKED: deployer lacks admin authority to grant ${roleName}`);
    return;
  }

  if (!EXECUTE) {
    console.log(`   DRY-RUN: grant ${roleName} to Safe`);
    return;
  }

  const tx = await contract.grantRole(role, SAFE_ADDRESS);
  console.log(`   TX: ${tx.hash}`);
  await tx.wait();
  console.log(`   Done: grant ${roleName} to Safe`);
}

async function maybeSend(description, fn) {
  if (!EXECUTE) {
    console.log(`   DRY-RUN: ${description}`);
    return;
  }
  const tx = await fn();
  console.log(`   TX: ${tx.hash}`);
  await tx.wait();
  console.log(`   Done: ${description}`);
}

async function reconcileContract({ label, artifact, address, roles, grantOnly = [] }, deployer) {
  console.log("\n" + "-".repeat(70));
  console.log(`${label}: ${address}`);

  const contract = await ethers.getContractAt(artifact, address);
  const adminRole = await getRole(contract, "DEFAULT_ADMIN_ROLE");
  const deployerIsAdmin = await contract.hasRole(adminRole, deployer.address);
  console.log(`   Deployer DEFAULT_ADMIN_ROLE: ${deployerIsAdmin}`);

  for (const roleName of roles) {
    const role = await getRole(contract, roleName);
    if (!role) {
      console.log(`   ${roleName}: skipped (not exposed by deployed contract)`);
      continue;
    }

    const safeHasRole = await contract.hasRole(role, SAFE_ADDRESS);
    const deployerHasRole = await contract.hasRole(role, deployer.address);
    console.log(`   ${roleName}: safe=${safeHasRole} deployer=${deployerHasRole}`);

    if (!safeHasRole) {
      await maybeGrant(contract, role, roleName, deployer);
    }

    if (RENOUNCE_DEPLOYER && roleName === "DEFAULT_ADMIN_ROLE" && deployerHasRole) {
      await maybeSend(`renounce ${roleName} from deployer`, () => contract.renounceRole(role, deployer.address));
    }
  }

  for (const roleName of grantOnly) {
    const role = await getRole(contract, roleName);
    if (!role) {
      console.log(`   ${roleName}: skipped (not exposed by deployed contract)`);
      continue;
    }

    const safeHasRole = await contract.hasRole(role, SAFE_ADDRESS);
    console.log(`   ${roleName}: safe=${safeHasRole}`);
    if (!safeHasRole) {
      await maybeGrant(contract, role, roleName, deployer);
    }
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\nBASE MAINNET ROLE RECONCILIATION");
  console.log("=".repeat(70));
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Safe: ${SAFE_ADDRESS}`);
  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}`);
  console.log(`Renounce deployer admin roles: ${RENOUNCE_DEPLOYER}`);

  if (network.chainId !== BigInt(BASE_MAINNET_ADDRESSES.chainId)) {
    throw new Error(`Run this on Base mainnet (${BASE_MAINNET_ADDRESSES.chainId})`);
  }

  const safeCode = await ethers.provider.getCode(SAFE_ADDRESS);
  if (safeCode === "0x") {
    throw new Error(`Safe address has no contract code on Base: ${SAFE_ADDRESS}`);
  }

  for (const contract of CONTRACTS) {
    await reconcileContract(contract, deployer);
  }

  console.log("\n" + "=".repeat(70));
  console.log(EXECUTE ? "Role reconciliation transactions completed." : "Dry-run complete. Set EXECUTE_ROLE_TRANSFER=true to apply.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
