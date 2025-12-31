// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title SessionKeyRegistrySimple - Session Permission Management (Non-Upgradeable)
 * @author Tolani Labs
 * @notice Simplified session registry for Sepolia testnet
 */
contract SessionKeyRegistrySimple is AccessControl, Pausable {
    /* ========== ROLES ========== */
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant INVOKER_ROLE = keccak256("INVOKER_ROLE");

    /* ========== ENUMS ========== */
    enum SessionTag { TRAINING, ESG, BOUNTY, PAYROLL }

    /* ========== STRUCTS ========== */
    struct Session {
        address owner;
        SessionTag tag;
        uint256 expiry;
        uint256 maxActions;
        uint256 usedActions;
        bool active;
    }

    /* ========== STATE VARIABLES ========== */
    mapping(address => Session) public sessions;
    mapping(address => uint256) public lifetimeActions;

    uint256 public constant MAX_SESSION_DURATION = 7 days;
    uint256 public constant DEFAULT_MAX_ACTIONS = 100;

    /* ========== EVENTS ========== */
    event SessionOpened(
        address indexed sessionKey,
        address indexed owner,
        SessionTag tag,
        uint256 expiry,
        uint256 maxActions
    );
    event SessionConsumed(address indexed sessionKey, uint256 actionsRemaining);
    event SessionClosed(address indexed sessionKey);

    /* ========== ERRORS ========== */
    error SessionNotActive();
    error SessionExpired();
    error ActionsExhausted();
    error InvalidDuration();
    error NotSessionOwner();
    error ZeroAddress();

    constructor(address owner) {
        if (owner == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(OPERATOR_ROLE, owner);
    }

    /* ========== SESSION MANAGEMENT ========== */

    /**
     * @notice Open a new session for a wallet
     * @param sessionKey The address authorized for actions
     * @param tag Session category
     * @param duration How long the session lasts
     * @param maxActions Maximum number of actions allowed
     */
    function openSession(
        address sessionKey,
        SessionTag tag,
        uint256 duration,
        uint256 maxActions
    ) external onlyRole(OPERATOR_ROLE) whenNotPaused {
        if (sessionKey == address(0)) revert ZeroAddress();
        if (duration == 0 || duration > MAX_SESSION_DURATION) revert InvalidDuration();

        uint256 finalMaxActions = maxActions > 0 ? maxActions : DEFAULT_MAX_ACTIONS;

        sessions[sessionKey] = Session({
            owner: msg.sender,
            tag: tag,
            expiry: block.timestamp + duration,
            maxActions: finalMaxActions,
            usedActions: 0,
            active: true
        });

        emit SessionOpened(sessionKey, msg.sender, tag, block.timestamp + duration, finalMaxActions);
    }

    /**
     * @notice Consume one action from a session
     * @param sessionKey The session key address
     */
    function consumeSession(address sessionKey) external onlyRole(INVOKER_ROLE) whenNotPaused {
        Session storage session = sessions[sessionKey];

        if (!session.active) revert SessionNotActive();
        if (block.timestamp > session.expiry) revert SessionExpired();
        if (session.usedActions >= session.maxActions) revert ActionsExhausted();

        session.usedActions++;
        lifetimeActions[sessionKey]++;

        emit SessionConsumed(sessionKey, session.maxActions - session.usedActions);
    }

    /**
     * @notice Close a session early
     * @param sessionKey The session to close
     */
    function closeSession(address sessionKey) external {
        Session storage session = sessions[sessionKey];
        if (session.owner != msg.sender && !hasRole(OPERATOR_ROLE, msg.sender)) {
            revert NotSessionOwner();
        }

        session.active = false;
        emit SessionClosed(sessionKey);
    }

    /* ========== VIEW FUNCTIONS ========== */

    function validateSession(address sessionKey, SessionTag requiredTag) external view returns (bool) {
        Session storage session = sessions[sessionKey];
        return session.active &&
            block.timestamp <= session.expiry &&
            session.usedActions < session.maxActions &&
            session.tag == requiredTag;
    }

    function getSession(address sessionKey) external view returns (Session memory) {
        return sessions[sessionKey];
    }

    function getRemainingActions(address sessionKey) external view returns (uint256) {
        Session storage session = sessions[sessionKey];
        if (!session.active || block.timestamp > session.expiry) return 0;
        return session.maxActions - session.usedActions;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}
