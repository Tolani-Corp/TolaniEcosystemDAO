const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const MIN_DELAY = 3600; // 1 hour timelock delay

/**
 * Hardhat Ignition module for Tolani Ecosystem DAO
 * 
 * This DAO is designed to govern the TUT token ecosystem from:
 * https://github.com/Tolani-Corp/TolaniToken
 * 
 * For production, pass the TUT token address as a parameter.
 * For testing, this deploys a mock governance token.
 */
module.exports = buildModule("TolaniEcosystemDAO", (m) => {
  // For testing, deploy a mock token. In production, use the TUT token address.
  const mockToken = m.contract("MockGovernanceToken");

  // Deploy the timelock with temporary empty arrays
  // We'll update roles after deploying the governor
  const timelock = m.contract("TolaniEcosystemTimelock", [
    MIN_DELAY,
    [], // proposers - will be set to governor
    [], // executors - will be set to governor
    m.getAccount(0), // temporary admin
  ]);

  // Deploy the governor
  const governor = m.contract("TolaniEcosystemGovernor", [mockToken, timelock]);

  // Deploy the treasury owned by timelock
  const treasury = m.contract("TolaniTreasury", [timelock]);

  return { token: mockToken, timelock, governor, treasury };
});
