// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title SessionKeyRegistry
 * @author Tolani Labs
 * @notice Registers session keys with expiry and tags for training session permissions
 * @dev Part of the Tolani Labs + IBM SkillsBuild Integration
 * 
 * Purpose:
 * Session keys are short-lived "permission tickets" that allow the relayer/backend
 * to execute on-chain reward actions on behalf of verified learners.
 * 
 * Flow:
 * 1. Learner completes IBM SkillsBuild module
 * 2. Tolani Labs backend verifies completion
 * 3. Backend calls openSession() with a generated session key
 * 4. Relayer uses session key to trigger TrainingRewards.grantReward()
 * 5. Session expires after use or timeout
 * 
 * Tags:
 * - "TRAINING" - IBM SkillsBuild course completions
 * - "ESG" - ESG task completions
 * - "BOUNTY" - Bounty completions
 * - "PAYROLL" - Payroll disbursements
 * 
 * Security:
 * - Sessions have expiry times (default: 24 hours)
 * - Sessions can only be used once
 * - Only SESSION_MANAGER_ROLE can open sessions
 * - Only whitelisted invokers can use sessions
 */
contract SessionKeyRegistry is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    /* ========== ROLES ========== */
    bytes32 public constant SESSION_MANAGER_ROLE = keccak256("SESSION_MANAGER_ROLE");
    bytes32 public constant INVOKER_ROLE = keccak256("INVOKER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /* ========== STRUCTS ========== */
    struct Session {
        address userWallet;      // Learner's wallet to receive rewards
        uint256 expiresAt;       // Unix timestamp when session expires
        bytes32 tag;             // Session type (TRAINING, ESG, BOUNTY, PAYROLL)
        bool used;               // Whether session has been consumed
        bool active;             // Whether session is still valid
        bytes32 campaignId;      // Optional: specific campaign/track identifier
        uint256 maxAmount;       // Optional: maximum reward amount for this session
    }

    /* ========== STATE VARIABLES ========== */
    
    /// @notice Mapping of session key hash to session data
    mapping(bytes32 => Session) public sessions;
    
    /// @notice Default session duration (24 hours)
    uint256 public defaultDuration;
    
    /// @notice Total sessions created
    uint256 public totalSessionsCreated;
    
    /// @notice Total sessions used/consumed
    uint256 public totalSessionsUsed;

    /// @notice Predefined tag constants
    bytes32 public constant TAG_TRAINING = keccak256("TRAINING");
    bytes32 public constant TAG_ESG = keccak256("ESG");
    bytes32 public constant TAG_BOUNTY = keccak256("BOUNTY");
    bytes32 public constant TAG_PAYROLL = keccak256("PAYROLL");

    /* ========== EVENTS ========== */
    event SessionOpened(
        bytes32 indexed sessionKeyHash,
        address indexed userWallet,
        bytes32 indexed tag,
        uint256 expiresAt,
        bytes32 campaignId
    );
    
    event SessionUsed(
        bytes32 indexed sessionKeyHash,
        address indexed userWallet,
        address indexed invoker,
        uint256 timestamp
    );
    
    event SessionRevoked(
        bytes32 indexed sessionKeyHash,
        address indexed revokedBy
    );
    
    event DefaultDurationUpdated(
        uint256 oldDuration,
        uint256 newDuration
    );

    /* ========== ERRORS ========== */
    error ZeroAddress();
    error InvalidDuration();
    error SessionAlreadyExists();
    error SessionNotFound();
    error SessionExpired();
    error SessionAlreadyUsed();
    error SessionInactive();
    error TagMismatch(bytes32 expected, bytes32 provided);
    error AmountExceedsMax(uint256 requested, uint256 max);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the registry
     * @param owner Address to receive admin roles
     */
    function initialize(address owner) external initializer {
        if (owner == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        defaultDuration = 24 hours;

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(SESSION_MANAGER_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Get session details by key hash
     * @param sessionKeyHash Hash of the session key
     * @return Session struct
     */
    function getSession(bytes32 sessionKeyHash) external view returns (Session memory) {
        return sessions[sessionKeyHash];
    }

    /**
     * @notice Check if a session is valid and usable
     * @param sessionKeyHash Hash of the session key
     * @return isValid True if session can be used
     */
    function isSessionValid(bytes32 sessionKeyHash) external view returns (bool) {
        Session storage session = sessions[sessionKeyHash];
        return session.active && 
               !session.used && 
               block.timestamp <= session.expiresAt;
    }

    /**
     * @notice Validate session for a specific tag and amount
     * @param sessionKeyHash Hash of the session key
     * @param expectedTag Expected session tag
     * @param amount Requested reward amount
     * @return userWallet The learner's wallet address
     * @return campaignId The campaign identifier
     */
    function validateSession(
        bytes32 sessionKeyHash,
        bytes32 expectedTag,
        uint256 amount
    ) external view returns (address userWallet, bytes32 campaignId) {
        Session storage session = sessions[sessionKeyHash];
        
        if (!session.active) revert SessionInactive();
        if (session.used) revert SessionAlreadyUsed();
        if (block.timestamp > session.expiresAt) revert SessionExpired();
        if (session.tag != expectedTag) revert TagMismatch(session.tag, expectedTag);
        if (session.maxAmount > 0 && amount > session.maxAmount) {
            revert AmountExceedsMax(amount, session.maxAmount);
        }
        
        return (session.userWallet, session.campaignId);
    }

    /* ========== SESSION MANAGEMENT ========== */

    /**
     * @notice Open a new session for a learner
     * @param sessionKey The raw session key (will be hashed for storage)
     * @param userWallet Learner's wallet address
     * @param tag Session type tag (TRAINING, ESG, etc.)
     * @param campaignId Campaign/track identifier
     * @param maxAmount Maximum reward amount (0 = unlimited)
     * @return sessionKeyHash The hash of the session key
     */
    function openSession(
        bytes32 sessionKey,
        address userWallet,
        bytes32 tag,
        bytes32 campaignId,
        uint256 maxAmount
    ) external onlyRole(SESSION_MANAGER_ROLE) whenNotPaused returns (bytes32) {
        return _openSession(sessionKey, userWallet, tag, campaignId, maxAmount, defaultDuration);
    }

    /**
     * @notice Open a session with custom duration
     * @param sessionKey The raw session key
     * @param userWallet Learner's wallet address
     * @param tag Session type tag
     * @param campaignId Campaign/track identifier
     * @param maxAmount Maximum reward amount (0 = unlimited)
     * @param duration Session duration in seconds
     * @return sessionKeyHash The hash of the session key
     */
    function openSessionWithDuration(
        bytes32 sessionKey,
        address userWallet,
        bytes32 tag,
        bytes32 campaignId,
        uint256 maxAmount,
        uint256 duration
    ) external onlyRole(SESSION_MANAGER_ROLE) whenNotPaused returns (bytes32) {
        if (duration == 0) revert InvalidDuration();
        return _openSession(sessionKey, userWallet, tag, campaignId, maxAmount, duration);
    }

    /**
     * @notice Internal function to create a session
     */
    function _openSession(
        bytes32 sessionKey,
        address userWallet,
        bytes32 tag,
        bytes32 campaignId,
        uint256 maxAmount,
        uint256 duration
    ) internal returns (bytes32) {
        if (userWallet == address(0)) revert ZeroAddress();
        
        bytes32 sessionKeyHash = keccak256(abi.encodePacked(sessionKey));
        
        if (sessions[sessionKeyHash].active) revert SessionAlreadyExists();
        
        uint256 expiresAt = block.timestamp + duration;
        
        sessions[sessionKeyHash] = Session({
            userWallet: userWallet,
            expiresAt: expiresAt,
            tag: tag,
            used: false,
            active: true,
            campaignId: campaignId,
            maxAmount: maxAmount
        });
        
        totalSessionsCreated++;
        
        emit SessionOpened(sessionKeyHash, userWallet, tag, expiresAt, campaignId);
        
        return sessionKeyHash;
    }

    /**
     * @notice Mark a session as used (called by invoker after reward granted)
     * @param sessionKeyHash Hash of the session key
     * @dev Only callable by INVOKER_ROLE (SessionInvoker contract)
     */
    function consumeSession(bytes32 sessionKeyHash) 
        external 
        onlyRole(INVOKER_ROLE) 
        whenNotPaused 
    {
        Session storage session = sessions[sessionKeyHash];
        
        if (!session.active) revert SessionInactive();
        if (session.used) revert SessionAlreadyUsed();
        if (block.timestamp > session.expiresAt) revert SessionExpired();
        
        session.used = true;
        totalSessionsUsed++;
        
        emit SessionUsed(sessionKeyHash, session.userWallet, msg.sender, block.timestamp);
    }

    /**
     * @notice Revoke a session (emergency or cleanup)
     * @param sessionKeyHash Hash of the session key
     */
    function revokeSession(bytes32 sessionKeyHash) 
        external 
        onlyRole(SESSION_MANAGER_ROLE) 
    {
        Session storage session = sessions[sessionKeyHash];
        if (!session.active) revert SessionInactive();
        
        session.active = false;
        
        emit SessionRevoked(sessionKeyHash, msg.sender);
    }

    /* ========== ADMIN FUNCTIONS ========== */

    /**
     * @notice Update default session duration
     * @param newDuration New duration in seconds
     */
    function setDefaultDuration(uint256 newDuration) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        if (newDuration == 0) revert InvalidDuration();
        
        uint256 oldDuration = defaultDuration;
        defaultDuration = newDuration;
        
        emit DefaultDurationUpdated(oldDuration, newDuration);
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
