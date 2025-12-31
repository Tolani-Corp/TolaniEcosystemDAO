// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "./uTUT.sol";
import "./SessionKeyRegistry.sol";

/**
 * @title TrainingRewards
 * @author Tolani Labs
 * @notice Distributes uTUT rewards for IBM SkillsBuild training completions
 * @dev Part of the Tolani Labs + IBM SkillsBuild Integration
 * 
 * Purpose:
 * This contract handles the "Learn → Earn" flow by minting uTUT to learners
 * who complete verified IBM SkillsBuild courses.
 * 
 * Flow:
 * 1. Learner completes IBM SkillsBuild module
 * 2. Tolani Labs backend verifies completion
 * 3. Backend opens session in SessionKeyRegistry
 * 4. Relayer calls grantReward() with session key
 * 5. Contract validates session and mints uTUT to learner
 * 6. Session is consumed (one-time use)
 * 
 * Campaign System:
 * - Campaigns represent Tolani Tracks (e.g., "Construction Tech", "AI & Cloud")
 * - Each campaign has a reward amount and budget
 * - Admin can create/update campaigns as SkillsBuild modules are mapped
 * 
 * Security:
 * - Only REWARDER_ROLE can grant rewards (SessionInvoker)
 * - Sessions prevent double-claiming
 * - Campaign budgets prevent overspending
 */
