// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title TolaniCompliance
 * @notice Registry for compliance tracking in the Tolani ecosystem
 * @dev Compliance officers can register participants and create tasks.
 *      Participants can update their own tasks. Useful for KYC/AML tracking,
 *      regulatory compliance, and audit trails.
 */
contract TolaniCompliance is AccessControl {
    bytes32 public constant COMPLIANCE_OFFICER_ROLE = keccak256("COMPLIANCE_OFFICER_ROLE");
    bytes32 public constant PARTICIPANT_ROLE = keccak256("PARTICIPANT_ROLE");

    enum Status { Pending, InProgress, Approved, Rejected, Expired }

    struct Task {
        string taskId;
        string description;
        Status status;
        uint256 createdAt;
        uint256 updatedAt;
        uint256 deadline;
    }

    struct Participant {
        bool registered;
        uint256 registeredAt;
        string category;     // e.g., "investor", "team", "partner"
    }

    // Mapping of participant address to their info
    mapping(address => Participant) public participants;
    
    // Mapping of participant to their compliance tasks
    mapping(address => Task[]) public tasks;
    
    // Total registered participants
    uint256 public participantCount;

    event ParticipantRegistered(address indexed participant, string category);
    event ParticipantRemoved(address indexed participant);
    event TaskCreated(address indexed participant, uint256 indexed taskIndex, string taskId, string description);
    event TaskStatusUpdated(address indexed participant, uint256 indexed taskIndex, Status oldStatus, Status newStatus);
    event TaskDeadlineUpdated(address indexed participant, uint256 indexed taskIndex, uint256 newDeadline);

    /**
     * @param admin The admin address (typically DAO timelock)
     */
    constructor(address admin) {
        require(admin != address(0), "Invalid admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(COMPLIANCE_OFFICER_ROLE, admin);
    }

    /**
     * @notice Register a new participant
     * @param participant The address to register
     * @param category The participant category (e.g., "investor", "team")
     */
    function registerParticipant(address participant, string calldata category) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        require(participant != address(0), "Invalid participant");
        require(!participants[participant].registered, "Already registered");
        
        participants[participant] = Participant({
            registered: true,
            registeredAt: block.timestamp,
            category: category
        });
        
        _grantRole(PARTICIPANT_ROLE, participant);
        participantCount++;
        
        emit ParticipantRegistered(participant, category);
    }

    /**
     * @notice Remove a participant from the registry
     * @param participant The address to remove
     */
    function removeParticipant(address participant) 
        external 
        onlyRole(COMPLIANCE_OFFICER_ROLE) 
    {
        require(participants[participant].registered, "Not registered");
        
        delete participants[participant];
        _revokeRole(PARTICIPANT_ROLE, participant);
        participantCount--;
        
        emit ParticipantRemoved(participant);
    }

    /**
     * @notice Create a compliance task for a participant
     * @param participant The participant address
     * @param taskId A unique identifier for the task
     * @param description Description of the compliance requirement
     * @param deadline Unix timestamp deadline (0 for no deadline)
     */
    function createTask(
        address participant,
        string calldata taskId,
        string calldata description,
        uint256 deadline
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        require(participants[participant].registered, "Not registered");
        
        tasks[participant].push(Task({
            taskId: taskId,
            description: description,
            status: Status.Pending,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            deadline: deadline
        }));
        
        uint256 taskIndex = tasks[participant].length - 1;
        emit TaskCreated(participant, taskIndex, taskId, description);
    }

    /**
     * @notice Update the status of a compliance task
     * @dev Officers can update any task; participants can only update their own
     * @param participant The participant owning the task
     * @param taskIndex The index of the task
     * @param status The new status
     */
    function updateTaskStatus(
        address participant,
        uint256 taskIndex,
        Status status
    ) external {
        require(
            hasRole(COMPLIANCE_OFFICER_ROLE, msg.sender) || 
            (hasRole(PARTICIPANT_ROLE, msg.sender) && msg.sender == participant),
            "Not authorized"
        );
        require(taskIndex < tasks[participant].length, "Invalid task index");
        
        Task storage task = tasks[participant][taskIndex];
        Status oldStatus = task.status;
        task.status = status;
        task.updatedAt = block.timestamp;
        
        emit TaskStatusUpdated(participant, taskIndex, oldStatus, status);
    }

    /**
     * @notice Update task deadline
     * @param participant The participant address
     * @param taskIndex The task index
     * @param newDeadline New deadline timestamp
     */
    function updateTaskDeadline(
        address participant,
        uint256 taskIndex,
        uint256 newDeadline
    ) external onlyRole(COMPLIANCE_OFFICER_ROLE) {
        require(taskIndex < tasks[participant].length, "Invalid task index");
        
        tasks[participant][taskIndex].deadline = newDeadline;
        tasks[participant][taskIndex].updatedAt = block.timestamp;
        
        emit TaskDeadlineUpdated(participant, taskIndex, newDeadline);
    }

    /**
     * @notice Get all tasks for a participant
     * @param participant The participant address
     * @return Array of tasks
     */
    function getTasks(address participant) external view returns (Task[] memory) {
        return tasks[participant];
    }

    /**
     * @notice Get task count for a participant
     * @param participant The participant address
     * @return Number of tasks
     */
    function getTaskCount(address participant) external view returns (uint256) {
        return tasks[participant].length;
    }

    /**
     * @notice Check if a participant has any pending tasks
     * @param participant The participant address
     * @return hasPending True if there are pending tasks
     * @return pendingCount Number of pending tasks
     */
    function hasPendingTasks(address participant) external view returns (bool hasPending, uint256 pendingCount) {
        Task[] storage participantTasks = tasks[participant];
        for (uint256 i = 0; i < participantTasks.length; i++) {
            if (participantTasks[i].status == Status.Pending || participantTasks[i].status == Status.InProgress) {
                pendingCount++;
            }
        }
        hasPending = pendingCount > 0;
    }

    /**
     * @notice Check if a participant is fully compliant (all tasks approved)
     * @param participant The participant address
     * @return True if all tasks are approved
     */
    function isCompliant(address participant) external view returns (bool) {
        if (!participants[participant].registered) return false;
        
        Task[] storage participantTasks = tasks[participant];
        if (participantTasks.length == 0) return true;
        
        for (uint256 i = 0; i < participantTasks.length; i++) {
            if (participantTasks[i].status != Status.Approved) {
                return false;
            }
        }
        return true;
    }
}
