// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TolaniEcosystemTreasury
 * @dev Treasury contract for the Tolani Ecosystem DAO
 * @notice Holds and manages DAO funds including TUT tokens, controlled by governance
 * @custom:repository https://github.com/Tolani-Corp/TolaniToken
 * 
 * This treasury can hold:
 * - Native ETH/MATIC for gas and operations
 * - TUT tokens for ecosystem distributions
 * - Other ERC20 tokens received through ecosystem operations
 */
contract TolaniTreasury is Ownable {
    using SafeERC20 for IERC20;
    event FundsDeposited(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);

    constructor(address _owner) Ownable(_owner) {}

    /**
     * @dev Receive ETH deposits
     */
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw ETH from treasury (only owner - should be timelock)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawFunds(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        emit FundsWithdrawn(to, amount);
    }

    /**
     * @dev Withdraw ERC20 tokens from treasury (only owner - should be timelock)
     * @param token Token contract address
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        IERC20(token).safeTransfer(to, amount);
        emit TokensWithdrawn(token, to, amount);
    }

    /**
     * @dev Get token balance in treasury
     * @param token Token contract address
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Get treasury ETH balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