contract TrainingRewards is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    /* ========== ROLES ========== */
    bytes32 public constant REWARDER_ROLE = keccak256("REWARDER_ROLE");
    bytes32 public constant CAMPAIGN_MANAGER_ROLE = keccak256("CAMPAIGN_MANAGER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /* ========== STRUCTS ========== */
    struct Campaign {
        string name;              // Human-readable name (e.g., "Tolani Construction Tech Track")
        uint256 rewardAmount;     // uTUT reward per completion (6 decimals)
        uint256 totalBudget;      // Total uTUT allocated for this campaign
        uint256 distributed;      // Total uTUT distributed so far
        uint256 completions;      // Number of completions rewarded
        bool active;              // Whether campaign is accepting completions
        uint256 startTime;        // Campaign start timestamp
        uint256 endTime;          // Campaign end timestamp (0 = no end)
    }

    struct RewardRecord {
        address learner;
        bytes32 campaignId;
        uint256 amount;
        uint256 timestamp;
        bytes32 sessionKeyHash;
    }

    /* ========== STATE VARIABLES ========== */
    
    /// @notice uTUT token contract
    uTUT public utut;
    
    /// @notice Session key registry for validation
    SessionKeyRegistry public sessionRegistry;
    
    /// @notice Campaign definitions
    mapping(bytes32 => Campaign) public campaigns;
    
    /// @notice List of all campaign IDs
    bytes32[] public campaignIds;
    
    /// @notice Reward history per learner
    mapping(address => RewardRecord[]) public learnerRewards;
    
    /// @notice Total uTUT distributed across all campaigns
    uint256 public totalDistributed;
    
    /// @notice Total unique learners rewarded
    uint256 public totalLearnersRewarded;
    
    /// @notice Mapping to track if an address has ever been rewarded
    mapping(address => bool) public hasBeenRewarded;

    /* ========== EVENTS ========== */
    event CampaignCreated(
        bytes32 indexed campaignId,
        string name,
        uint256 rewardAmount,
        uint256 totalBudget
    );
    
    event CampaignUpdated(
        bytes32 indexed campaignId,
        uint256 newRewardAmount,
        uint256 newBudget,
        bool active
    );
    
    event RewardGranted(
        address indexed learner,
        bytes32 indexed campaignId,
        uint256 amount,
        bytes32 sessionKeyHash,
        uint256 timestamp
    );
    
    event BudgetAdded(
        bytes32 indexed campaignId,
        uint256 addedAmount,
        uint256 newTotal
    );

    /* ========== ERRORS ========== */
    error ZeroAddress();
    error ZeroAmount();
    error CampaignNotFound();
    error CampaignNotActive();
    error CampaignEnded();
    error CampaignNotStarted();
    error InsufficientBudget(uint256 requested, uint256 available);
    error CampaignAlreadyExists();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the training rewards contract
     * @param owner Address to receive admin roles
     * @param ututToken Address of uTUT token
     * @param registry Address of SessionKeyRegistry
     */
    function initialize(
        address owner,
        address ututToken,
        address registry
    ) external initializer {
        if (owner == address(0)) revert ZeroAddress();
        if (ututToken == address(0)) revert ZeroAddress();
        if (registry == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        utut = uTUT(ututToken);
        sessionRegistry = SessionKeyRegistry(registry);

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(CAMPAIGN_MANAGER_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Get campaign details
     * @param campaignId Campaign identifier
     * @return Campaign struct
     */
    function getCampaign(bytes32 campaignId) external view returns (Campaign memory) {
        return campaigns[campaignId];
    }

    /**
     * @notice Get remaining budget for a campaign
     * @param campaignId Campaign identifier
     * @return Remaining uTUT budget
     */
    function getRemainingBudget(bytes32 campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[campaignId];
        return campaign.totalBudget > campaign.distributed 
            ? campaign.totalBudget - campaign.distributed 
            : 0;
    }

    /**
     * @notice Get total campaigns count
     * @return Number of campaigns
     */
    function getCampaignCount() external view returns (uint256) {
        return campaignIds.length;
    }

    /**
     * @notice Get learner's reward history
     * @param learner Learner address
     * @return Array of reward records
     */
    function getLearnerRewards(address learner) external view returns (RewardRecord[] memory) {
        return learnerRewards[learner];
    }

    /**
     * @notice Get learner's total rewards across all campaigns
     * @param learner Learner address
     * @return Total uTUT earned
     */
    function getLearnerTotalRewards(address learner) external view returns (uint256) {
        uint256 total = 0;
        RewardRecord[] storage records = learnerRewards[learner];
        for (uint256 i = 0; i < records.length; i++) {
            total += records[i].amount;
        }
        return total;
    }

    /* ========== CAMPAIGN MANAGEMENT ========== */

    /**
     * @notice Create a new training campaign (Tolani Track)
     * @param campaignId Unique identifier for the campaign
     * @param name Human-readable name
     * @param rewardAmount uTUT reward per completion
     * @param totalBudget Total uTUT allocated
     * @param startTime Campaign start timestamp (0 = immediate)
     * @param endTime Campaign end timestamp (0 = no end)
     */
    function createCampaign(
        bytes32 campaignId,
        string calldata name,
        uint256 rewardAmount,
        uint256 totalBudget,
        uint256 startTime,
        uint256 endTime
    ) external onlyRole(CAMPAIGN_MANAGER_ROLE) {
        if (campaigns[campaignId].active || campaigns[campaignId].totalBudget > 0) {
            revert CampaignAlreadyExists();
        }
        if (rewardAmount == 0) revert ZeroAmount();
        if (totalBudget == 0) revert ZeroAmount();

        campaigns[campaignId] = Campaign({
            name: name,
            rewardAmount: rewardAmount,
            totalBudget: totalBudget,
            distributed: 0,
            completions: 0,
            active: true,
            startTime: startTime == 0 ? block.timestamp : startTime,
            endTime: endTime
        });

        campaignIds.push(campaignId);

        emit CampaignCreated(campaignId, name, rewardAmount, totalBudget);
    }

    /**
     * @notice Update campaign parameters
     * @param campaignId Campaign identifier
     * @param rewardAmount New reward amount (0 = unchanged)
     * @param active Whether campaign is active
     */
    function updateCampaign(
        bytes32 campaignId,
        uint256 rewardAmount,
        bool active
    ) external onlyRole(CAMPAIGN_MANAGER_ROLE) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.totalBudget == 0) revert CampaignNotFound();

        if (rewardAmount > 0) {
            campaign.rewardAmount = rewardAmount;
        }
        campaign.active = active;

        emit CampaignUpdated(campaignId, campaign.rewardAmount, campaign.totalBudget, active);
    }

    /**
     * @notice Add budget to an existing campaign
     * @param campaignId Campaign identifier
     * @param additionalBudget Amount to add
     */
    function addBudget(
        bytes32 campaignId,
        uint256 additionalBudget
    ) external onlyRole(CAMPAIGN_MANAGER_ROLE) {
        Campaign storage campaign = campaigns[campaignId];
        if (campaign.totalBudget == 0) revert CampaignNotFound();
        if (additionalBudget == 0) revert ZeroAmount();

        campaign.totalBudget += additionalBudget;

        emit BudgetAdded(campaignId, additionalBudget, campaign.totalBudget);
    }

    /* ========== REWARD FUNCTIONS ========== */

    /**
     * @notice Grant training reward to a learner
     * @param sessionKeyHash Hash of the session key
     * @param campaignId Campaign identifier
     * @param customAmount Optional custom amount (0 = use campaign default)
     * @dev Only callable by REWARDER_ROLE (SessionInvoker)
     * 
     * Flow:
     * 1. Validate session exists and matches campaign tag
     * 2. Validate campaign is active and has budget
     * 3. Mint uTUT to learner
     * 4. Consume session (prevents reuse)
     * 5. Update campaign stats
     */
    function grantReward(
        bytes32 sessionKeyHash,
        bytes32 campaignId,
        uint256 customAmount
    ) external onlyRole(REWARDER_ROLE) nonReentrant whenNotPaused {
        Campaign storage campaign = campaigns[campaignId];
        
        // Validate campaign
        if (campaign.totalBudget == 0) revert CampaignNotFound();
        if (!campaign.active) revert CampaignNotActive();
        if (campaign.startTime > block.timestamp) revert CampaignNotStarted();
        if (campaign.endTime > 0 && campaign.endTime < block.timestamp) revert CampaignEnded();

        // Validate session
        (address learner, bytes32 sessionCampaign) = sessionRegistry.validateSession(
            sessionKeyHash,
            sessionRegistry.TAG_TRAINING(),
            customAmount > 0 ? customAmount : campaign.rewardAmount
        );

        // Use custom amount or campaign default
        uint256 rewardAmount = customAmount > 0 ? customAmount : campaign.rewardAmount;

        // Check budget
        uint256 remaining = campaign.totalBudget - campaign.distributed;
        if (rewardAmount > remaining) {
            revert InsufficientBudget(rewardAmount, remaining);
        }

        // Consume the session (marks as used)
        sessionRegistry.consumeSession(sessionKeyHash);

        // Mint uTUT to learner
        utut.mintReward(learner, rewardAmount, campaignId);

        // Update stats
        campaign.distributed += rewardAmount;
        campaign.completions++;
        totalDistributed += rewardAmount;

        // Track unique learners
        if (!hasBeenRewarded[learner]) {
            hasBeenRewarded[learner] = true;
            totalLearnersRewarded++;
        }

        // Record reward
        learnerRewards[learner].push(RewardRecord({
            learner: learner,
            campaignId: campaignId,
            amount: rewardAmount,
            timestamp: block.timestamp,
            sessionKeyHash: sessionKeyHash
        }));

        emit RewardGranted(learner, campaignId, rewardAmount, sessionKeyHash, block.timestamp);
    }

    /**
     * @notice Direct reward grant without session (for admin/testing)
     * @param learner Learner address
     * @param campaignId Campaign identifier
     * @param amount Reward amount
     * @dev Only callable by CAMPAIGN_MANAGER_ROLE (for testing/corrections)
     */
    function grantDirectReward(
        address learner,
        bytes32 campaignId,
        uint256 amount
    ) external onlyRole(CAMPAIGN_MANAGER_ROLE) nonReentrant whenNotPaused {
        if (learner == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();

        Campaign storage campaign = campaigns[campaignId];
        if (campaign.totalBudget == 0) revert CampaignNotFound();

        uint256 remaining = campaign.totalBudget - campaign.distributed;
        if (amount > remaining) {
            revert InsufficientBudget(amount, remaining);
        }

        utut.mintReward(learner, amount, campaignId);

        campaign.distributed += amount;
        campaign.completions++;
        totalDistributed += amount;

        if (!hasBeenRewarded[learner]) {
            hasBeenRewarded[learner] = true;
            totalLearnersRewarded++;
        }

        learnerRewards[learner].push(RewardRecord({
            learner: learner,
            campaignId: campaignId,
            amount: amount,
            timestamp: block.timestamp,
            sessionKeyHash: bytes32(0)
        }));

        emit RewardGranted(learner, campaignId, amount, bytes32(0), block.timestamp);
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
