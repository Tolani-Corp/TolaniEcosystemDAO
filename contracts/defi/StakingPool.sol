// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StakingPool
 * @notice Stake TUT to earn rewards and boost governance voting power
 * @dev Single-sided staking with configurable APY and lock periods
 */
contract StakingPool is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant REWARDS_MANAGER_ROLE = keccak256("REWARDS_MANAGER_ROLE");

    IERC20 public immutable stakingToken; // TUT
    IERC20 public immutable rewardsToken; // TUT (same token for rewards)

    // Staking tiers with different lock periods and multipliers
    enum StakeTier { FLEXIBLE, BRONZE, SILVER, GOLD, DIAMOND }

    struct TierConfig {
        uint256 lockDuration;    // Lock period in seconds
        uint256 rewardMultiplier; // Multiplier in basis points (10000 = 1x)
        uint256 votingBoost;     // Governance voting power boost (10000 = 1x)
        uint256 minStake;        // Minimum stake for this tier
    }

    struct Stake {
        uint256 amount;
        uint256 startTime;
        uint256 lockEndTime;
        StakeTier tier;
        uint256 rewardDebt;
        uint256 lastClaimTime;
    }

    // Tier configurations
    mapping(StakeTier => TierConfig) public tierConfigs;

    // User stakes
    mapping(address => Stake[]) public userStakes;
    mapping(address => uint256) public userTotalStaked;

    // Pool state
    uint256 public totalStaked;
    uint256 public rewardRate; // Rewards per second per token (scaled by 1e18)
    uint256 public accRewardPerShare; // Accumulated rewards per share (scaled by 1e18)
    uint256 public lastRewardTime;
    uint256 public rewardsEndTime;
    uint256 public totalRewardsDistributed;

    // Events
    event Staked(address indexed user, uint256 indexed stakeId, uint256 amount, StakeTier tier);
    event Unstaked(address indexed user, uint256 indexed stakeId, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RewardsAdded(uint256 amount, uint256 duration);
    event TierConfigUpdated(StakeTier tier, uint256 lockDuration, uint256 rewardMultiplier);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    constructor(
        address _stakingToken,
        address _governance
    ) {
        require(_stakingToken != address(0), "Invalid staking token");
        require(_governance != address(0), "Invalid governance");

        stakingToken = IERC20(_stakingToken);
        rewardsToken = IERC20(_stakingToken); // Same token
        lastRewardTime = block.timestamp;

        _grantRole(DEFAULT_ADMIN_ROLE, _governance);
        _grantRole(REWARDS_MANAGER_ROLE, _governance);

        // Initialize tier configs
        // FLEXIBLE: No lock, 1x rewards, 1x voting
        tierConfigs[StakeTier.FLEXIBLE] = TierConfig({
            lockDuration: 0,
            rewardMultiplier: 10000, // 1x
            votingBoost: 10000,      // 1x
            minStake: 100 * 1e18     // 100 TUT minimum
        });

        // BRONZE: 30 days, 1.25x rewards, 1.1x voting
        tierConfigs[StakeTier.BRONZE] = TierConfig({
            lockDuration: 30 days,
            rewardMultiplier: 12500, // 1.25x
            votingBoost: 11000,      // 1.1x
            minStake: 1000 * 1e18    // 1,000 TUT
        });

        // SILVER: 90 days, 1.5x rewards, 1.25x voting
        tierConfigs[StakeTier.SILVER] = TierConfig({
            lockDuration: 90 days,
            rewardMultiplier: 15000, // 1.5x
            votingBoost: 12500,      // 1.25x
            minStake: 10000 * 1e18   // 10,000 TUT
        });

        // GOLD: 180 days, 2x rewards, 1.5x voting
        tierConfigs[StakeTier.GOLD] = TierConfig({
            lockDuration: 180 days,
            rewardMultiplier: 20000, // 2x
            votingBoost: 15000,      // 1.5x
            minStake: 50000 * 1e18   // 50,000 TUT
        });

        // DIAMOND: 365 days, 3x rewards, 2x voting
        tierConfigs[StakeTier.DIAMOND] = TierConfig({
            lockDuration: 365 days,
            rewardMultiplier: 30000, // 3x
            votingBoost: 20000,      // 2x
            minStake: 100000 * 1e18  // 100,000 TUT
        });
    }

    // ============ Staking Functions ============

    /**
     * @notice Stake TUT tokens
     * @param amount Amount to stake
     * @param tier Staking tier (determines lock period and rewards)
     */
    function stake(uint256 amount, StakeTier tier) external nonReentrant {
        TierConfig memory config = tierConfigs[tier];
        require(amount >= config.minStake, "Below minimum stake");

        _updatePool();

        // Transfer tokens
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);

        // Create stake
        uint256 stakeId = userStakes[msg.sender].length;
        userStakes[msg.sender].push(Stake({
            amount: amount,
            startTime: block.timestamp,
            lockEndTime: block.timestamp + config.lockDuration,
            tier: tier,
            rewardDebt: (amount * accRewardPerShare) / 1e18,
            lastClaimTime: block.timestamp
        }));

        userTotalStaked[msg.sender] += amount;
        totalStaked += amount;

        emit Staked(msg.sender, stakeId, amount, tier);
    }

    /**
     * @notice Unstake tokens after lock period
     * @param stakeId Index of the stake to unstake
     */
    function unstake(uint256 stakeId) external nonReentrant {
        require(stakeId < userStakes[msg.sender].length, "Invalid stake ID");
        Stake storage userStake = userStakes[msg.sender][stakeId];
        require(userStake.amount > 0, "Already unstaked");
        require(block.timestamp >= userStake.lockEndTime, "Still locked");

        _updatePool();

        // Calculate and transfer pending rewards first
        uint256 pending = _pendingRewards(msg.sender, stakeId);
        if (pending > 0) {
            _safeRewardTransfer(msg.sender, pending);
            totalRewardsDistributed += pending;
            emit RewardsClaimed(msg.sender, pending);
        }

        uint256 amount = userStake.amount;
        
        // Update state
        userTotalStaked[msg.sender] -= amount;
        totalStaked -= amount;
        userStake.amount = 0;

        // Transfer staked tokens back
        stakingToken.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, stakeId, amount);
    }

    /**
     * @notice Claim pending rewards without unstaking
     */
    function claimRewards() external nonReentrant {
        _updatePool();

        uint256 totalPending = 0;
        Stake[] storage stakes = userStakes[msg.sender];

        for (uint256 i = 0; i < stakes.length; i++) {
            if (stakes[i].amount > 0) {
                uint256 pending = _pendingRewards(msg.sender, i);
                if (pending > 0) {
                    stakes[i].rewardDebt = (stakes[i].amount * accRewardPerShare) / 1e18;
                    stakes[i].lastClaimTime = block.timestamp;
                    totalPending += pending;
                }
            }
        }

        if (totalPending > 0) {
            _safeRewardTransfer(msg.sender, totalPending);
            totalRewardsDistributed += totalPending;
            emit RewardsClaimed(msg.sender, totalPending);
        }
    }

    /**
     * @notice Emergency withdraw without rewards (forfeits pending rewards)
     */
    function emergencyWithdraw(uint256 stakeId) external nonReentrant {
        require(stakeId < userStakes[msg.sender].length, "Invalid stake ID");
        Stake storage userStake = userStakes[msg.sender][stakeId];
        require(userStake.amount > 0, "Already unstaked");

        uint256 amount = userStake.amount;
        
        // Update state
        userTotalStaked[msg.sender] -= amount;
        totalStaked -= amount;
        userStake.amount = 0;

        // Transfer without rewards
        stakingToken.safeTransfer(msg.sender, amount);

        emit EmergencyWithdraw(msg.sender, amount);
    }

    // ============ Admin Functions ============

    /**
     * @notice Add rewards to the pool
     * @param amount Amount of rewards to add
     * @param duration Duration over which to distribute rewards
     */
    function addRewards(uint256 amount, uint256 duration) external onlyRole(REWARDS_MANAGER_ROLE) {
        require(amount > 0, "Amount must be > 0");
        require(duration > 0, "Duration must be > 0");

        _updatePool();

        rewardsToken.safeTransferFrom(msg.sender, address(this), amount);

        // If previous rewards period ended, start fresh
        if (block.timestamp >= rewardsEndTime) {
            rewardRate = amount / duration;
        } else {
            // Add to existing rewards
            uint256 remaining = rewardsEndTime - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (amount + leftover) / duration;
        }

        lastRewardTime = block.timestamp;
        rewardsEndTime = block.timestamp + duration;

        emit RewardsAdded(amount, duration);
    }

    /**
     * @notice Update tier configuration
     */
    function updateTierConfig(
        StakeTier tier,
        uint256 lockDuration,
        uint256 rewardMultiplier,
        uint256 votingBoost,
        uint256 minStake
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tierConfigs[tier] = TierConfig({
            lockDuration: lockDuration,
            rewardMultiplier: rewardMultiplier,
            votingBoost: votingBoost,
            minStake: minStake
        });

        emit TierConfigUpdated(tier, lockDuration, rewardMultiplier);
    }

    // ============ View Functions ============

    function pendingRewards(address user) external view returns (uint256 total) {
        Stake[] storage stakes = userStakes[user];
        uint256 _accRewardPerShare = accRewardPerShare;

        if (block.timestamp > lastRewardTime && totalStaked > 0) {
            uint256 time = _getRewardTime() - lastRewardTime;
            uint256 rewards = time * rewardRate;
            _accRewardPerShare += (rewards * 1e18) / totalStaked;
        }

        for (uint256 i = 0; i < stakes.length; i++) {
            if (stakes[i].amount > 0) {
                TierConfig memory config = tierConfigs[stakes[i].tier];
                uint256 baseReward = (stakes[i].amount * _accRewardPerShare) / 1e18 - stakes[i].rewardDebt;
                total += (baseReward * config.rewardMultiplier) / 10000;
            }
        }
    }

    function getUserStakes(address user) external view returns (Stake[] memory) {
        return userStakes[user];
    }

    function getStakeCount(address user) external view returns (uint256) {
        return userStakes[user].length;
    }

    function getVotingPower(address user) external view returns (uint256 power) {
        Stake[] storage stakes = userStakes[user];
        for (uint256 i = 0; i < stakes.length; i++) {
            if (stakes[i].amount > 0) {
                TierConfig memory config = tierConfigs[stakes[i].tier];
                power += (stakes[i].amount * config.votingBoost) / 10000;
            }
        }
    }

    function getTierConfig(StakeTier tier) external view returns (TierConfig memory) {
        return tierConfigs[tier];
    }

    function getPoolStats() external view returns (
        uint256 _totalStaked,
        uint256 _rewardRate,
        uint256 _rewardsEndTime,
        uint256 _totalRewardsDistributed
    ) {
        return (totalStaked, rewardRate, rewardsEndTime, totalRewardsDistributed);
    }

    // ============ Internal Functions ============

    function _updatePool() internal {
        if (block.timestamp <= lastRewardTime || totalStaked == 0) {
            lastRewardTime = block.timestamp;
            return;
        }

        uint256 time = _getRewardTime() - lastRewardTime;
        uint256 rewards = time * rewardRate;
        accRewardPerShare += (rewards * 1e18) / totalStaked;
        lastRewardTime = block.timestamp;
    }

    function _pendingRewards(address user, uint256 stakeId) internal view returns (uint256) {
        Stake storage userStake = userStakes[user][stakeId];
        if (userStake.amount == 0) return 0;

        TierConfig memory config = tierConfigs[userStake.tier];
        uint256 baseReward = (userStake.amount * accRewardPerShare) / 1e18 - userStake.rewardDebt;
        return (baseReward * config.rewardMultiplier) / 10000;
    }

    function _getRewardTime() internal view returns (uint256) {
        return block.timestamp < rewardsEndTime ? block.timestamp : rewardsEndTime;
    }

    function _safeRewardTransfer(address to, uint256 amount) internal {
        uint256 rewardBal = rewardsToken.balanceOf(address(this)) - totalStaked; // Exclude staked tokens
        if (amount > rewardBal) {
            rewardsToken.safeTransfer(to, rewardBal);
        } else {
            rewardsToken.safeTransfer(to, amount);
        }
    }
}
