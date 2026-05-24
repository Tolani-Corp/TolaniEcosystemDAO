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
    renounceOnly: ["MINTER_ROLE"],
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
  if (typeof contract.getRoleAdmin !== "function") return { hasAdmin: false, adminRole: null };

  try {
    const adminRole = await contract.getRoleAdmin(role);
    const hasAdmin = await contract.hasRole(adminRole, deployer.address);
    return { hasAdmin, adminRole };
  } catch {
    return { hasAdmin: false, adminRole: null };
  }
}

async function maybeGrant(contract, role, roleName, deployer) {
  return maybeGrantTo(contract, role, roleName, SAFE_ADDRESS, "Safe", deployer);
}

async function maybeGrantTo(contract, role, roleName, account, accountLabel, deployer) {
  const grantStatus = await canGrantRole(contract, role, deployer);

  if (!grantStatus.hasAdmin) {
    console.log(`   BLOCKED: deployer lacks admin authority to grant ${roleName} to ${accountLabel}`);
    return;
  }

  if (!EXECUTE) {
    console.log(`   DRY-RUN: grant ${roleName} to ${accountLabel}`);
    return;
  }

  const tx = await contract.grantRole(role, account);
  console.log(`   TX: ${tx.hash}`);
  await tx.wait();
  console.log(`   Done: grant ${roleName} to ${accountLabel}`);
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

async function reconcileContract({ label, artifact, address, roles, grantOnly = [], renounceOnly = [] }, deployer) {
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

    if (RENOUNCE_DEPLOYER && deployerHasRole) {
      if (roleName === "DEFAULT_ADMIN_ROLE" || safeHasRole) {
        await maybeSend(`renounce ${roleName} from deployer`, () => contract.renounceRole(role, deployer.address));
      } else {
        console.log(`   SKIP: deployer has ${roleName}, but Safe does not`);
      }
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

  for (const roleName of renounceOnly) {
    const role = await getRole(contract, roleName);
    if (!role) {
      console.log(`   ${roleName}: skipped (not exposed by deployed contract)`);
      continue;
    }

    const deployerHasRole = await contract.hasRole(role, deployer.address);
    console.log(`   ${roleName}: deployer=${deployerHasRole}`);
    if (RENOUNCE_DEPLOYER && deployerHasRole) {
      await maybeSend(`renounce ${roleName} from deployer`, () => contract.renounceRole(role, deployer.address));
    }
  }
}

async function reconcileUTutConversion(deployer) {
  console.log("\n" + "-".repeat(70));
  console.log("uTUT conversion wiring");

  const uTut = await ethers.getContractAt("uTUT", BASE_MAINNET_ADDRESSES.uTut);
  const minterRole = await getRole(uTut, "MINTER_ROLE");
  const converterHasMinter = await uTut.hasRole(minterRole, BASE_MAINNET_ADDRESSES.tutConverter);
  console.log(`   TUTConverter MINTER_ROLE: ${converterHasMinter}`);

  if (!converterHasMinter) {
    await maybeGrantTo(
      uTut,
      minterRole,
      "MINTER_ROLE",
      BASE_MAINNET_ADDRESSES.tutConverter,
      "TUTConverter",
      deployer
    );
  }

  if (typeof uTut.converter !== "function" || typeof uTut.setConverter !== "function") {
    console.log("   converter(): skipped (not exposed by deployed contract)");
    return;
  }

  const currentConverter = await uTut.converter();
  console.log(`   configured converter: ${currentConverter}`);

  if (currentConverter.toLowerCase() === BASE_MAINNET_ADDRESSES.tutConverter.toLowerCase()) {
    console.log("   Converter already set");
    return;
  }

  const adminRole = await getRole(uTut, "DEFAULT_ADMIN_ROLE");
  const deployerIsAdmin = await uTut.hasRole(adminRole, deployer.address);
  if (!deployerIsAdmin) {
    console.log("   BLOCKED: deployer lacks admin authority to set converter");
    return;
  }

  if (!EXECUTE) {
    console.log(`   DRY-RUN: set converter to ${BASE_MAINNET_ADDRESSES.tutConverter}`);
    return;
  }

  const tx = await uTut.setConverter(BASE_MAINNET_ADDRESSES.tutConverter);
  console.log(`   TX: ${tx.hash}`);
  await tx.wait();
  console.log("   Done: set uTUT converter");
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

  await reconcileUTutConversion(deployer);

  console.log("\n" + "=".repeat(70));
  console.log(EXECUTE ? "Role reconciliation transactions completed." : "Dry-run complete. Set EXECUTE_ROLE_TRANSFER=true to apply.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
