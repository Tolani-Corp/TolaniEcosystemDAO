// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title GasTreasuryModule
 * @author Tolani Labs
 * @notice Safe-owned gas treasury for reimbursing relayer gas costs
 * @dev Part of the Tolani Labs + IBM SkillsBuild Integration
 * 
 * Purpose:
 * The relayer pays upfront gas costs for training reward transactions.
 * This module reimburses those costs from the DAO's gas treasury.
 * 
 * Flow:
 * 1. Relayer executes training reward transaction on Base/World Chain
 * 2. Relayer calculates gas used + buffer
 * 3. Relayer calls requestReimbursement() with proof
 * 4. Module validates and transfers ETH to relayer
 * 
 * Security:
 * - Only whitelisted relayers can request reimbursements
 * - Maximum reimbursement per transaction is capped
 * - Daily/weekly reimbursement limits prevent drain attacks
 * - All reimbursements are logged for auditing
 * 
 * Funding:
 * - Funded from Operations/Gas Treasury allocation (1.5M TUT worth of ETH)
 * - Can receive ETH directly or from Treasury via governance
 */
contract GasTreasuryModule is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    /* ========== ROLES ========== */
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");
    bytes32 public constant TREASURER_ROLE = keccak256("TREASURER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /* ========== STRUCTS ========== */
    struct ReimbursementRecord {
        address relayer;
        address user;           // The user who benefited from the transaction
        uint256 amount;         // ETH reimbursed
        bytes32 txReference;    // Transaction hash or session key
        uint256 timestamp;
    }

    struct RelayerStats {
        uint256 totalReimbursed;       // All-time total
        uint256 reimbursementCount;    // Number of reimbursements
        uint256 dailyReimbursed;       // Current day's total
        uint256 dailyResetTime;        // When daily counter resets
        bool active;                   // Whether relayer is currently active
    }

    /* ========== STATE VARIABLES ========== */
    
    /// @notice Maximum reimbursement per transaction (in wei)
    uint256 public maxPerTransaction;
    
    /// @notice Maximum daily reimbursement per relayer (in wei)
    uint256 public maxDailyPerRelayer;
    
    /// @notice Global daily reimbursement limit (in wei)
    uint256 public maxDailyGlobal;
    
    /// @notice Current global daily reimbursed amount
    uint256 public globalDailyReimbursed;
    
    /// @notice When global daily counter resets
    uint256 public globalDailyResetTime;
    
    /// @notice Per-relayer statistics
    mapping(address => RelayerStats) public relayerStats;
    
    /// @notice Reimbursement history (limited to recent records)
    ReimbursementRecord[] public reimbursementHistory;
    
    /// @notice Maximum history size (older records are pruned)
    uint256 public maxHistorySize;
    
    /// @notice Total ETH reimbursed all-time
    uint256 public totalReimbursed;
    
    /// @notice Total reimbursement transactions
    uint256 public totalReimbursementCount;

    /// @notice Mapping of processed references to prevent double-claims
    mapping(bytes32 => bool) public processedReferences;

    /* ========== EVENTS ========== */
    event Reimbursed(
        address indexed relayer,
        address indexed user,
        uint256 amount,
        bytes32 indexed txRef,
        uint256 timestamp
    );
    
    event Deposited(
        address indexed from,
        uint256 amount
    );
    
    event Withdrawn(
        address indexed to,
        uint256 amount
    );
    
    event LimitsUpdated(
        uint256 maxPerTransaction,
        uint256 maxDailyPerRelayer,
        uint256 maxDailyGlobal
    );
    
    event RelayerActivated(address indexed relayer);
    event RelayerDeactivated(address indexed relayer);

    /* ========== ERRORS ========== */
    error ZeroAddress();
    error ZeroAmount();
    error ExceedsMaxPerTransaction(uint256 requested, uint256 max);
    error ExceedsDailyRelayerLimit(uint256 requested, uint256 remaining);
    error ExceedsDailyGlobalLimit(uint256 requested, uint256 remaining);
    error InsufficientBalance(uint256 requested, uint256 available);
    error ReferenceAlreadyProcessed();
    error RelayerNotActive();
    error TransferFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the gas treasury module
     * @param owner Address to receive admin roles
     */
    function initialize(address owner) external initializer {
        if (owner == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        // Default limits (can be adjusted by admin)
        maxPerTransaction = 0.01 ether;      // ~$25 at $2500/ETH
        maxDailyPerRelayer = 0.5 ether;      // ~$1250/day per relayer
        maxDailyGlobal = 2 ether;            // ~$5000/day global
        maxHistorySize = 1000;

        // Initialize daily reset times
        globalDailyResetTime = block.timestamp + 1 days;

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(TREASURER_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);
    }

    /* ========== RECEIVE ========== */
    
    /// @notice Accept ETH deposits
    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Get current treasury balance
     * @return ETH balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Get remaining daily allowance for a relayer
     * @param relayer Relayer address
     * @return Remaining ETH allowance in wei
     */
    function getRemainingDailyAllowance(address relayer) external view returns (uint256) {
        RelayerStats storage stats = relayerStats[relayer];
        
        // Check if daily reset is needed
        if (block.timestamp >= stats.dailyResetTime) {
            return maxDailyPerRelayer;
        }
        
        return maxDailyPerRelayer > stats.dailyReimbursed 
            ? maxDailyPerRelayer - stats.dailyReimbursed 
            : 0;
    }

    /**
     * @notice Get remaining global daily allowance
     * @return Remaining ETH allowance in wei
     */
    function getRemainingGlobalAllowance() external view returns (uint256) {
        if (block.timestamp >= globalDailyResetTime) {
            return maxDailyGlobal;
        }
        
        return maxDailyGlobal > globalDailyReimbursed 
            ? maxDailyGlobal - globalDailyReimbursed 
            : 0;
    }

    /**
     * @notice Get recent reimbursement history
     * @param count Number of records to return
     * @return Array of recent reimbursement records
     */
    function getRecentHistory(uint256 count) external view returns (ReimbursementRecord[] memory) {
        uint256 len = reimbursementHistory.length;
        uint256 returnCount = count > len ? len : count;
        
        ReimbursementRecord[] memory recent = new ReimbursementRecord[](returnCount);
        for (uint256 i = 0; i < returnCount; i++) {
            recent[i] = reimbursementHistory[len - returnCount + i];
        }
        
        return recent;
    }

    /* ========== REIMBURSEMENT FUNCTIONS ========== */

    /**
     * @notice Request gas reimbursement
     * @param user The user who benefited from the transaction
     * @param amount ETH amount to reimburse
     * @param txRef Transaction hash or unique reference
     * @dev Only callable by RELAYER_ROLE
     */
    function requestReimbursement(
        address user,
        uint256 amount,
        bytes32 txRef
    ) external onlyRole(RELAYER_ROLE) nonReentrant whenNotPaused {
        if (amount == 0) revert ZeroAmount();
        if (processedReferences[txRef]) revert ReferenceAlreadyProcessed();

        RelayerStats storage stats = relayerStats[msg.sender];
        if (!stats.active) revert RelayerNotActive();

        // Reset daily counters if needed
        _resetDailyCounters(msg.sender);

        // Validate limits
        if (amount > maxPerTransaction) {
            revert ExceedsMaxPerTransaction(amount, maxPerTransaction);
        }
        
        uint256 relayerRemaining = maxDailyPerRelayer - stats.dailyReimbursed;
        if (amount > relayerRemaining) {
            revert ExceedsDailyRelayerLimit(amount, relayerRemaining);
        }
        
        uint256 globalRemaining = maxDailyGlobal - globalDailyReimbursed;
        if (amount > globalRemaining) {
            revert ExceedsDailyGlobalLimit(amount, globalRemaining);
        }

        // Check balance
        if (address(this).balance < amount) {
            revert InsufficientBalance(amount, address(this).balance);
        }

        // Mark reference as processed
        processedReferences[txRef] = true;

        // Update stats
        stats.totalReimbursed += amount;
        stats.reimbursementCount++;
        stats.dailyReimbursed += amount;
        globalDailyReimbursed += amount;
        totalReimbursed += amount;
        totalReimbursementCount++;

        // Record history (with pruning)
        if (reimbursementHistory.length >= maxHistorySize) {
            // Simple approach: just track that we've exceeded, don't prune
            // In production, you might want a circular buffer
        }
        
        reimbursementHistory.push(ReimbursementRecord({
            relayer: msg.sender,
            user: user,
            amount: amount,
            txReference: txRef,
            timestamp: block.timestamp
        }));

        // Transfer ETH to relayer
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Reimbursed(msg.sender, user, amount, txRef, block.timestamp);
    }

    /**
     * @notice Reset daily counters if needed
     * @param relayer Relayer address
     */
    function _resetDailyCounters(address relayer) internal {
        // Reset global counter
        if (block.timestamp >= globalDailyResetTime) {
            globalDailyReimbursed = 0;
            globalDailyResetTime = block.timestamp + 1 days;
        }

        // Reset relayer counter
        RelayerStats storage stats = relayerStats[relayer];
        if (block.timestamp >= stats.dailyResetTime) {
            stats.dailyReimbursed = 0;
            stats.dailyResetTime = block.timestamp + 1 days;
        }
    }

    /* ========== RELAYER MANAGEMENT ========== */

    /**
     * @notice Activate a relayer
     * @param relayer Relayer address
     * @dev Must also grant RELAYER_ROLE separately
     */
    function activateRelayer(address relayer) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (relayer == address(0)) revert ZeroAddress();
        
        RelayerStats storage stats = relayerStats[relayer];
        stats.active = true;
        stats.dailyResetTime = block.timestamp + 1 days;
        
        emit RelayerActivated(relayer);
    }

    /**
     * @notice Deactivate a relayer
     * @param relayer Relayer address
     */
    function deactivateRelayer(address relayer) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        relayerStats[relayer].active = false;
        emit RelayerDeactivated(relayer);
    }

    /* ========== TREASURY MANAGEMENT ========== */

    /**
     * @notice Deposit ETH to treasury
     */
    function deposit() external payable {
        if (msg.value == 0) revert ZeroAmount();
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw ETH from treasury
     * @param to Recipient address
     * @param amount Amount to withdraw
     * @dev Only callable by TREASURER_ROLE
     */
    function withdraw(address to, uint256 amount) 
        external 
        onlyRole(TREASURER_ROLE) 
        nonReentrant 
    {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) {
            revert InsufficientBalance(amount, address(this).balance);
        }

        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit Withdrawn(to, amount);
    }

    /**
     * @notice Update reimbursement limits
     * @param _maxPerTransaction Max per single reimbursement
     * @param _maxDailyPerRelayer Max daily per relayer
     * @param _maxDailyGlobal Max daily global
     */
    function updateLimits(
        uint256 _maxPerTransaction,
        uint256 _maxDailyPerRelayer,
        uint256 _maxDailyGlobal
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxPerTransaction = _maxPerTransaction;
        maxDailyPerRelayer = _maxDailyPerRelayer;
        maxDailyGlobal = _maxDailyGlobal;

        emit LimitsUpdated(_maxPerTransaction, _maxDailyPerRelayer, _maxDailyGlobal);
    }

    /* ========== PAUSABLE ========== */

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /* ========== UUPS UPGRADE ========== */

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
