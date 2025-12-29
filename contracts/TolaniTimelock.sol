// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title TolaniEcosystemTimelock
 * @dev Timelock controller for the Tolani Ecosystem DAO
 * @notice All governance proposals are executed through this timelock
 * @custom:repository https://github.com/Tolani-Corp/TolaniToken
 * 
 * Provides a delay period (default 1 hour) for users to react to decisions.
 * This timelock should be granted roles on TUT token and ecosystem contracts:
 * - MINTER_ROLE on TUT token for controlled minting
 * - PAUSER_ROLE on TUT token for emergency pauses
 * - UPGRADER_ROLE on TUT token for contract upgrades
 * - Owner/Admin roles on Treasury, Escrow, HVAC Services, etc.
 */
contract TolaniEcosystemTimelock is TimelockController {
    /**
     * @dev Constructor
     * @param minDelay Minimum delay for operations (in seconds)
     * @param proposers Addresses that can propose operations
     * @param executors Addresses that can execute operations
     * @param admin Optional admin address (set to zero address to disable)
     */
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
