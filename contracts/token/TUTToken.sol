// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "../TUTTokenSmartV2.sol";

/**
 * @title TUTToken
 * @author Tolani Labs
 * @notice Canonical Tolani Utility Token entrypoint for the DAO repository
 * @dev Thin wrapper over the production-ready `TUTTokenSmart` implementation so
 * deployment scripts, tests, and external integrations can target a stable
 * contract name without depending on historical file naming.
 */
contract TUTToken is TUTTokenSmart {
    constructor(address trustedForwarder) TUTTokenSmart(trustedForwarder) {}
}
