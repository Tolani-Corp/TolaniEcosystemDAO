// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

/**
 * @title MockGovernanceToken
 * @dev Mock ERC20 governance token for local testing only
 * @notice DO NOT USE IN PRODUCTION - Use the real TUT token from TolaniToken repo
 * 
 * For production, deploy the TUT token from:
 * https://github.com/Tolani-Corp/TolaniToken
 */
contract MockGovernanceToken is ERC20, ERC20Permit, ERC20Votes {
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18; // 100 million tokens

    constructor() ERC20("Mock TUT Token", "mTUT") ERC20Permit("Mock TUT Token") {
        _mint(msg.sender, MAX_SUPPLY);
    }

    // Required overrides for ERC20Votes

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
