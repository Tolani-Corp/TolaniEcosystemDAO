// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IWorldID.sol";

/**
 * @title TrainingRewardsWorldID
 * @notice Training rewards with World ID anti-sybil protection
 * @dev Extends TrainingRewards functionality with proof-of-humanity verification
 * 
 * Features:
 * - World ID verification for learners
 * - Optional World ID requirement per course
 * - Higher reward multiplier for verified humans
 * - Sybil-resistant reward distribution
 */
contract TrainingRewardsWorldID is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant INSTRUCTOR_ROLE = keccak256("INSTRUCTOR_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    IERC20 public immutable token;
    IWorldID public immutable worldId;
    
    /// @notice World ID app configuration
    uint256 public immutable appId;
    uint256 public immutable actionId;
    uint256 public groupId = 1; // 1 = Orb verified

    /// @notice Reward multiplier for World ID verified users (in basis points, 10000 = 100%)
    uint256 public verifiedMultiplier = 15000; // 150% rewards for verified humans
    
    /// @notice Course structure with World ID requirement option
    struct Course {
        string name;
        uint256 rewardAmount;
        uint256 maxCompletions;
        uint256 completions;
        bool active;
        bool requiresWorldID; // If true, only World ID verified users can complete
        uint256 createdAt;
    }

    /// @notice Completion record
    struct Completion {
        uint256 courseId;
        uint256 timestamp;
        uint256 reward;
        bool wasVerified; // Whether user was World ID verified at completion
    }

    // State
    uint256 public courseCount;
    mapping(uint256 => Course) public courses;
    mapping(address => mapping(uint256 => bool)) public hasCompleted;
    mapping(address => Completion[]) public userCompletions;
    mapping(address => uint256) public totalRewardsEarned;
    
    // World ID state
    mapping(uint256 => bool) public nullifierHashes;
    mapping(address => bool) public isVerified;
    mapping(address => uint256) public walletNullifier;
    
    // Stats
    uint256 public totalRewardsDistributed;
    uint256 public totalCompletions;
    uint256 public verifiedCompletions;

    // Events
    event CourseCreated(uint256 indexed courseId, string name, uint256 rewardAmount, bool requiresWorldID);
    event CourseUpdated(uint256 indexed courseId, uint256 rewardAmount, bool active, bool requiresWorldID);
    event CourseCompleted(
        uint256 indexed courseId, 
        address indexed user, 
        uint256 reward,
        bool wasVerified,
        uint256 timestamp
    );
    event WorldIDVerified(address indexed wallet, uint256 nullifierHash);
    event VerifiedMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier);

    // Errors
    error InvalidAddress();
    error CourseNotFound();
    error AlreadyCompleted();
    error CourseNotActive();
    error CourseFull();
    error WorldIDRequired();
    error AlreadyVerified();
    error NullifierUsed();
    error InvalidProof();
    error InsufficientBalance();

    constructor(
        address _token,
        address _worldId,
        uint256 _appId,
        uint256 _actionId,
        address _governance
    ) {
        if (_token == address(0) || _governance == address(0)) revert InvalidAddress();

        token = IERC20(_token);
        worldId = IWorldID(_worldId);
        appId = _appId;
        actionId = _actionId;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _governance);
        _grantRole(MANAGER_ROLE, _governance);
    }

    // ============ World ID Verification ============

    /**
     * @notice Verify wallet with World ID proof
     * @param root World ID Merkle root
     * @param nullifierHash Unique nullifier for this user+action
     * @param proof ZK proof from World ID
     */
    function verifyWithWorldID(
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        if (isVerified[msg.sender]) revert AlreadyVerified();
        if (nullifierHashes[nullifierHash]) revert NullifierUsed();
        
        uint256 signalHash = uint256(keccak256(abi.encodePacked(msg.sender))) >> 8;
        uint256 externalNullifierHash = uint256(
            keccak256(abi.encodePacked(appId, actionId))
        ) >> 8;
        
        worldId.verifyProof(
            root,
            groupId,
            signalHash,
            nullifierHash,
            externalNullifierHash,
            proof
        );
        
        nullifierHashes[nullifierHash] = true;
        isVerified[msg.sender] = true;
        walletNullifier[msg.sender] = nullifierHash;
        
        emit WorldIDVerified(msg.sender, nullifierHash);
    }

    /**
     * @notice Check if address is World ID verified
     */
    function isHuman(address wallet) external view returns (bool) {
        return isVerified[wallet];
    }

    // ============ Course Management ============

    /**
     * @notice Create a new course
     * @param name Course name
     * @param rewardAmount Base reward in tokens
     * @param maxCompletions Max completions (0 = unlimited)
     * @param requiresWorldID Whether World ID is required
     */
    function createCourse(
        string calldata name,
        uint256 rewardAmount,
        uint256 maxCompletions,
        bool requiresWorldID
    ) external onlyRole(MANAGER_ROLE) returns (uint256 courseId) {
        courseId = courseCount++;
        
        courses[courseId] = Course({
            name: name,
            rewardAmount: rewardAmount,
            maxCompletions: maxCompletions,
            completions: 0,
            active: true,
            requiresWorldID: requiresWorldID,
            createdAt: block.timestamp
        });

        emit CourseCreated(courseId, name, rewardAmount, requiresWorldID);
    }

    /**
     * @notice Update course parameters
     */
    function updateCourse(
        uint256 courseId,
        uint256 rewardAmount,
        uint256 maxCompletions,
        bool active,
        bool requiresWorldID
    ) external onlyRole(MANAGER_ROLE) {
        if (courseId >= courseCount) revert CourseNotFound();
        
        Course storage course = courses[courseId];
        course.rewardAmount = rewardAmount;
        course.maxCompletions = maxCompletions;
        course.active = active;
        course.requiresWorldID = requiresWorldID;

        emit CourseUpdated(courseId, rewardAmount, active, requiresWorldID);
    }

    // ============ Course Completion ============

    /**
     * @notice Mark course completion (instructor only)
     * @dev Verified humans get bonus rewards
     */
    function markCompletion(
        address user,
        uint256 courseId
    ) external onlyRole(INSTRUCTOR_ROLE) nonReentrant {
        if (courseId >= courseCount) revert CourseNotFound();
        if (hasCompleted[user][courseId]) revert AlreadyCompleted();
        
        Course storage course = courses[courseId];
        if (!course.active) revert CourseNotActive();
        if (course.maxCompletions > 0 && course.completions >= course.maxCompletions) {
            revert CourseFull();
        }
        
        // Check World ID requirement
        bool userVerified = isVerified[user];
        if (course.requiresWorldID && !userVerified) {
            revert WorldIDRequired();
        }

        // Record completion
        hasCompleted[user][courseId] = true;
        course.completions++;
        totalCompletions++;
        
        if (userVerified) {
            verifiedCompletions++;
        }

        // Calculate reward (verified humans get multiplier)
        uint256 reward = course.rewardAmount;
        if (userVerified && verifiedMultiplier > 10000) {
            reward = (reward * verifiedMultiplier) / 10000;
        }
        
        // Transfer reward
        if (reward > 0) {
            if (token.balanceOf(address(this)) < reward) revert InsufficientBalance();
            
            userCompletions[user].push(Completion({
                courseId: courseId,
                timestamp: block.timestamp,
                reward: reward,
                wasVerified: userVerified
            }));
            
            totalRewardsEarned[user] += reward;
            totalRewardsDistributed += reward;
            
            token.safeTransfer(user, reward);
        }

        emit CourseCompleted(courseId, user, reward, userVerified, block.timestamp);
    }

    /**
     * @notice Batch mark completions
     */
    function batchMarkCompletions(
        address[] calldata users,
        uint256 courseId
    ) external onlyRole(INSTRUCTOR_ROLE) nonReentrant {
        if (courseId >= courseCount) revert CourseNotFound();
        
        Course storage course = courses[courseId];
        if (!course.active) revert CourseNotActive();

        uint256 balance = token.balanceOf(address(this));

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            
            if (hasCompleted[user][courseId]) continue;
            
            bool userVerified = isVerified[user];
            if (course.requiresWorldID && !userVerified) continue;
            
            if (course.maxCompletions > 0 && course.completions >= course.maxCompletions) break;

            hasCompleted[user][courseId] = true;
            course.completions++;
            totalCompletions++;
            
            if (userVerified) verifiedCompletions++;

            uint256 reward = course.rewardAmount;
            if (userVerified && verifiedMultiplier > 10000) {
                reward = (reward * verifiedMultiplier) / 10000;
            }
            
            if (reward > 0 && balance >= reward) {
                userCompletions[user].push(Completion({
                    courseId: courseId,
                    timestamp: block.timestamp,
                    reward: reward,
                    wasVerified: userVerified
                }));
                
                totalRewardsEarned[user] += reward;
                totalRewardsDistributed += reward;
                balance -= reward;
                
                token.safeTransfer(user, reward);
            }

            emit CourseCompleted(courseId, user, reward, userVerified, block.timestamp);
        }
    }

    // ============ Configuration ============

    /**
     * @notice Set verified user reward multiplier
     * @param _multiplier Multiplier in basis points (15000 = 150%)
     */
    function setVerifiedMultiplier(uint256 _multiplier) external onlyRole(MANAGER_ROLE) {
        require(_multiplier >= 10000, "Multiplier must be >= 100%");
        require(_multiplier <= 30000, "Multiplier must be <= 300%");
        
        uint256 oldMultiplier = verifiedMultiplier;
        verifiedMultiplier = _multiplier;
        
        emit VerifiedMultiplierUpdated(oldMultiplier, _multiplier);
    }

    /**
     * @notice Set World ID group (1 = Orb, 0 = Device)
     */
    function setGroupId(uint256 _groupId) external onlyRole(MANAGER_ROLE) {
        require(_groupId <= 1, "Invalid group ID");
        groupId = _groupId;
    }

    // ============ View Functions ============

    /**
     * @notice Get course details
     */
    function getCourse(uint256 courseId) external view returns (Course memory) {
        return courses[courseId];
    }

    /**
     * @notice Get user completion count
     */
    function getUserCompletionCount(address user) external view returns (uint256) {
        return userCompletions[user].length;
    }

    /**
     * @notice Get stats
     */
    function getStats() external view returns (
        uint256 _courseCount,
        uint256 _totalCompletions,
        uint256 _verifiedCompletions,
        uint256 _totalRewardsDistributed
    ) {
        return (courseCount, totalCompletions, verifiedCompletions, totalRewardsDistributed);
    }

    /**
     * @notice Withdraw tokens (governance only)
     */
    function withdrawTokens(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        token.safeTransfer(to, amount);
    }
}
