// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title GasTreasuryModuleSimple - Gas Reimbursement (Non-Upgradeable)
 * @author Tolani Labs
 * @notice Simplified gas treasury for Sepolia testnet
 */
contract GasTreasuryModuleSimple is AccessControl, Pausable, ReentrancyGuard {
    /* ========== ROLES ========== */
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    /* ========== STRUCTS ========== */
    struct GasLimits {
        uint256 maxPerTransaction;
        uint256 maxDailyPerRelayer;
        uint256 maxDailyGlobal;
    }

    /* ========== STATE VARIABLES ========== */
    GasLimits public limits;
    
    mapping(address => uint256) public dailyRelayerUsage;
    mapping(address => uint256) public lastRelayerResetDay;
    uint256 public dailyGlobalUsage;
    uint256 public lastGlobalResetDay;
    uint256 public totalReimbursed;

    /* ========== EVENTS ========== */
    event GasReimbursed(
        address indexed relayer,
        uint256 amount,
        bytes32 indexed txRef
    );
    event LimitsUpdated(uint256 maxPerTx, uint256 maxDailyPerRelayer, uint256 maxDailyGlobal);
    event FundsDeposited(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    /* ========== ERRORS ========== */
    error ExceedsTransactionLimit(uint256 amount, uint256 limit);
    error ExceedsDailyRelayerLimit(uint256 amount, uint256 remaining);
    error ExceedsDailyGlobalLimit(uint256 amount, uint256 remaining);
    error InsufficientFunds(uint256 requested, uint256 available);
    error ZeroAmount();
    error TransferFailed();

    constructor(address owner) {
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        
        // Default limits
        limits = GasLimits({
            maxPerTransaction: 0.01 ether,
            maxDailyPerRelayer: 0.5 ether,
            maxDailyGlobal: 2 ether
        });
    }

    /* ========== REIMBURSEMENT ========== */

    /**
     * @notice Reimburse gas to a relayer
     * @param relayer Address to reimburse
     * @param amount Amount of ETH to reimburse
     * @param txRef Transaction reference
     */
    function reimburseGas(
        address relayer,
        uint256 amount,
        bytes32 txRef
    ) external onlyRole(RELAYER_ROLE) nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (amount > limits.maxPerTransaction) {
            revert ExceedsTransactionLimit(amount, limits.maxPerTransaction);
        }
        
        // Reset daily counters if needed
        uint256 currentDay = block.timestamp / 1 days;
        
        if (lastRelayerResetDay[relayer] < currentDay) {
            dailyRelayerUsage[relayer] = 0;
            lastRelayerResetDay[relayer] = currentDay;
        }
        
        if (lastGlobalResetDay < currentDay) {
            dailyGlobalUsage = 0;
            lastGlobalResetDay = currentDay;
        }
        
        // Check limits
        uint256 newRelayerUsage = dailyRelayerUsage[relayer] + amount;
        if (newRelayerUsage > limits.maxDailyPerRelayer) {
            revert ExceedsDailyRelayerLimit(amount, limits.maxDailyPerRelayer - dailyRelayerUsage[relayer]);
        }
        
        uint256 newGlobalUsage = dailyGlobalUsage + amount;
        if (newGlobalUsage > limits.maxDailyGlobal) {
            revert ExceedsDailyGlobalLimit(amount, limits.maxDailyGlobal - dailyGlobalUsage);
        }
        
        // Check balance
        if (amount > address(this).balance) {
            revert InsufficientFunds(amount, address(this).balance);
        }
        
        // Update state
        dailyRelayerUsage[relayer] = newRelayerUsage;
        dailyGlobalUsage = newGlobalUsage;
        totalReimbursed += amount;
        
        // Transfer
        (bool success, ) = relayer.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit GasReimbursed(relayer, amount, txRef);
    }

    /* ========== ADMIN ========== */

    function updateLimits(
        uint256 maxPerTx,
        uint256 maxDailyPerRelayer,
        uint256 maxDailyGlobal
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        limits = GasLimits({
            maxPerTransaction: maxPerTx,
            maxDailyPerRelayer: maxDailyPerRelayer,
            maxDailyGlobal: maxDailyGlobal
        });
        emit LimitsUpdated(maxPerTx, maxDailyPerRelayer, maxDailyGlobal);
    }

    function grantRelayer(address relayer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(RELAYER_ROLE, relayer);
    }

    function revokeRelayer(address relayer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(RELAYER_ROLE, relayer);
    }

    function withdrawFunds(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (amount > address(this).balance) {
            revert InsufficientFunds(amount, address(this).balance);
        }
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
        emit FundsWithdrawn(to, amount);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /* ========== VIEW ========== */

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getRemainingDailyRelayer(address relayer) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        if (lastRelayerResetDay[relayer] < currentDay) return limits.maxDailyPerRelayer;
        return limits.maxDailyPerRelayer - dailyRelayerUsage[relayer];
    }

    function getRemainingDailyGlobal() external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        if (lastGlobalResetDay < currentDay) return limits.maxDailyGlobal;
        return limits.maxDailyGlobal - dailyGlobalUsage;
    }

    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
}
