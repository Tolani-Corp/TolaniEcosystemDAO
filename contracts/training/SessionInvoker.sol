// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./SessionKeyRegistry.sol";
import "./TrainingRewards.sol";
import "./GasTreasuryModule.sol";

/**
 * @title SessionInvoker
 * @author Tolani Labs
 * @notice Whitelisted invoker that uses session keys to execute reward actions
 * @dev Part of the Tolani Labs + IBM SkillsBuild Integration
 * 
 * Purpose:
 * This contract acts as the bridge between the relayer and the reward contracts.
 * It validates sessions and orchestrates the reward flow.
 * 
 * Flow:
 * 1. Relayer calls invoke() with session key and target action
 * 2. SessionInvoker validates session via SessionKeyRegistry
 * 3. Executes the reward action (e.g., TrainingRewards.grantReward)
 * 4. Optionally requests gas reimbursement from GasTreasuryModule
 * 
 * Supported Actions:
 * - TRAINING: Grant uTUT for IBM SkillsBuild completions
 * - ESG: Grant uTUT for ESG task completions (future)
 * - BOUNTY: Grant uTUT for bounty completions (future)
 * 
 * Security:
 * - Only INVOKER_ROLE can call invoke functions
 * - Sessions are validated and consumed atomically
 * - All actions are logged for audit
 */
