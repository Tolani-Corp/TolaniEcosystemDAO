/**
 * Read-only Base mainnet reconciliation status for TUT intake.
 *
 * Usage:
 *   npx hardhat run scripts/deployments/reconcile-mainnet-status.js --network base
 */

require("dotenv").config();
const { ethers } = require("hardhat");
const { BASE_MAINNET_ADDRESSES, configuredSafeAddress } = require("./base-mainnet-addresses");

const SAFE_ADDRESS = configuredSafeAddress();

function pass(label, detail) {
  console.log(`PASS ${label}${detail ? `: ${detail}` : ""}`);
}

function warn(label, detail) {
  console.log(`WARN ${label}${detail ? `: ${detail}` : ""}`);
}

function fail(label, detail) {
  console.log(`FAIL ${label}${detail ? `: ${detail}` : ""}`);
}

async function hasCode(address) {
  return (await ethers.provider.getCode(address)) !== "0x";
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("\nBASE MAINNET TUT RECONCILIATION STATUS");
  console.log("=".repeat(70));
  console.log(`Network: ${network.name} (${network.chainId})`);
  console.log(`Signer: ${deployer.address}`);
  console.log(`Configured Safe: ${SAFE_ADDRESS}`);

  if (network.chainId !== BigInt(BASE_MAINNET_ADDRESSES.chainId)) {
    throw new Error(`Run this on Base mainnet (${BASE_MAINNET_ADDRESSES.chainId})`);
  }

  const safeHasCode = await hasCode(SAFE_ADDRESS);
  if (safeHasCode) pass("Safe contract exists on Base", SAFE_ADDRESS);
  else fail("Configured Safe has no contract code on Base", SAFE_ADDRESS);

  const staleSafeHasCode = await hasCode(BASE_MAINNET_ADDRESSES.staleSafe);
  if (BASE_MAINNET_ADDRESSES.staleSafe.toLowerCase() !== SAFE_ADDRESS.toLowerCase()) {
    warn(
      "Deprecated Safe candidate",
      `${BASE_MAINNET_ADDRESSES.staleSafe} codePresent=${staleSafeHasCode}`
    );
  }

  const tut = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", BASE_MAINNET_ADDRESSES.tut);
  const treasury = await ethers.getContractAt("TolaniTreasury", BASE_MAINNET_ADDRESSES.treasury);
  const governor = await ethers.getContractAt("TolaniEcosystemGovernor", BASE_MAINNET_ADDRESSES.governor);
  const timelock = await ethers.getContractAt("TolaniEcosystemTimelock", BASE_MAINNET_ADDRESSES.timelock);
  const uTut = await ethers.getContractAt("uTUT", BASE_MAINNET_ADDRESSES.uTut);
  const converter = await ethers.getContractAt("TUTConverter", BASE_MAINNET_ADDRESSES.tutConverter);
  const stakingPool = await ethers.getContractAt("StakingPool", BASE_MAINNET_ADDRESSES.stakingPool);

  const totalSupply = await tut.totalSupply();
  const sourceBalance = await tut.balanceOf(BASE_MAINNET_ADDRESSES.deployer);
  const treasuryBalance = await tut.balanceOf(BASE_MAINNET_ADDRESSES.treasury);
  const converterBalance = await tut.balanceOf(BASE_MAINNET_ADDRESSES.tutConverter);

  pass("Official Base TUT", BASE_MAINNET_ADDRESSES.tut);
  pass("Base TUT supply", `${ethers.formatEther(totalSupply)} TUT`);
  if (sourceBalance > 0n) warn("Source wallet still holds Base TUT", `${ethers.formatEther(sourceBalance)} TUT`);
  else pass("Source wallet fully funded out");
  if (treasuryBalance > 0n) pass("Treasury funded", `${ethers.formatEther(treasuryBalance)} TUT`);
  else warn("Treasury can receive TUT but is not funded", "0 TUT");
  if (converterBalance > 0n) pass("Converter reserve funded", `${ethers.formatEther(converterBalance)} TUT`);
  else warn("Converter reserve is empty", "uTUT to TUT conversion cannot pay out yet");

  const treasuryOwner = await treasury.owner();
  if (treasuryOwner.toLowerCase() === BASE_MAINNET_ADDRESSES.timelock.toLowerCase()) pass("Treasury owner is Timelock");
  else fail("Treasury owner mismatch", treasuryOwner);

  const governorToken = await governor.token();
  const governorTimelock = await governor.timelock();
  if (governorToken.toLowerCase() === BASE_MAINNET_ADDRESSES.tut.toLowerCase()) pass("Governor token is official Base TUT");
  else fail("Governor token mismatch", governorToken);
  if (governorTimelock.toLowerCase() === BASE_MAINNET_ADDRESSES.timelock.toLowerCase()) pass("Governor timelock matches");
  else fail("Governor timelock mismatch", governorTimelock);

  const proposerRole = await timelock.PROPOSER_ROLE();
  const executorRole = await timelock.EXECUTOR_ROLE();
  const timelockAdminRole = await timelock.DEFAULT_ADMIN_ROLE();
  if (await timelock.hasRole(proposerRole, BASE_MAINNET_ADDRESSES.governor)) pass("Governor has Timelock proposer role");
  else fail("Governor missing Timelock proposer role");
  if (await timelock.hasRole(executorRole, ethers.ZeroAddress)) pass("Timelock executor role is open");
  else warn("Timelock executor role is not open");
  if (await timelock.hasRole(timelockAdminRole, deployer.address)) warn("Deployer still has Timelock admin");
  if (await timelock.hasRole(timelockAdminRole, SAFE_ADDRESS)) pass("Safe has Timelock admin");
  else warn("Safe does not have Timelock admin");

  const minterRole = await uTut.MINTER_ROLE();
  const uTutPauserRole = await uTut.PAUSER_ROLE();
  const uTutAdminRole = await uTut.DEFAULT_ADMIN_ROLE();
  const converterAddress = await uTut.converter();
  if (await uTut.hasRole(minterRole, BASE_MAINNET_ADDRESSES.trainingRewards)) pass("TrainingRewards can mint uTUT");
  else fail("TrainingRewards missing uTUT MINTER_ROLE");
  if (converterAddress.toLowerCase() === BASE_MAINNET_ADDRESSES.tutConverter.toLowerCase()) pass("uTUT converter is set");
  else warn("uTUT converter is not set", converterAddress);
  if (await uTut.hasRole(minterRole, BASE_MAINNET_ADDRESSES.tutConverter)) pass("TUTConverter can mint uTUT");
  else warn("TUTConverter missing uTUT MINTER_ROLE", "needed for TUT to uTUT conversion");
  if (await uTut.hasRole(uTutAdminRole, SAFE_ADDRESS)) pass("Safe has uTUT admin");
  else warn("Safe missing uTUT admin");
  if (await uTut.hasRole(uTutAdminRole, deployer.address)) warn("Deployer still has uTUT admin");
  else pass("Deployer is not uTUT admin");
  if (await uTut.hasRole(uTutPauserRole, deployer.address)) warn("Deployer still has uTUT pauser role");
  else pass("Deployer is not uTUT pauser");
  if (await uTut.hasRole(minterRole, deployer.address)) warn("Deployer still has uTUT minter role");
  else pass("Deployer is not uTUT minter");

  const converterAdminRole = await converter.DEFAULT_ADMIN_ROLE();
  const converterPauserRole = await converter.PAUSER_ROLE();
  const converterUpgraderRole = await converter.UPGRADER_ROLE();
  const converterTreasuryRole = await converter.TREASURY_ROLE();
  const converterTut = await converter.tut();
  const converterUtut = await converter.utut();
  if (converterTut.toLowerCase() === BASE_MAINNET_ADDRESSES.tut.toLowerCase()) pass("Converter points to official Base TUT");
  else fail("Converter TUT mismatch", converterTut);
  if (converterUtut.toLowerCase() === BASE_MAINNET_ADDRESSES.uTut.toLowerCase()) pass("Converter points to uTUT");
  else fail("Converter uTUT mismatch", converterUtut);
  if (await converter.hasRole(converterAdminRole, SAFE_ADDRESS)) pass("Safe has converter admin");
  else warn("Safe missing converter admin");
  if (await converter.hasRole(converterTreasuryRole, SAFE_ADDRESS)) pass("Safe has converter treasury role");
  else warn("Safe missing converter treasury role");
  if (await converter.hasRole(converterAdminRole, deployer.address)) warn("Deployer still has converter admin");
  else pass("Deployer is not converter admin");
  if (await converter.hasRole(converterPauserRole, deployer.address)) warn("Deployer still has converter pauser role");
  else pass("Deployer is not converter pauser");
  if (await converter.hasRole(converterUpgraderRole, deployer.address)) warn("Deployer still has converter upgrader role");
  else pass("Deployer is not converter upgrader");
  if (await converter.hasRole(converterTreasuryRole, deployer.address)) warn("Deployer still has converter treasury role");
  else pass("Deployer is not converter treasury");

  const stakingAdminRole = await stakingPool.DEFAULT_ADMIN_ROLE();
  const rewardsManagerRole = await stakingPool.REWARDS_MANAGER_ROLE();
  if (await stakingPool.hasRole(stakingAdminRole, BASE_MAINNET_ADDRESSES.timelock)) pass("Timelock has StakingPool admin");
  else warn("Timelock missing StakingPool admin");
  if (await stakingPool.hasRole(stakingAdminRole, SAFE_ADDRESS)) pass("Safe has StakingPool admin");
  else warn("Safe missing StakingPool admin", "requires DAO/timelock-side role grant if Safe should manage staking");
  if (await stakingPool.hasRole(rewardsManagerRole, SAFE_ADDRESS)) pass("Safe has StakingPool rewards manager role");
  else warn("Safe missing StakingPool rewards manager role");
  if (await stakingPool.hasRole(rewardsManagerRole, BASE_MAINNET_ADDRESSES.timelock)) pass("Timelock has StakingPool rewards manager role");
  else warn("Timelock missing StakingPool rewards manager role");
  if (await stakingPool.hasRole(stakingAdminRole, BASE_MAINNET_ADDRESSES.tut)) {
    fail("StakingPool admin is the TUT token address", "contract cannot initiate AccessControl grants");
  }
  if (await stakingPool.hasRole(rewardsManagerRole, BASE_MAINNET_ADDRESSES.tut)) {
    fail("StakingPool rewards manager is the TUT token address", "contract cannot initiate reward configuration");
  }
  if (await stakingPool.hasRole(stakingAdminRole, deployer.address)) warn("Deployer still has StakingPool admin");
  else pass("Deployer is not StakingPool admin");
  if (await stakingPool.hasRole(rewardsManagerRole, deployer.address)) warn("Deployer still has StakingPool rewards manager role");

  if (
    BASE_MAINNET_ADDRESSES.deprecatedStakingPool &&
    BASE_MAINNET_ADDRESSES.deprecatedStakingPool.toLowerCase() !== BASE_MAINNET_ADDRESSES.stakingPool.toLowerCase()
  ) {
    const deprecatedStakingPool = await ethers.getContractAt("StakingPool", BASE_MAINNET_ADDRESSES.deprecatedStakingPool);
    const deprecatedTotalStaked = await deprecatedStakingPool.totalStaked();
    const deprecatedTutBalance = await tut.balanceOf(BASE_MAINNET_ADDRESSES.deprecatedStakingPool);
    warn(
      "Deprecated StakingPool replaced",
      `${BASE_MAINNET_ADDRESSES.deprecatedStakingPool}; totalStaked=${ethers.formatEther(deprecatedTotalStaked)} TUT balance=${ethers.formatEther(deprecatedTutBalance)} TUT`
    );
  }

  console.log("\nTSG TOKEN POLICY");
  console.log("=".repeat(70));
  console.log("TSG should use uTUT for training, SOP, certification, and internal reward evidence.");
  console.log("Official Base TUT should be reserved for DAO treasury, governance, staking, conversion reserves, and approved settlement.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
