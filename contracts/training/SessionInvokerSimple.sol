// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ISessionKeyRegistrySimple2 {
    function consumeSession(address sessionKey) external;
    function validateSession(address sessionKey, uint8 tag) external view returns (bool);
}

interface ITrainingRewardsSimple {
    function grantReward(address learner, bytes32 campaignId, bytes32 completionProof) external;
}

interface IGasTreasuryModuleSimple {
    function reimburseGas(address relayer, uint256 amount, bytes32 txRef) external;
}

/**
 * @title SessionInvokerSimple - Action Orchestration (Non-Upgradeable)
 * @author Tolani Labs
 * @notice Simplified session invoker for Sepolia testnet
 */
contract SessionInvokerSimple is AccessControl, Pausable, ReentrancyGuard {
    /* ========== ROLES ========== */
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    /* ========== STATE VARIABLES ========== */
    ISessionKeyRegistrySimple2 public sessionRegistry;
    ITrainingRewardsSimple public trainingRewards;
    IGasTreasuryModuleSimple public gasTreasury;

    uint256 public totalInvocations;
    mapping(address => uint256) public relayerInvocations;

    /* ========== EVENTS ========== */
    event TrainingRewardInvoked(
        address indexed sessionKey,
        address indexed learner,
        bytes32 indexed campaignId,
        bytes32 completionProof
    );
    event BatchInvoked(address indexed relayer, uint256 count);

    /* ========== ERRORS ========== */
    error InvalidSession();
    error ZeroAddress();
    error EmptyBatch();
    error BatchTooLarge();

    uint256 public constant MAX_BATCH_SIZE = 50;

    constructor(
        address owner,
        address _sessionRegistry,
        address _trainingRewards,
        address _gasTreasury
    ) {
        if (owner == address(0) || _sessionRegistry == address(0) || 
            _trainingRewards == address(0) || _gasTreasury == address(0)) {
            revert ZeroAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(RELAYER_ROLE, owner);

        sessionRegistry = ISessionKeyRegistrySimple2(_sessionRegistry);
        trainingRewards = ITrainingRewardsSimple(_trainingRewards);
        gasTreasury = IGasTreasuryModuleSimple(_gasTreasury);
    }

    /* ========== INVOCATION ========== */

    /**
     * @notice Invoke a training reward via session key
     * @param sessionKey The authorized session key
     * @param learner Recipient of the reward
     * @param campaignId Campaign identifier
     * @param completionProof Proof of completion
     */
    function invokeTrainingReward(
        address sessionKey,
        address learner,
        bytes32 campaignId,
        bytes32 completionProof
    ) external onlyRole(RELAYER_ROLE) nonReentrant whenNotPaused {
        // Validate and consume session (tag 0 = TRAINING)
        if (!sessionRegistry.validateSession(sessionKey, 0)) {
            revert InvalidSession();
        }
        sessionRegistry.consumeSession(sessionKey);

        // Grant reward
        trainingRewards.grantReward(learner, campaignId, completionProof);

        totalInvocations++;
        relayerInvocations[msg.sender]++;

        emit TrainingRewardInvoked(sessionKey, learner, campaignId, completionProof);
    }

    /**
     * @notice Batch invoke multiple training rewards
     */
    struct RewardParams {
        address sessionKey;
        address learner;
        bytes32 campaignId;
        bytes32 completionProof;
    }

    function batchInvokeTrainingRewards(
        RewardParams[] calldata rewards
    ) external onlyRole(RELAYER_ROLE) nonReentrant whenNotPaused {
        if (rewards.length == 0) revert EmptyBatch();
        if (rewards.length > MAX_BATCH_SIZE) revert BatchTooLarge();

        for (uint256 i = 0; i < rewards.length; i++) {
            RewardParams calldata r = rewards[i];

            // Skip invalid sessions instead of reverting whole batch
            if (!sessionRegistry.validateSession(r.sessionKey, 0)) continue;

            sessionRegistry.consumeSession(r.sessionKey);
            trainingRewards.grantReward(r.learner, r.campaignId, r.completionProof);

            totalInvocations++;
            emit TrainingRewardInvoked(r.sessionKey, r.learner, r.campaignId, r.completionProof);
        }

        relayerInvocations[msg.sender] += rewards.length;
        emit BatchInvoked(msg.sender, rewards.length);
    }

    /* ========== ADMIN ========== */

    function updateContracts(
        address _sessionRegistry,
        address _trainingRewards,
        address _gasTreasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_sessionRegistry != address(0)) sessionRegistry = ISessionKeyRegistrySimple2(_sessionRegistry);
        if (_trainingRewards != address(0)) trainingRewards = ITrainingRewardsSimple(_trainingRewards);
        if (_gasTreasury != address(0)) gasTreasury = IGasTreasuryModuleSimple(_gasTreasury);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
