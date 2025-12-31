// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title VestingManager
 * @notice Manages token vesting schedules for founders, advisors, and early stakeholders
 * @dev Supports cliff periods, linear vesting, and revocable schedules
 */
contract VestingManager is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant VESTING_ADMIN_ROLE = keccak256("VESTING_ADMIN_ROLE");

    IERC20 public immutable token;

    // Vesting schedule structure
    struct VestingSchedule {
        address beneficiary;         // Who receives the tokens
        uint256 totalAmount;         // Total tokens to vest
        uint256 released;            // Tokens already released
        uint256 startTime;           // Vesting start timestamp
        uint256 cliffDuration;       // Cliff period in seconds
        uint256 vestingDuration;     // Total vesting duration in seconds
        bool revocable;              // Can be revoked by admin
        bool revoked;                // Has been revoked
        string category;             // "founder", "advisor", "team", etc.
    }

    // State
    mapping(bytes32 => VestingSchedule) public vestingSchedules;
    mapping(address => bytes32[]) public beneficiarySchedules;
    bytes32[] public allScheduleIds;
    
    uint256 public totalVestingAmount;
    uint256 public totalReleased;

    // Category tracking
    mapping(string => uint256) public categoryAllocated;
    mapping(string => uint256) public categoryLimits;

    // Events
    event VestingScheduleCreated(
        bytes32 indexed scheduleId,
        address indexed beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        string category
    );
    event TokensReleased(bytes32 indexed scheduleId, address indexed beneficiary, uint256 amount);
    event VestingRevoked(bytes32 indexed scheduleId, uint256 unvestedAmount);
    event CategoryLimitSet(string category, uint256 limit);

    constructor(address _token, address _governance) {
        require(_token != address(0), "Invalid token address");
        require(_governance != address(0), "Invalid governance address");

        token = IERC20(_token);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _governance);
        _grantRole(VESTING_ADMIN_ROLE, _governance);
    }

    // ============ Category Management ============

    /**
     * @notice Set allocation limit for a category
     * @param category Category name (e.g., "founder", "advisor", "team")
     * @param limit Maximum tokens that can be vested for this category
     */
    function setCategoryLimit(string calldata category, uint256 limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(limit >= categoryAllocated[category], "Limit below allocated amount");
        categoryLimits[category] = limit;
        emit CategoryLimitSet(category, limit);
    }

    // ============ Vesting Schedule Management ============

    /**
     * @notice Create a new vesting schedule
     * @param beneficiary Address that will receive the vested tokens
     * @param amount Total amount of tokens to vest
     * @param startTime Unix timestamp when vesting starts
     * @param cliffDuration Duration of cliff period in seconds (tokens locked)
     * @param vestingDuration Total duration of vesting in seconds (including cliff)
     * @param revocable Whether the schedule can be revoked
     * @param category Category for tracking (founder, advisor, team, etc.)
     */
    function createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable,
        string calldata category
    ) external onlyRole(VESTING_ADMIN_ROLE) returns (bytes32 scheduleId) {
        return _createVestingSchedule(beneficiary, amount, startTime, cliffDuration, vestingDuration, revocable, category);
    }

    function _createVestingSchedule(
        address beneficiary,
        uint256 amount,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable,
        string calldata category
    ) internal returns (bytes32 scheduleId) {
        require(beneficiary != address(0), "Invalid beneficiary");
        require(amount > 0, "Amount must be > 0");
        require(vestingDuration > 0, "Duration must be > 0");
        require(cliffDuration <= vestingDuration, "Cliff exceeds duration");
        require(startTime >= block.timestamp || startTime == 0, "Start time in past");

        // Check category limit
        if (categoryLimits[category] > 0) {
            require(
                categoryAllocated[category] + amount <= categoryLimits[category],
                "Exceeds category limit"
            );
        }

        // Generate unique schedule ID
        scheduleId = keccak256(abi.encodePacked(
            beneficiary,
            amount,
            startTime,
            block.timestamp,
            allScheduleIds.length
        ));

        require(vestingSchedules[scheduleId].beneficiary == address(0), "Schedule already exists");

        // Use current time if startTime is 0
        uint256 actualStartTime = startTime == 0 ? block.timestamp : startTime;

        vestingSchedules[scheduleId] = VestingSchedule({
            beneficiary: beneficiary,
            totalAmount: amount,
            released: 0,
            startTime: actualStartTime,
            cliffDuration: cliffDuration,
            vestingDuration: vestingDuration,
            revocable: revocable,
            revoked: false,
            category: category
        });

        beneficiarySchedules[beneficiary].push(scheduleId);
        allScheduleIds.push(scheduleId);
        
        totalVestingAmount += amount;
        categoryAllocated[category] += amount;

        emit VestingScheduleCreated(
            scheduleId,
            beneficiary,
            amount,
            actualStartTime,
            cliffDuration,
            vestingDuration,
            category
        );
    }

    /**
     * @notice Create multiple vesting schedules in a batch
     */
    function batchCreateVestingSchedules(
        address[] calldata beneficiaries,
        uint256[] calldata amounts,
        uint256 startTime,
        uint256 cliffDuration,
        uint256 vestingDuration,
        bool revocable,
        string calldata category
    ) external onlyRole(VESTING_ADMIN_ROLE) {
        require(beneficiaries.length == amounts.length, "Array length mismatch");
        
        for (uint256 i = 0; i < beneficiaries.length; i++) {
            _createVestingSchedule(
                beneficiaries[i],
                amounts[i],
                startTime,
                cliffDuration,
                vestingDuration,
                revocable,
                category
            );
        }
    }

    // ============ Token Release ============

    /**
     * @notice Release vested tokens for a schedule
     * @param scheduleId The vesting schedule ID
     */
    function release(bytes32 scheduleId) external nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        
        require(schedule.beneficiary != address(0), "Schedule does not exist");
        require(!schedule.revoked, "Schedule has been revoked");

        uint256 releasable = _releasableAmount(schedule);
        require(releasable > 0, "No tokens to release");

        schedule.released += releasable;
        totalReleased += releasable;

        token.safeTransfer(schedule.beneficiary, releasable);

        emit TokensReleased(scheduleId, schedule.beneficiary, releasable);
    }

    /**
     * @notice Release all vested tokens for a beneficiary across all schedules
     */
    function releaseAll() external nonReentrant {
        bytes32[] storage scheduleIds = beneficiarySchedules[msg.sender];
        
        uint256 totalReleasable = 0;
        
        for (uint256 i = 0; i < scheduleIds.length; i++) {
            VestingSchedule storage schedule = vestingSchedules[scheduleIds[i]];
            
            if (schedule.revoked) continue;
            
            uint256 releasable = _releasableAmount(schedule);
            if (releasable > 0) {
                schedule.released += releasable;
                totalReleasable += releasable;
                
                emit TokensReleased(scheduleIds[i], msg.sender, releasable);
            }
        }

        require(totalReleasable > 0, "No tokens to release");
        
        totalReleased += totalReleasable;
        token.safeTransfer(msg.sender, totalReleasable);
    }

    /**
     * @notice Revoke a vesting schedule (only if revocable)
     * @param scheduleId The vesting schedule ID
     */
    function revoke(bytes32 scheduleId) external onlyRole(VESTING_ADMIN_ROLE) nonReentrant {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        
        require(schedule.beneficiary != address(0), "Schedule does not exist");
        require(schedule.revocable, "Schedule is not revocable");
        require(!schedule.revoked, "Already revoked");

        // Release any vested amount first
        uint256 releasable = _releasableAmount(schedule);
        if (releasable > 0) {
            schedule.released += releasable;
            totalReleased += releasable;
            token.safeTransfer(schedule.beneficiary, releasable);
            emit TokensReleased(scheduleId, schedule.beneficiary, releasable);
        }

        // Calculate unvested amount
        uint256 unvested = schedule.totalAmount - schedule.released;
        
        schedule.revoked = true;
        totalVestingAmount -= unvested;
        categoryAllocated[schedule.category] -= unvested;

        emit VestingRevoked(scheduleId, unvested);
    }

    // ============ View Functions ============

    /**
     * @notice Get releasable amount for a schedule
     */
    function getReleasableAmount(bytes32 scheduleId) external view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        return _releasableAmount(schedule);
    }

    /**
     * @notice Get total releasable amount for a beneficiary
     */
    function getTotalReleasable(address beneficiary) external view returns (uint256) {
        bytes32[] storage scheduleIds = beneficiarySchedules[beneficiary];
        uint256 total = 0;
        
        for (uint256 i = 0; i < scheduleIds.length; i++) {
            VestingSchedule storage schedule = vestingSchedules[scheduleIds[i]];
            if (!schedule.revoked) {
                total += _releasableAmount(schedule);
            }
        }
        
        return total;
    }

    /**
     * @notice Get vested amount for a schedule
     */
    function getVestedAmount(bytes32 scheduleId) external view returns (uint256) {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        return _vestedAmount(schedule);
    }

    /**
     * @notice Get schedule details
     */
    function getSchedule(bytes32 scheduleId) external view returns (
        address beneficiary,
        uint256 totalAmount,
        uint256 released,
        uint256 releasable,
        uint256 startTime,
        uint256 cliffEnd,
        uint256 vestingEnd,
        bool revocable,
        bool revoked,
        string memory category
    ) {
        VestingSchedule storage schedule = vestingSchedules[scheduleId];
        return (
            schedule.beneficiary,
            schedule.totalAmount,
            schedule.released,
            _releasableAmount(schedule),
            schedule.startTime,
            schedule.startTime + schedule.cliffDuration,
            schedule.startTime + schedule.vestingDuration,
            schedule.revocable,
            schedule.revoked,
            schedule.category
        );
    }

    /**
     * @notice Get all schedules for a beneficiary
     */
    function getBeneficiarySchedules(address beneficiary) external view returns (bytes32[] memory) {
        return beneficiarySchedules[beneficiary];
    }

    /**
     * @notice Get total schedules count
     */
    function getScheduleCount() external view returns (uint256) {
        return allScheduleIds.length;
    }

    function getCategoryInfo(string calldata category) external view returns (
        uint256 allocated,
        uint256 limit,
        uint256 available
    ) {
        allocated = categoryAllocated[category];
        limit = categoryLimits[category];
        available = limit > allocated ? limit - allocated : 0;
    }

    // ============ Internal Functions ============

    function _vestedAmount(VestingSchedule storage schedule) internal view returns (uint256) {
        if (schedule.revoked) {
            return schedule.released;
        }

        if (block.timestamp < schedule.startTime + schedule.cliffDuration) {
            return 0;
        }

        if (block.timestamp >= schedule.startTime + schedule.vestingDuration) {
            return schedule.totalAmount;
        }

        // Linear vesting after cliff
        uint256 timeFromStart = block.timestamp - schedule.startTime;
        return (schedule.totalAmount * timeFromStart) / schedule.vestingDuration;
    }

    function _releasableAmount(VestingSchedule storage schedule) internal view returns (uint256) {
        return _vestedAmount(schedule) - schedule.released;
    }

    // ============ Admin Functions ============

    /**
     * @notice Withdraw unvested tokens (emergency only)
     */
    function withdrawUnvested(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        
        uint256 balance = token.balanceOf(address(this));
        uint256 pendingVesting = totalVestingAmount - totalReleased;
        
        require(balance - pendingVesting >= amount, "Cannot withdraw vesting tokens");
        
        token.safeTransfer(to, amount);
    }
}
