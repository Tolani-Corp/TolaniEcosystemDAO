// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title TrainingRewards
 * @notice Distributes TUT tokens to users who complete training courses
 * @dev Uses signature verification to validate course completions off-chain
 */
contract TrainingRewards is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    bytes32 public constant INSTRUCTOR_ROLE = keccak256("INSTRUCTOR_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    IERC20 public immutable token;

    // Course structure
    struct Course {
        string name;
        uint256 rewardAmount;    // TUT reward for completion
        uint256 maxCompletions;  // 0 = unlimited
        uint256 completions;     // Current completion count
        bool active;
        uint256 createdAt;
    }

    // Course completion record
    struct Completion {
        uint256 courseId;
        uint256 timestamp;
        uint256 reward;
    }

    // State
    uint256 public courseCount;
    mapping(uint256 => Course) public courses;
    mapping(address => mapping(uint256 => bool)) public hasCompleted; // user => courseId => completed
    mapping(address => Completion[]) public userCompletions;
    mapping(address => uint256) public totalRewardsEarned;
    
    // Signature tracking to prevent replay
    mapping(bytes32 => bool) public usedSignatures;

    // Stats
    uint256 public totalRewardsDistributed;
    uint256 public totalCompletions;

    // Events
    event CourseCreated(uint256 indexed courseId, string name, uint256 rewardAmount);
    event CourseUpdated(uint256 indexed courseId, uint256 rewardAmount, bool active);
    event CourseCompleted(
        uint256 indexed courseId, 
        address indexed user, 
        uint256 reward,
        uint256 timestamp
    );
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _token, address _governance) {
        require(_token != address(0), "Invalid token address");
        require(_governance != address(0), "Invalid governance address");

        token = IERC20(_token);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _governance);
        _grantRole(MANAGER_ROLE, _governance);
    }

    // ============ Course Management ============

    /**
     * @notice Create a new training course
     * @param name Course name/identifier
     * @param rewardAmount TUT tokens awarded on completion
     * @param maxCompletions Maximum number of completions (0 = unlimited)
     */
    function createCourse(
        string calldata name,
        uint256 rewardAmount,
        uint256 maxCompletions
    ) external onlyRole(MANAGER_ROLE) returns (uint256 courseId) {
        courseId = courseCount++;
        
        courses[courseId] = Course({
            name: name,
            rewardAmount: rewardAmount,
            maxCompletions: maxCompletions,
            completions: 0,
            active: true,
            createdAt: block.timestamp
        });

        emit CourseCreated(courseId, name, rewardAmount);
    }

    /**
     * @notice Update course parameters
     */
    function updateCourse(
        uint256 courseId,
        uint256 rewardAmount,
        uint256 maxCompletions,
        bool active
    ) external onlyRole(MANAGER_ROLE) {
        require(courseId < courseCount, "Course does not exist");
        
        Course storage course = courses[courseId];
        course.rewardAmount = rewardAmount;
        course.maxCompletions = maxCompletions;
        course.active = active;

        emit CourseUpdated(courseId, rewardAmount, active);
    }

    // ============ Course Completion ============

    /**
     * @notice Complete a course with instructor signature verification
     * @param courseId The course being completed
     * @param signature Instructor's signature confirming completion
     * @param nonce Unique nonce to prevent replay attacks
     * 
     * The signature must be over: keccak256(abi.encodePacked(user, courseId, nonce, chainId, contractAddress))
     */
    function completeCourse(
        uint256 courseId,
        bytes calldata signature,
        uint256 nonce
    ) external nonReentrant {
        require(courseId < courseCount, "Course does not exist");
        require(!hasCompleted[msg.sender][courseId], "Already completed this course");
        
        Course storage course = courses[courseId];
        require(course.active, "Course is not active");
        require(
            course.maxCompletions == 0 || course.completions < course.maxCompletions,
            "Course completion limit reached"
        );

        // Verify signature
        bytes32 messageHash = keccak256(abi.encodePacked(
            msg.sender,
            courseId,
            nonce,
            block.chainid,
            address(this)
        ));
        
        require(!usedSignatures[messageHash], "Signature already used");
        
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        
        require(hasRole(INSTRUCTOR_ROLE, signer), "Invalid instructor signature");

        // Mark signature as used
        usedSignatures[messageHash] = true;

        // Record completion
        hasCompleted[msg.sender][courseId] = true;
        course.completions++;
        totalCompletions++;

        // Transfer reward
        uint256 reward = course.rewardAmount;
        if (reward > 0) {
            require(token.balanceOf(address(this)) >= reward, "Insufficient reward balance");
            
            userCompletions[msg.sender].push(Completion({
                courseId: courseId,
                timestamp: block.timestamp,
                reward: reward
            }));
            
            totalRewardsEarned[msg.sender] += reward;
            totalRewardsDistributed += reward;
            
            token.safeTransfer(msg.sender, reward);
        }

        emit CourseCompleted(courseId, msg.sender, reward, block.timestamp);
    }

    /**
     * @notice Instructor directly marks completion (for admin use)
     * @dev Useful for manual overrides or legacy completions
     */
    function markCompletion(
        address user,
        uint256 courseId
    ) external onlyRole(INSTRUCTOR_ROLE) nonReentrant {
        require(courseId < courseCount, "Course does not exist");
        require(!hasCompleted[user][courseId], "Already completed");
        
        Course storage course = courses[courseId];
        require(course.active, "Course is not active");

        hasCompleted[user][courseId] = true;
        course.completions++;
        totalCompletions++;

        uint256 reward = course.rewardAmount;
        if (reward > 0 && token.balanceOf(address(this)) >= reward) {
            userCompletions[user].push(Completion({
                courseId: courseId,
                timestamp: block.timestamp,
                reward: reward
            }));
            
            totalRewardsEarned[user] += reward;
            totalRewardsDistributed += reward;
            
            token.safeTransfer(user, reward);
        }

        emit CourseCompleted(courseId, user, reward, block.timestamp);
    }

    /**
     * @notice Batch mark completions for multiple users
     */
    function batchMarkCompletions(
        address[] calldata users,
        uint256 courseId
    ) external onlyRole(INSTRUCTOR_ROLE) nonReentrant {
        require(courseId < courseCount, "Course does not exist");
        
        Course storage course = courses[courseId];
        require(course.active, "Course is not active");

        uint256 reward = course.rewardAmount;
        uint256 balance = token.balanceOf(address(this));

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            
            if (hasCompleted[user][courseId]) continue;
            
            hasCompleted[user][courseId] = true;
            course.completions++;
            totalCompletions++;

            if (reward > 0 && balance >= reward) {
                userCompletions[user].push(Completion({
                    courseId: courseId,
                    timestamp: block.timestamp,
                    reward: reward
                }));
                
                totalRewardsEarned[user] += reward;
                totalRewardsDistributed += reward;
                balance -= reward;
                
                token.safeTransfer(user, reward);
            }

            emit CourseCompleted(courseId, user, reward, block.timestamp);
        }
    }

    // ============ View Functions ============

    function getCourse(uint256 courseId) external view returns (
        string memory name,
        uint256 rewardAmount,
        uint256 maxCompletions,
        uint256 completions,
        bool active,
        uint256 createdAt
    ) {
        require(courseId < courseCount, "Course does not exist");
        Course storage course = courses[courseId];
        return (
            course.name,
            course.rewardAmount,
            course.maxCompletions,
            course.completions,
            course.active,
            course.createdAt
        );
    }

    function getUserCompletions(address user) external view returns (Completion[] memory) {
        return userCompletions[user];
    }

    function getUserCompletionCount(address user) external view returns (uint256) {
        return userCompletions[user].length;
    }

    function hasUserCompletedCourse(address user, uint256 courseId) external view returns (bool) {
        return hasCompleted[user][courseId];
    }

    function getContractBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    // ============ Admin Functions ============

    /**
     * @notice Withdraw tokens (emergency or reallocation)
     */
    function withdrawTokens(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        token.safeTransfer(to, amount);
    }
}
