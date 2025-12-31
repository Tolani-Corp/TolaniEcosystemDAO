// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IuTUTSimple {
    function mintReward(address to, uint256 amount, bytes32 campaignId) external;
}

interface ISessionKeyRegistrySimple {
    function consumeSession(address sessionKey) external;
    function validateSession(address sessionKey, uint8 tag) external view returns (bool);
}

/**
 * @title TrainingRewardsSimple - Campaign & Reward Management (Non-Upgradeable)
 * @author Tolani Labs
 * @notice Simplified training rewards for Sepolia testnet
 */
contract TrainingRewardsSimple is AccessControl, Pausable {
    /* ========== ROLES ========== */
    bytes32 public constant REWARDER_ROLE = keccak256("REWARDER_ROLE");
    bytes32 public constant CAMPAIGN_MANAGER_ROLE = keccak256("CAMPAIGN_MANAGER_ROLE");

    /* ========== STRUCTS ========== */
    struct Campaign {
        string name;
        uint256 rewardPerCompletion;
        uint256 budget;
        uint256 spent;
        uint256 startTime;
        uint256 endTime;
        bool active;
    }

    struct LearnerStats {
        uint256 totalRewards;
        uint256 completions;
        mapping(bytes32 => bool) completedCampaigns;
    }

    /* ========== STATE VARIABLES ========== */
    IuTUTSimple public ututToken;
    ISessionKeyRegistrySimple public sessionRegistry;
    
    mapping(bytes32 => Campaign) public campaigns;
    bytes32[] public campaignIds;
    mapping(address => LearnerStats) internal learnerStats;

    /* ========== EVENTS ========== */
    event CampaignCreated(
        bytes32 indexed campaignId,
        string name,
        uint256 rewardPerCompletion,
        uint256 budget
    );
    event CampaignUpdated(bytes32 indexed campaignId, bool active);
    event RewardGranted(
        address indexed learner,
        bytes32 indexed campaignId,
        uint256 amount,
        bytes32 completionProof
    );
    event DirectRewardGranted(
        address indexed learner,
        uint256 amount,
        string reason
    );

    /* ========== ERRORS ========== */
    error CampaignNotFound();
    error CampaignNotActive();
    error CampaignExpired();
    error AlreadyCompleted();
    error BudgetExhausted();
    error ZeroAddress();
    error ZeroAmount();

    constructor(
        address owner,
        address _ututToken,
        address _sessionRegistry
    ) {
        if (owner == address(0) || _ututToken == address(0) || _sessionRegistry == address(0)) {
            revert ZeroAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(CAMPAIGN_MANAGER_ROLE, owner);
        _grantRole(REWARDER_ROLE, owner);

        ututToken = IuTUTSimple(_ututToken);
        sessionRegistry = ISessionKeyRegistrySimple(_sessionRegistry);
    }

    /* ========== CAMPAIGN MANAGEMENT ========== */

    /**
     * @notice Create a new training campaign
     */
    function createCampaign(
        bytes32 campaignId,
        string calldata name,
        uint256 rewardPerCompletion,
        uint256 budget,
        uint256 startTime,
        uint256 endTime
    ) external onlyRole(CAMPAIGN_MANAGER_ROLE) {
        if (rewardPerCompletion == 0) revert ZeroAmount();
        if (budget == 0) revert ZeroAmount();

        campaigns[campaignId] = Campaign({
            name: name,
            rewardPerCompletion: rewardPerCompletion,
            budget: budget,
            spent: 0,
            startTime: startTime > 0 ? startTime : block.timestamp,
            endTime: endTime,
            active: true
        });

        campaignIds.push(campaignId);

        emit CampaignCreated(campaignId, name, rewardPerCompletion, budget);
    }

    /**
     * @notice Toggle campaign active status
     */
    function setCampaignActive(bytes32 campaignId, bool active) external onlyRole(CAMPAIGN_MANAGER_ROLE) {
        if (campaigns[campaignId].budget == 0) revert CampaignNotFound();
        campaigns[campaignId].active = active;
        emit CampaignUpdated(campaignId, active);
    }

    /**
     * @notice Add more budget to a campaign
     */
    function addBudget(bytes32 campaignId, uint256 amount) external onlyRole(CAMPAIGN_MANAGER_ROLE) {
        if (campaigns[campaignId].budget == 0) revert CampaignNotFound();
        campaigns[campaignId].budget += amount;
    }

    /* ========== REWARD FUNCTIONS ========== */

    /**
     * @notice Grant reward for course completion
     * @param learner Learner address
     * @param campaignId Campaign identifier
     * @param completionProof Hash of completion proof/certificate
     */
    function grantReward(
        address learner,
        bytes32 campaignId,
        bytes32 completionProof
    ) external onlyRole(REWARDER_ROLE) whenNotPaused {
        if (learner == address(0)) revert ZeroAddress();

        Campaign storage campaign = campaigns[campaignId];
        if (campaign.budget == 0) revert CampaignNotFound();
        if (!campaign.active) revert CampaignNotActive();
        if (campaign.endTime > 0 && block.timestamp > campaign.endTime) revert CampaignExpired();
        
        LearnerStats storage stats = learnerStats[learner];
        if (stats.completedCampaigns[campaignId]) revert AlreadyCompleted();

        uint256 reward = campaign.rewardPerCompletion;
        if (campaign.spent + reward > campaign.budget) revert BudgetExhausted();

        // Update state
        campaign.spent += reward;
        stats.completedCampaigns[campaignId] = true;
        stats.totalRewards += reward;
        stats.completions++;

        // Mint reward
        ututToken.mintReward(learner, reward, campaignId);

        emit RewardGranted(learner, campaignId, reward, completionProof);
    }

    /**
     * @notice Grant direct reward (non-campaign)
     */
    function grantDirectReward(
        address learner,
        uint256 amount,
        string calldata reason
    ) external onlyRole(REWARDER_ROLE) whenNotPaused {
        if (learner == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        LearnerStats storage stats = learnerStats[learner];
        stats.totalRewards += amount;

        ututToken.mintReward(learner, amount, keccak256(bytes(reason)));

        emit DirectRewardGranted(learner, amount, reason);
    }

    /* ========== VIEW FUNCTIONS ========== */

    function getCampaign(bytes32 campaignId) external view returns (
        string memory name,
        uint256 rewardPerCompletion,
        uint256 budget,
        uint256 spent,
        uint256 startTime,
        uint256 endTime,
        bool active
    ) {
        Campaign storage c = campaigns[campaignId];
        return (c.name, c.rewardPerCompletion, c.budget, c.spent, c.startTime, c.endTime, c.active);
    }

    function getLearnerTotalRewards(address learner) external view returns (uint256) {
        return learnerStats[learner].totalRewards;
    }

    function getLearnerCompletions(address learner) external view returns (uint256) {
        return learnerStats[learner].completions;
    }

    function hasCompletedCampaign(address learner, bytes32 campaignId) external view returns (bool) {
        return learnerStats[learner].completedCampaigns[campaignId];
    }

    function getCampaignCount() external view returns (uint256) {
        return campaignIds.length;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
