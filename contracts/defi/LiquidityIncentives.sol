// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title LiquidityIncentives
 * @notice Reward liquidity providers for providing TUT liquidity on DEXs
 * @dev Users deposit LP tokens and earn TUT rewards
 */
contract LiquidityIncentives is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant INCENTIVE_MANAGER_ROLE = keccak256("INCENTIVE_MANAGER_ROLE");

    IERC20 public immutable rewardToken; // TUT

    struct PoolInfo {
        IERC20 lpToken;           // LP token address
        uint256 allocPoint;       // Allocation points for this pool
        uint256 lastRewardTime;   // Last timestamp rewards were calculated
        uint256 accRewardPerShare; // Accumulated rewards per share
        uint256 totalDeposited;   // Total LP tokens deposited
        string name;              // Pool name (e.g., "TUT-ETH")
        bool active;              // Whether pool is active
    }

    struct UserInfo {
        uint256 amount;     // LP tokens deposited
        uint256 rewardDebt; // Reward debt
        uint256 pendingRewards; // Accumulated unclaimed rewards
    }

    // Pool management
    PoolInfo[] public pools;
    mapping(address => uint256) public lpTokenToPoolId;
    mapping(address => bool) public isLpTokenAdded;

    // User data
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    // Reward configuration
    uint256 public rewardPerSecond;
    uint256 public totalAllocPoint;
    uint256 public startTime;
    uint256 public endTime;

    // Stats
    uint256 public totalRewardsDistributed;

    // Events
    event PoolAdded(uint256 indexed pid, address indexed lpToken, uint256 allocPoint, string name);
    event PoolUpdated(uint256 indexed pid, uint256 allocPoint, bool active);
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 indexed pid, uint256 amount);
    event RewardRateUpdated(uint256 newRate, uint256 endTime);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);

    constructor(
        address _rewardToken,
        uint256 _rewardPerSecond,
        uint256 _startTime,
        uint256 _duration,
        address _governance
    ) {
        require(_rewardToken != address(0), "Invalid reward token");
        require(_governance != address(0), "Invalid governance");

        rewardToken = IERC20(_rewardToken);
        rewardPerSecond = _rewardPerSecond;
        startTime = _startTime > block.timestamp ? _startTime : block.timestamp;
        endTime = startTime + _duration;

        _grantRole(DEFAULT_ADMIN_ROLE, _governance);
        _grantRole(INCENTIVE_MANAGER_ROLE, _governance);
    }

    // ============ Pool Management ============

    /**
     * @notice Add a new LP pool for incentives
     * @param _lpToken LP token address
     * @param _allocPoint Allocation points (weight for rewards)
     * @param _name Pool name
     */
    function addPool(
        address _lpToken,
        uint256 _allocPoint,
        string memory _name
    ) external onlyRole(INCENTIVE_MANAGER_ROLE) {
        require(_lpToken != address(0), "Invalid LP token");
        require(!isLpTokenAdded[_lpToken], "Pool already exists");

        _massUpdatePools();

        uint256 pid = pools.length;
        pools.push(PoolInfo({
            lpToken: IERC20(_lpToken),
            allocPoint: _allocPoint,
            lastRewardTime: block.timestamp > startTime ? block.timestamp : startTime,
            accRewardPerShare: 0,
            totalDeposited: 0,
            name: _name,
            active: true
        }));

        totalAllocPoint += _allocPoint;
        lpTokenToPoolId[_lpToken] = pid;
        isLpTokenAdded[_lpToken] = true;

        emit PoolAdded(pid, _lpToken, _allocPoint, _name);
    }

    /**
     * @notice Update pool allocation points
     */
    function setPool(
        uint256 _pid,
        uint256 _allocPoint,
        bool _active
    ) external onlyRole(INCENTIVE_MANAGER_ROLE) {
        require(_pid < pools.length, "Invalid pool");

        _massUpdatePools();

        totalAllocPoint = totalAllocPoint - pools[_pid].allocPoint + _allocPoint;
        pools[_pid].allocPoint = _allocPoint;
        pools[_pid].active = _active;

        emit PoolUpdated(_pid, _allocPoint, _active);
    }

    /**
     * @notice Update reward rate and extend duration
     */
    function setRewardRate(
        uint256 _rewardPerSecond,
        uint256 _additionalDuration
    ) external onlyRole(INCENTIVE_MANAGER_ROLE) {
        _massUpdatePools();

        rewardPerSecond = _rewardPerSecond;
        if (_additionalDuration > 0) {
            endTime = block.timestamp + _additionalDuration;
        }

        emit RewardRateUpdated(_rewardPerSecond, endTime);
    }

    // ============ User Functions ============

    /**
     * @notice Deposit LP tokens to earn rewards
     * @param _pid Pool ID
     * @param _amount Amount of LP tokens to deposit
     */
    function deposit(uint256 _pid, uint256 _amount) external nonReentrant {
        require(_pid < pools.length, "Invalid pool");
        require(_amount > 0, "Amount must be > 0");
        
        PoolInfo storage pool = pools[_pid];
        require(pool.active, "Pool not active");

        UserInfo storage user = userInfo[_pid][msg.sender];

        _updatePool(_pid);

        // Calculate pending rewards
        if (user.amount > 0) {
            uint256 pending = (user.amount * pool.accRewardPerShare) / 1e18 - user.rewardDebt;
            user.pendingRewards += pending;
        }

        // Transfer LP tokens
        pool.lpToken.safeTransferFrom(msg.sender, address(this), _amount);

        // Update user state
        user.amount += _amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e18;
        pool.totalDeposited += _amount;

        emit Deposit(msg.sender, _pid, _amount);
    }

    /**
     * @notice Withdraw LP tokens
     * @param _pid Pool ID
     * @param _amount Amount to withdraw
     */
    function withdraw(uint256 _pid, uint256 _amount) external nonReentrant {
        require(_pid < pools.length, "Invalid pool");
        
        UserInfo storage user = userInfo[_pid][msg.sender];
        require(user.amount >= _amount, "Insufficient balance");

        PoolInfo storage pool = pools[_pid];

        _updatePool(_pid);

        // Calculate pending rewards
        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e18 - user.rewardDebt;
        user.pendingRewards += pending;

        // Update user state
        user.amount -= _amount;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e18;
        pool.totalDeposited -= _amount;

        // Transfer LP tokens back
        pool.lpToken.safeTransfer(msg.sender, _amount);

        emit Withdraw(msg.sender, _pid, _amount);
    }

    /**
     * @notice Claim pending rewards
     * @param _pid Pool ID
     */
    function claimRewards(uint256 _pid) external nonReentrant {
        require(_pid < pools.length, "Invalid pool");

        PoolInfo storage pool = pools[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];

        _updatePool(_pid);

        uint256 pending = (user.amount * pool.accRewardPerShare) / 1e18 - user.rewardDebt;
        uint256 totalRewards = user.pendingRewards + pending;
        
        require(totalRewards > 0, "No rewards to claim");

        user.pendingRewards = 0;
        user.rewardDebt = (user.amount * pool.accRewardPerShare) / 1e18;

        _safeRewardTransfer(msg.sender, totalRewards);
        totalRewardsDistributed += totalRewards;

        emit RewardsClaimed(msg.sender, _pid, totalRewards);
    }

    /**
     * @notice Claim rewards from all pools
     */
    function claimAllRewards() external nonReentrant {
        uint256 totalRewards = 0;

        for (uint256 i = 0; i < pools.length; i++) {
            UserInfo storage user = userInfo[i][msg.sender];
            if (user.amount > 0 || user.pendingRewards > 0) {
                _updatePool(i);
                
                uint256 pending = (user.amount * pools[i].accRewardPerShare) / 1e18 - user.rewardDebt;
                totalRewards += user.pendingRewards + pending;
                
                user.pendingRewards = 0;
                user.rewardDebt = (user.amount * pools[i].accRewardPerShare) / 1e18;
            }
        }

        require(totalRewards > 0, "No rewards to claim");
        
        _safeRewardTransfer(msg.sender, totalRewards);
        totalRewardsDistributed += totalRewards;
    }

    /**
     * @notice Emergency withdraw without rewards
     */
    function emergencyWithdraw(uint256 _pid) external nonReentrant {
        require(_pid < pools.length, "Invalid pool");

        PoolInfo storage pool = pools[_pid];
        UserInfo storage user = userInfo[_pid][msg.sender];
        
        uint256 amount = user.amount;
        require(amount > 0, "Nothing to withdraw");

        user.amount = 0;
        user.rewardDebt = 0;
        user.pendingRewards = 0;
        pool.totalDeposited -= amount;

        pool.lpToken.safeTransfer(msg.sender, amount);

        emit EmergencyWithdraw(msg.sender, _pid, amount);
    }

    // ============ View Functions ============

    function poolLength() external view returns (uint256) {
        return pools.length;
    }

    function pendingRewards(uint256 _pid, address _user) external view returns (uint256) {
        require(_pid < pools.length, "Invalid pool");

        PoolInfo storage pool = pools[_pid];
        UserInfo storage user = userInfo[_pid][_user];

        uint256 accRewardPerShare = pool.accRewardPerShare;

        if (block.timestamp > pool.lastRewardTime && pool.totalDeposited > 0 && totalAllocPoint > 0) {
            uint256 time = _getMultiplier(pool.lastRewardTime, block.timestamp);
            uint256 rewards = (time * rewardPerSecond * pool.allocPoint) / totalAllocPoint;
            accRewardPerShare += (rewards * 1e18) / pool.totalDeposited;
        }

        return user.pendingRewards + (user.amount * accRewardPerShare) / 1e18 - user.rewardDebt;
    }

    function totalPendingRewards(address _user) external view returns (uint256 total) {
        for (uint256 i = 0; i < pools.length; i++) {
            PoolInfo storage pool = pools[i];
            UserInfo storage user = userInfo[i][_user];

            if (user.amount > 0 || user.pendingRewards > 0) {
                uint256 accRewardPerShare = pool.accRewardPerShare;

                if (block.timestamp > pool.lastRewardTime && pool.totalDeposited > 0 && totalAllocPoint > 0) {
                    uint256 time = _getMultiplier(pool.lastRewardTime, block.timestamp);
                    uint256 rewards = (time * rewardPerSecond * pool.allocPoint) / totalAllocPoint;
                    accRewardPerShare += (rewards * 1e18) / pool.totalDeposited;
                }

                total += user.pendingRewards + (user.amount * accRewardPerShare) / 1e18 - user.rewardDebt;
            }
        }
    }

    function getPoolInfo(uint256 _pid) external view returns (
        address lpToken,
        uint256 allocPoint,
        uint256 totalDeposited,
        string memory name,
        bool active
    ) {
        require(_pid < pools.length, "Invalid pool");
        PoolInfo storage pool = pools[_pid];
        return (address(pool.lpToken), pool.allocPoint, pool.totalDeposited, pool.name, pool.active);
    }

    function getUserInfo(uint256 _pid, address _user) external view returns (
        uint256 amount,
        uint256 pending
    ) {
        require(_pid < pools.length, "Invalid pool");
        UserInfo storage user = userInfo[_pid][_user];
        
        // Calculate pending
        PoolInfo storage pool = pools[_pid];
        uint256 accRewardPerShare = pool.accRewardPerShare;
        if (block.timestamp > pool.lastRewardTime && pool.totalDeposited > 0 && totalAllocPoint > 0) {
            uint256 time = _getMultiplier(pool.lastRewardTime, block.timestamp);
            uint256 rewards = (time * rewardPerSecond * pool.allocPoint) / totalAllocPoint;
            accRewardPerShare += (rewards * 1e18) / pool.totalDeposited;
        }
        
        return (
            user.amount,
            user.pendingRewards + (user.amount * accRewardPerShare) / 1e18 - user.rewardDebt
        );
    }

    function getStats() external view returns (
        uint256 _totalPools,
        uint256 _totalAllocPoint,
        uint256 _rewardPerSecond,
        uint256 _startTime,
        uint256 _endTime,
        uint256 _totalRewardsDistributed
    ) {
        return (pools.length, totalAllocPoint, rewardPerSecond, startTime, endTime, totalRewardsDistributed);
    }

    // ============ Internal Functions ============

    function _updatePool(uint256 _pid) internal {
        PoolInfo storage pool = pools[_pid];
        
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }

        if (pool.totalDeposited == 0 || totalAllocPoint == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }

        uint256 time = _getMultiplier(pool.lastRewardTime, block.timestamp);
        uint256 rewards = (time * rewardPerSecond * pool.allocPoint) / totalAllocPoint;
        pool.accRewardPerShare += (rewards * 1e18) / pool.totalDeposited;
        pool.lastRewardTime = block.timestamp;
    }

    function _massUpdatePools() internal {
        for (uint256 i = 0; i < pools.length; i++) {
            _updatePool(i);
        }
    }

    function _getMultiplier(uint256 _from, uint256 _to) internal view returns (uint256) {
        if (_from >= endTime) {
            return 0;
        }
        if (_to <= startTime) {
            return 0;
        }
        
        uint256 from = Math.max(_from, startTime);
        uint256 to = Math.min(_to, endTime);
        
        return to > from ? to - from : 0;
    }

    function _safeRewardTransfer(address _to, uint256 _amount) internal {
        uint256 rewardBal = rewardToken.balanceOf(address(this));
        if (_amount > rewardBal) {
            rewardToken.safeTransfer(_to, rewardBal);
        } else {
            rewardToken.safeTransfer(_to, _amount);
        }
    }

    // ============ Admin Functions ============

    function fundRewards(uint256 _amount) external onlyRole(INCENTIVE_MANAGER_ROLE) {
        rewardToken.safeTransferFrom(msg.sender, address(this), _amount);
    }

    function rescueTokens(address _token, address _to, uint256 _amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_to != address(0), "Invalid recipient");
        // Cannot rescue LP tokens that are deposited
        if (isLpTokenAdded[_token]) {
            uint256 pid = lpTokenToPoolId[_token];
            uint256 available = IERC20(_token).balanceOf(address(this)) - pools[pid].totalDeposited;
            require(_amount <= available, "Cannot rescue deposited tokens");
        }
        IERC20(_token).safeTransfer(_to, _amount);
    }
}
