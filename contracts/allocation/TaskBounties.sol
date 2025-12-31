// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TaskBounties
 * @notice Manages bounty tasks (L.O.E - Level of Effort) with TUT rewards
 * @dev Supports task creation, claims, submissions, and approvals
 */
contract TaskBounties is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant TASK_MANAGER_ROLE = keccak256("TASK_MANAGER_ROLE");
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");

    IERC20 public immutable token;

    enum TaskStatus {
        OPEN,           // Available for claims
        CLAIMED,        // Someone is working on it
        SUBMITTED,      // Work submitted for review
        APPROVED,       // Work approved, payment pending/done
        REJECTED,       // Work rejected
        CANCELLED       // Task cancelled by manager
    }

    enum Difficulty {
        TRIVIAL,    // < 1 hour
        EASY,       // 1-4 hours
        MEDIUM,     // 4-8 hours (1 day)
        HARD,       // 1-3 days
        COMPLEX     // 3+ days
    }

    struct Task {
        string title;
        string description;
        string category;        // "development", "design", "content", "community", etc.
        uint256 reward;
        Difficulty difficulty;
        TaskStatus status;
        address creator;
        address assignee;
        uint256 createdAt;
        uint256 deadline;       // 0 = no deadline
        uint256 claimedAt;
        string submissionUrl;   // Link to completed work
    }

    struct UserStats {
        uint256 tasksCompleted;
        uint256 totalEarned;
        uint256 reputation;     // Based on completed tasks
    }

    // State
    uint256 public taskCount;
    mapping(uint256 => Task) public tasks;
    mapping(address => uint256[]) public userTasks;         // Tasks user has claimed
    mapping(address => uint256[]) public userCompleted;     // Tasks user has completed
    mapping(address => UserStats) public userStats;

    // Stats
    uint256 public totalBountiesDistributed;
    uint256 public openTaskCount;

    // Events
    event TaskCreated(
        uint256 indexed taskId,
        string title,
        string category,
        uint256 reward,
        Difficulty difficulty
    );
    event TaskClaimed(uint256 indexed taskId, address indexed assignee);
    event TaskSubmitted(uint256 indexed taskId, string submissionUrl);
    event TaskApproved(uint256 indexed taskId, address indexed assignee, uint256 reward);
    event TaskRejected(uint256 indexed taskId, string reason);
    event TaskCancelled(uint256 indexed taskId);
    event TaskUnclaimed(uint256 indexed taskId, address indexed previousAssignee);

    constructor(address _token, address _governance) {
        require(_token != address(0), "Invalid token address");
        require(_governance != address(0), "Invalid governance address");

        token = IERC20(_token);
        
        _grantRole(DEFAULT_ADMIN_ROLE, _governance);
        _grantRole(TASK_MANAGER_ROLE, _governance);
        _grantRole(REVIEWER_ROLE, _governance);
    }

    // ============ Task Management ============

    /**
     * @notice Create a new bounty task
     */
    function createTask(
        string calldata title,
        string calldata description,
        string calldata category,
        uint256 reward,
        Difficulty difficulty,
        uint256 deadline
    ) external onlyRole(TASK_MANAGER_ROLE) returns (uint256 taskId) {
        return _createTask(title, description, category, reward, difficulty, deadline);
    }

    function _createTask(
        string calldata title,
        string calldata description,
        string calldata category,
        uint256 reward,
        Difficulty difficulty,
        uint256 deadline
    ) internal returns (uint256 taskId) {
        require(bytes(title).length > 0, "Title required");
        require(reward > 0, "Reward must be > 0");
        require(deadline == 0 || deadline > block.timestamp, "Invalid deadline");

        taskId = taskCount++;
        
        tasks[taskId] = Task({
            title: title,
            description: description,
            category: category,
            reward: reward,
            difficulty: difficulty,
            status: TaskStatus.OPEN,
            creator: msg.sender,
            assignee: address(0),
            createdAt: block.timestamp,
            deadline: deadline,
            claimedAt: 0,
            submissionUrl: ""
        });

        openTaskCount++;

        emit TaskCreated(taskId, title, category, reward, difficulty);
    }

    /**
     * @notice Batch create multiple tasks
     */
    function batchCreateTasks(
        string[] calldata titles,
        string[] calldata descriptions,
        string calldata category,
        uint256[] calldata rewards,
        Difficulty difficulty,
        uint256 deadline
    ) external onlyRole(TASK_MANAGER_ROLE) {
        require(
            titles.length == descriptions.length && descriptions.length == rewards.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < titles.length; i++) {
            _createTask(titles[i], descriptions[i], category, rewards[i], difficulty, deadline);
        }
    }

    // ============ Task Workflow ============

    /**
     * @notice Claim a task to work on
     */
    function claimTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        
        require(task.createdAt > 0, "Task does not exist");
        require(task.status == TaskStatus.OPEN, "Task not available");
        require(task.deadline == 0 || block.timestamp < task.deadline, "Task deadline passed");

        task.status = TaskStatus.CLAIMED;
        task.assignee = msg.sender;
        task.claimedAt = block.timestamp;
        
        userTasks[msg.sender].push(taskId);
        openTaskCount--;

        emit TaskClaimed(taskId, msg.sender);
    }

    /**
     * @notice Unclaim a task (give up on it)
     */
    function unclaimTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        
        require(task.assignee == msg.sender, "Not your task");
        require(task.status == TaskStatus.CLAIMED, "Cannot unclaim");

        address previousAssignee = task.assignee;
        
        task.status = TaskStatus.OPEN;
        task.assignee = address(0);
        task.claimedAt = 0;
        
        openTaskCount++;

        emit TaskUnclaimed(taskId, previousAssignee);
    }

    /**
     * @notice Submit completed work
     * @param taskId The task ID
     * @param submissionUrl Link to the completed work (GitHub PR, document, etc.)
     */
    function submitTask(uint256 taskId, string calldata submissionUrl) external nonReentrant {
        Task storage task = tasks[taskId];
        
        require(task.assignee == msg.sender, "Not your task");
        require(task.status == TaskStatus.CLAIMED, "Cannot submit");
        require(bytes(submissionUrl).length > 0, "Submission URL required");

        task.status = TaskStatus.SUBMITTED;
        task.submissionUrl = submissionUrl;

        emit TaskSubmitted(taskId, submissionUrl);
    }

    /**
     * @notice Approve submitted work and pay reward
     */
    function approveTask(uint256 taskId) external onlyRole(REVIEWER_ROLE) nonReentrant {
        Task storage task = tasks[taskId];
        
        require(task.status == TaskStatus.SUBMITTED, "Not submitted");
        require(token.balanceOf(address(this)) >= task.reward, "Insufficient balance");

        task.status = TaskStatus.APPROVED;
        
        // Update stats
        UserStats storage stats = userStats[task.assignee];
        stats.tasksCompleted++;
        stats.totalEarned += task.reward;
        stats.reputation += _getReputationPoints(task.difficulty);
        
        userCompleted[task.assignee].push(taskId);
        totalBountiesDistributed += task.reward;

        // Pay reward
        token.safeTransfer(task.assignee, task.reward);

        emit TaskApproved(taskId, task.assignee, task.reward);
    }

    /**
     * @notice Reject submitted work
     */
    function rejectTask(uint256 taskId, string calldata reason) external onlyRole(REVIEWER_ROLE) {
        Task storage task = tasks[taskId];
        
        require(task.status == TaskStatus.SUBMITTED, "Not submitted");

        task.status = TaskStatus.REJECTED;

        emit TaskRejected(taskId, reason);
    }

    /**
     * @notice Allow rejected task to be resubmitted
     */
    function allowResubmission(uint256 taskId) external onlyRole(REVIEWER_ROLE) {
        Task storage task = tasks[taskId];
        
        require(task.status == TaskStatus.REJECTED, "Not rejected");

        task.status = TaskStatus.CLAIMED;
        task.submissionUrl = "";
    }

    /**
     * @notice Cancel a task
     */
    function cancelTask(uint256 taskId) external onlyRole(TASK_MANAGER_ROLE) {
        Task storage task = tasks[taskId];
        
        require(task.status == TaskStatus.OPEN || task.status == TaskStatus.CLAIMED, "Cannot cancel");

        if (task.status == TaskStatus.OPEN) {
            openTaskCount--;
        }
        
        task.status = TaskStatus.CANCELLED;

        emit TaskCancelled(taskId);
    }

    // ============ View Functions ============

    function getTask(uint256 taskId) external view returns (
        string memory title,
        string memory description,
        string memory category,
        uint256 reward,
        Difficulty difficulty,
        TaskStatus status,
        address creator,
        address assignee,
        uint256 createdAt,
        uint256 deadline,
        string memory submissionUrl
    ) {
        Task storage task = tasks[taskId];
        return (
            task.title,
            task.description,
            task.category,
            task.reward,
            task.difficulty,
            task.status,
            task.creator,
            task.assignee,
            task.createdAt,
            task.deadline,
            task.submissionUrl
        );
    }

    function getUserTasks(address user) external view returns (uint256[] memory) {
        return userTasks[user];
    }

    function getUserCompletedTasks(address user) external view returns (uint256[] memory) {
        return userCompleted[user];
    }

    function getUserStats(address user) external view returns (
        uint256 tasksCompleted,
        uint256 totalEarned,
        uint256 reputation
    ) {
        UserStats storage stats = userStats[user];
        return (stats.tasksCompleted, stats.totalEarned, stats.reputation);
    }

    function getOpenTasks() external view returns (uint256[] memory) {
        uint256[] memory openTasks = new uint256[](openTaskCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < taskCount && index < openTaskCount; i++) {
            if (tasks[i].status == TaskStatus.OPEN) {
                openTasks[index++] = i;
            }
        }
        
        return openTasks;
    }

    function getContractBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    // ============ Internal Functions ============

    function _getReputationPoints(Difficulty difficulty) internal pure returns (uint256) {
        if (difficulty == Difficulty.TRIVIAL) return 1;
        if (difficulty == Difficulty.EASY) return 3;
        if (difficulty == Difficulty.MEDIUM) return 5;
        if (difficulty == Difficulty.HARD) return 10;
        return 20; // COMPLEX
    }

    // ============ Admin Functions ============

    /**
     * @notice Withdraw tokens (emergency)
     */
    function withdrawTokens(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(to != address(0), "Invalid recipient");
        token.safeTransfer(to, amount);
    }
}
