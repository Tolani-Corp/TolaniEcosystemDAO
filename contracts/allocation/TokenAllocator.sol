// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TokenAllocator
 * @notice Master contract for managing TUT token allocation pools
 * @dev Manages different allocation categories with configurable limits
 */
contract TokenAllocator is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ALLOCATOR_ROLE = keccak256("ALLOCATOR_ROLE");
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");

    IERC20 public immutable token;

    // Allocation categories
    enum Category {
        TRAINING_REWARDS,      // Learning & onboarding rewards
        TASK_BOUNTIES,         // L.O.E task completion
        ECOSYSTEM_GRANTS,      // Project funding
        COMMUNITY_INCENTIVES,  // Airdrops, contests, etc.
        RESERVE,               // Emergency/future use
        TOLANI_FOUNDATION      // Tolani Foundation allocation for sustainability
    }

    struct Pool {
        uint256 allocated;      // Total allocated to this pool
        uint256 distributed;    // Amount already distributed
        uint256 limit;          // Maximum allocation allowed
        bool active;            // Whether pool accepts distributions
    }

    mapping(Category => Pool) public pools;
    
    // Track distributions per recipient per category
    mapping(Category => mapping(address => uint256)) public recipientDistributions;

    // Events
    event PoolInitialized(Category indexed category, uint256 limit);
    event PoolFunded(Category indexed category, uint256 amount);
    event TokensDistributed(Category indexed category, address indexed recipient, uint256 amount, string reason);
    event PoolLimitUpdated(Category indexed category, uint256 oldLimit, uint256 newLimit);
    event PoolStatusChanged(Category indexed category, bool active);

    constructor(address _token, address _governance) {
        require(_token != address(0), "Invalid token address");
        require(_governance != address(0), "Invalid governance address");

        token = IERC20(_token);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _governance);
        _grantRole(GOVERNANCE_ROLE, _governance);
        _grantRole(ALLOCATOR_ROLE, _governance);
    }

    /**
     * @notice Initialize a pool with a maximum limit
     * @param category The allocation category
     * @param limit Maximum tokens that can be allocated to this pool
     */
    function initializePool(Category category, uint256 limit) external onlyRole(GOVERNANCE_ROLE) {
        require(pools[category].limit == 0, "Pool already initialized");
        
        pools[category] = Pool({
            allocated: 0,
            distributed: 0,
            limit: limit,
            active: true
        });

        emit PoolInitialized(category, limit);
    }

    /**
     * @notice Fund a pool with tokens (must approve this contract first)
     * @param category The allocation category
     * @param amount Amount of tokens to add to the pool
     */
    function fundPool(Category category, uint256 amount) external onlyRole(ALLOCATOR_ROLE) {
        Pool storage pool = pools[category];
        require(pool.limit > 0, "Pool not initialized");
        require(pool.allocated + amount <= pool.limit, "Exceeds pool limit");

        pool.allocated += amount;
        token.safeTransferFrom(msg.sender, address(this), amount);

        emit PoolFunded(category, amount);
    }

    /**
     * @notice Distribute tokens from a pool to a recipient
     * @param category The allocation category
     * @param recipient Address to receive tokens
     * @param amount Amount of tokens to distribute
     * @param reason Description of why tokens are being distributed
     */
    function distribute(
        Category category,
        address recipient,
        uint256 amount,
        string calldata reason
    ) external onlyRole(ALLOCATOR_ROLE) nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        
        Pool storage pool = pools[category];
        require(pool.active, "Pool is not active");
        require(pool.allocated - pool.distributed >= amount, "Insufficient pool balance");

        pool.distributed += amount;
        recipientDistributions[category][recipient] += amount;
        
        token.safeTransfer(recipient, amount);

        emit TokensDistributed(category, recipient, amount, reason);
    }

    /**
     * @notice Batch distribute tokens to multiple recipients
     * @param category The allocation category
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to distribute
     * @param reasons Array of distribution reasons
     */
    function batchDistribute(
        Category category,
        address[] calldata recipients,
        uint256[] calldata amounts,
        string[] calldata reasons
    ) external onlyRole(ALLOCATOR_ROLE) nonReentrant {
        require(recipients.length == amounts.length && amounts.length == reasons.length, "Array length mismatch");
        
        Pool storage pool = pools[category];
        require(pool.active, "Pool is not active");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        require(pool.allocated - pool.distributed >= totalAmount, "Insufficient pool balance");

        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            
            pool.distributed += amounts[i];
            recipientDistributions[category][recipients[i]] += amounts[i];
            
            token.safeTransfer(recipients[i], amounts[i]);
            
            emit TokensDistributed(category, recipients[i], amounts[i], reasons[i]);
        }
    }

    /**
     * @notice Update pool limit (governance only)
     */
    function updatePoolLimit(Category category, uint256 newLimit) external onlyRole(GOVERNANCE_ROLE) {
        Pool storage pool = pools[category];
        require(pool.limit > 0, "Pool not initialized");
        require(newLimit >= pool.allocated, "New limit below allocated amount");

        uint256 oldLimit = pool.limit;
        pool.limit = newLimit;

        emit PoolLimitUpdated(category, oldLimit, newLimit);
    }

    /**
     * @notice Pause/unpause a pool
     */
    function setPoolStatus(Category category, bool active) external onlyRole(GOVERNANCE_ROLE) {
        pools[category].active = active;
        emit PoolStatusChanged(category, active);
    }

    // View functions
    function getPoolInfo(Category category) external view returns (
        uint256 allocated,
        uint256 distributed,
        uint256 available,
        uint256 limit,
        bool active
    ) {
        Pool storage pool = pools[category];
        return (
            pool.allocated,
            pool.distributed,
            pool.allocated - pool.distributed,
            pool.limit,
            pool.active
        );
    }

    function getRecipientTotal(Category category, address recipient) external view returns (uint256) {
        return recipientDistributions[category][recipient];
    }
}
