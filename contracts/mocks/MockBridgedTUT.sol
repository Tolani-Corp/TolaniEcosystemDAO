// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockBridgedTUT
 * @notice Mock TUT token for Base L2 testnet (simulates bridged TUT)
 * @dev For production, use actual bridged token from Superbridge/Base Bridge
 */
contract MockBridgedTUT is ERC20, Ownable {
    constructor() ERC20("Bridged TUT Token", "TUT") Ownable(msg.sender) {
        // Mint 10M TUT for testing
        _mint(msg.sender, 10_000_000 * 10**18);
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