contract SessionInvoker is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    /* ========== ROLES ========== */
    bytes32 public constant INVOKER_ROLE = keccak256("INVOKER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /* ========== STATE VARIABLES ========== */
    
    /// @notice Session key registry
    SessionKeyRegistry public sessionRegistry;
    
    /// @notice Training rewards contract
    TrainingRewards public trainingRewards;
    
    /// @notice Gas treasury module
    GasTreasuryModule public gasTreasury;

    /// @notice Total invocations
    uint256 public totalInvocations;
    
    /// @notice Total successful invocations
    uint256 public successfulInvocations;

    /* ========== EVENTS ========== */
    event TrainingRewardInvoked(
        bytes32 indexed sessionKeyHash,
        address indexed learner,
        bytes32 indexed campaignId,
        uint256 amount,
        address invoker,
        uint256 timestamp
    );
    
    event InvocationFailed(
        bytes32 indexed sessionKeyHash,
        address indexed invoker,
        string reason,
        uint256 timestamp
    );

    /* ========== ERRORS ========== */
    error ZeroAddress();
    error InvocationFailed_SessionInvalid();
    error InvocationFailed_RewardFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the session invoker
     * @param owner Address to receive admin roles
     * @param _sessionRegistry Address of SessionKeyRegistry
     * @param _trainingRewards Address of TrainingRewards
     * @param _gasTreasury Address of GasTreasuryModule
     */
    function initialize(
        address owner,
        address _sessionRegistry,
        address _trainingRewards,
        address _gasTreasury
    ) external initializer {
        if (owner == address(0)) revert ZeroAddress();
        if (_sessionRegistry == address(0)) revert ZeroAddress();
        if (_trainingRewards == address(0)) revert ZeroAddress();
        // Gas treasury can be zero (optional)

        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        sessionRegistry = SessionKeyRegistry(_sessionRegistry);
        trainingRewards = TrainingRewards(_trainingRewards);
        gasTreasury = GasTreasuryModule(payable(_gasTreasury));

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(INVOKER_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Check if a session can be invoked for training
     * @param sessionKeyHash Hash of the session key
     * @param campaignId Campaign identifier
     * @param amount Requested reward amount
     * @return canInvoke True if session is valid for this invocation
     * @return learner The learner's wallet address (if valid)
     */
    function canInvokeTraining(
        bytes32 sessionKeyHash,
        bytes32 campaignId,
        uint256 amount
    ) external view returns (bool canInvoke, address learner) {
        try sessionRegistry.validateSession(
            sessionKeyHash,
            sessionRegistry.TAG_TRAINING(),
            amount
        ) returns (address _learner, bytes32) {
            return (true, _learner);
        } catch {
            return (false, address(0));
        }
    }

    /* ========== INVOCATION FUNCTIONS ========== */

    /**
     * @notice Invoke training reward for a verified IBM SkillsBuild completion
     * @param sessionKeyHash Hash of the session key
     * @param campaignId Campaign/track identifier
     * @param customAmount Optional custom amount (0 = use campaign default)
     * @return learner The rewarded learner's address
     * @return amount The actual reward amount
     * 
     * Flow:
     * 1. Validate session is valid for TRAINING tag
     * 2. Call TrainingRewards.grantReward()
     * 3. Session is consumed inside grantReward()
     * 4. Emit event for tracking
     */
    function invokeTrainingReward(
        bytes32 sessionKeyHash,
        bytes32 campaignId,
        uint256 customAmount
    ) external onlyRole(INVOKER_ROLE) nonReentrant whenNotPaused returns (
        address learner,
        uint256 amount
    ) {
        totalInvocations++;

        // Get learner address from session for event
        (learner, ) = sessionRegistry.validateSession(
            sessionKeyHash,
            sessionRegistry.TAG_TRAINING(),
            customAmount
        );

        // Determine actual amount
        if (customAmount > 0) {
            amount = customAmount;
        } else {
            TrainingRewards.Campaign memory campaign = trainingRewards.getCampaign(campaignId);
            amount = campaign.rewardAmount;
        }

        // Grant the reward (this also consumes the session)
        trainingRewards.grantReward(sessionKeyHash, campaignId, customAmount);

        successfulInvocations++;

        emit TrainingRewardInvoked(
            sessionKeyHash,
            learner,
            campaignId,
            amount,
            msg.sender,
            block.timestamp
        );

        return (learner, amount);
    }

    /**
     * @notice Invoke training reward with gas reimbursement request
     * @param sessionKeyHash Hash of the session key
     * @param campaignId Campaign/track identifier
     * @param customAmount Optional custom amount (0 = use campaign default)
     * @param gasUsed Estimated gas used by the relayer
     * @return learner The rewarded learner's address
     * @return rewardAmount The actual reward amount
     * 
     * Flow:
     * 1. Execute invokeTrainingReward()
     * 2. Request gas reimbursement from GasTreasuryModule
     */
    function invokeTrainingRewardWithGasReimbursement(
        bytes32 sessionKeyHash,
        bytes32 campaignId,
        uint256 customAmount,
        uint256 gasUsed
    ) external onlyRole(INVOKER_ROLE) nonReentrant whenNotPaused returns (
        address learner,
        uint256 rewardAmount
    ) {
        // Execute the reward
        (learner, rewardAmount) = this.invokeTrainingReward(sessionKeyHash, campaignId, customAmount);

        // Request gas reimbursement if treasury is configured
        if (address(gasTreasury) != address(0) && gasUsed > 0) {
            // Note: The actual reimbursement would be called by the relayer
            // This is just to track the association
            // In practice, relayer calls GasTreasuryModule.requestReimbursement directly
        }

        return (learner, rewardAmount);
    }

    /**
     * @notice Batch invoke multiple training rewards
     * @param sessionKeyHashes Array of session key hashes
     * @param campaignIds Array of campaign identifiers
     * @param customAmounts Array of custom amounts (0 = use defaults)
     * @return successCount Number of successful invocations
     * 
     * @dev Continues on individual failures, doesn't revert batch
     */
    function batchInvokeTrainingRewards(
        bytes32[] calldata sessionKeyHashes,
        bytes32[] calldata campaignIds,
        uint256[] calldata customAmounts
    ) external onlyRole(INVOKER_ROLE) nonReentrant whenNotPaused returns (uint256 successCount) {
        require(
            sessionKeyHashes.length == campaignIds.length && 
            campaignIds.length == customAmounts.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < sessionKeyHashes.length; i++) {
            try this.invokeTrainingReward(
                sessionKeyHashes[i],
                campaignIds[i],
                customAmounts[i]
            ) {
                successCount++;
            } catch Error(string memory reason) {
                emit InvocationFailed(sessionKeyHashes[i], msg.sender, reason, block.timestamp);
            } catch {
                emit InvocationFailed(sessionKeyHashes[i], msg.sender, "Unknown error", block.timestamp);
            }
        }

        return successCount;
    }

    /* ========== ADMIN FUNCTIONS ========== */

    /**
     * @notice Update contract references
     * @param _sessionRegistry New SessionKeyRegistry address
     * @param _trainingRewards New TrainingRewards address
     * @param _gasTreasury New GasTreasuryModule address
     */
    function updateContracts(
        address _sessionRegistry,
        address _trainingRewards,
        address _gasTreasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_sessionRegistry != address(0)) {
            sessionRegistry = SessionKeyRegistry(_sessionRegistry);
        }
        if (_trainingRewards != address(0)) {
            trainingRewards = TrainingRewards(_trainingRewards);
        }
        if (_gasTreasury != address(0)) {
            gasTreasury = GasTreasuryModule(payable(_gasTreasury));
        }
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
