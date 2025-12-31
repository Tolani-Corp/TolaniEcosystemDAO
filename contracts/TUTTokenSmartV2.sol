// SPDX-License-Identifier: MIT
// Pin the compiler version to avoid floating pragmas and unexpected behaviour.
pragma solidity 0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20VotesUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/NoncesUpgradeable.sol";

/// @title TUTTokenSmart
/// @author Tolani Corp
/// @notice ERC20 governance token with 18 decimals, capped supply, burnable,
/// pausable and upgradeable via UUPS. Includes EIP-2612 permits, ERC-2771
/// meta-transactions, and ERC20Votes for DAO governance with delegation.
/// @dev Implements all smart token features required for TolaniEcosystemDAO
contract TUTTokenSmart is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ERC20Upgradeable,
    ERC20CappedUpgradeable,
    ERC20BurnableUpgradeable,
    ERC20PermitUpgradeable,
    ERC20VotesUpgradeable,
    ERC2771ContextUpgradeable,
    UUPSUpgradeable
{
    /* ========== CONSTANTS ========== */
    string private constant TOKEN_NAME = "Tolani Utility Token";
    string private constant TOKEN_SYMBOL = "TUT";
    uint8 private constant TOKEN_DECIMALS = 18;

    /* ========== ROLES ========== */
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant BLACKLIST_ROLE = keccak256("BLACKLIST_ROLE");

    /* ========== STATE VARIABLES ========== */
    /// @notice Mapping of blacklisted addresses (for compliance)
    mapping(address => bool) private _blacklisted;

    /* ========== EVENTS ========== */
    event Blacklisted(address indexed account);
    event UnBlacklisted(address indexed account);

    /* ========== ERRORS ========== */
    error ZeroAddress();
    error AccountBlacklisted(address account);
    error InvalidInitialSupply(uint256 initialSupply, uint256 cap);

    /// @custom:oz-upgrades-unsafe-allow constructor
    /* ========== CONSTRUCTOR ========== */
    constructor(address trustedForwarder) ERC2771ContextUpgradeable(trustedForwarder) {
        _disableInitializers();
    }

    /// @dev Initializes the token. Can only be called once. Pass owner to grant roles.
    /// @param owner Address to receive admin, pauser, minter, and upgrader roles
    /// @param initialSupply Initial mint amount (in smallest unit)
    /// @param cap Maximum supply cap (in smallest unit)
    /// @param forwarder Address of the trusted forwarder for meta-transactions
    function initialize(
        address owner,
        uint256 initialSupply,
        uint256 cap,
        address forwarder
    ) external initializer {
        // Validation
        if (owner == address(0)) revert ZeroAddress();
        if (forwarder == address(0)) revert ZeroAddress();
        if (initialSupply > cap) revert InvalidInitialSupply(initialSupply, cap);

        // Initialize all modules
        __ERC20_init(TOKEN_NAME, TOKEN_SYMBOL);
        __ERC20Capped_init(cap);
        __ERC20Permit_init(TOKEN_NAME);
        __ERC20Votes_init();
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        // Verify trusted forwarder matches constructor param
        require(trustedForwarder() == forwarder, "TUT: Forwarder mismatch");

        // Grant roles to owner
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(MINTER_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);
        _grantRole(BLACKLIST_ROLE, owner);

        // Mint initial supply to owner
        if (initialSupply > 0) {
            _mint(owner, initialSupply);
        }
    }

    /* ========== EXTERNAL FUNCTIONS ========== */

    /// @notice Mint new tokens
    /// @dev Only addresses with MINTER_ROLE may call
    /// @param to Recipient address
    /// @param amount Amount to mint (in wei)
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        _mint(to, amount);
    }

    /// @notice Pause all token transfers
    /// @dev Only addresses with PAUSER_ROLE may call
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause token transfers
    /// @dev Only addresses with PAUSER_ROLE may call
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Add an address to the blacklist
    /// @dev Only addresses with BLACKLIST_ROLE may call
    /// @param account Address to blacklist
    function blacklist(address account) external onlyRole(BLACKLIST_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _blacklisted[account] = true;
        emit Blacklisted(account);
    }

    /// @notice Remove an address from the blacklist
    /// @dev Only addresses with BLACKLIST_ROLE may call
    /// @param account Address to unblacklist
    function unBlacklist(address account) external onlyRole(BLACKLIST_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _blacklisted[account] = false;
        emit UnBlacklisted(account);
    }

    /// @notice Check if an address is blacklisted
    /// @param account Address to check
    /// @return bool True if blacklisted
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    /// @notice Returns the token decimals
    /// @return uint8 Number of decimals (18)
    function decimals() public pure override returns (uint8) {
        return TOKEN_DECIMALS;
    }

    /// @notice Returns the clock mode for voting (block number based)
    /// @return string The clock mode identifier
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=blocknumber&from=default";
    }

    /// @notice Returns the current block number as the clock value
    /// @return uint48 Current block number
    function clock() public view override returns (uint48) {
        return uint48(block.number);
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    /// @dev Authorizes contract upgrade
    /// @param newImplementation Address of new implementation
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {
        if (newImplementation == address(0)) revert ZeroAddress();
    }

    /// @dev Hook called before any token transfer
    /// Handles: cap validation, pause state, blacklist checks, and vote tracking
    function _update(address from, address to, uint256 amount)
        internal
        override(ERC20Upgradeable, ERC20CappedUpgradeable, ERC20VotesUpgradeable)
    {
        // Check blacklist (skip for mint/burn)
        if (from != address(0) && _blacklisted[from]) {
            revert AccountBlacklisted(from);
        }
        if (to != address(0) && _blacklisted[to]) {
            revert AccountBlacklisted(to);
        }

        // Check pause state (allow mint/burn when paused for emergency)
        if (from != address(0) && to != address(0)) {
            _requireNotPaused();
        }

        // Call parent implementations (handles cap + votes checkpointing)
        super._update(from, to, amount);
    }

    /// @dev Override nonces for Permit + Votes compatibility
    function nonces(address owner)
        public
        view
        override(ERC20PermitUpgradeable, NoncesUpgradeable)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    /// @dev Override _msgSender to use ERC2771Context
    function _msgSender()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (address sender)
    {
        return ERC2771ContextUpgradeable._msgSender();
    }

    /// @dev Override _msgData to use ERC2771Context
    function _msgData()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771ContextUpgradeable._msgData();
    }

    /// @dev Override _contextSuffixLength to resolve inheritance conflict
    function _contextSuffixLength()
        internal
        view
        override(ContextUpgradeable, ERC2771ContextUpgradeable)
        returns (uint256)
    {
        return ERC2771ContextUpgradeable._contextSuffixLength();
    }

    /* ========== STORAGE GAP ========== */
    /// @dev Reserved storage space for future upgrades
    /// Reduced from 50 to 48 to account for new state variables (_blacklisted mapping)
    uint256[48] private __gap;
}
