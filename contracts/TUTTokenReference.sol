// SPDX-License-Identifier: MIT
// TUTTokenSmart - Non-Upgradeable Reference (for DAO integration testing)
// NOTE: The production upgradeable version should be in the TolaniToken repository
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/Nonces.sol";

/// @title TUTTokenReference
/// @author Tolani Corp
/// @notice Reference implementation of TUT with all smart features (non-upgradeable)
/// @dev For testing DAO integration - production should use upgradeable version from TolaniToken repo
contract TUTTokenReference is
    ERC20,
    ERC20Capped,
    ERC20Burnable,
    ERC20Permit,
    ERC20Votes,
    AccessControl,
    Pausable
{
    /* ========== ROLES ========== */
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BLACKLIST_ROLE = keccak256("BLACKLIST_ROLE");

    /* ========== STATE ========== */
    mapping(address => bool) private _blacklisted;

    /* ========== EVENTS ========== */
    event Blacklisted(address indexed account);
    event UnBlacklisted(address indexed account);

    /* ========== ERRORS ========== */
    error ZeroAddress();
    error AccountBlacklisted(address account);

    /* ========== CONSTRUCTOR ========== */
    constructor(
        address owner,
        uint256 initialSupply,
        uint256 cap_
    )
        ERC20("Tolani Utility Token", "TUT")
        ERC20Capped(cap_)
        ERC20Permit("Tolani Utility Token")
    {
        if (owner == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(MINTER_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(BLACKLIST_ROLE, owner);

        if (initialSupply > 0) {
            _mint(owner, initialSupply);
        }
    }

    /* ========== EXTERNAL FUNCTIONS ========== */

    /// @notice Mint new tokens
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        _mint(to, amount);
    }

    /// @notice Pause all transfers
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Unpause transfers
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /// @notice Blacklist an address
    function blacklist(address account) external onlyRole(BLACKLIST_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        _blacklisted[account] = true;
        emit Blacklisted(account);
    }

    /// @notice Remove from blacklist
    function unBlacklist(address account) external onlyRole(BLACKLIST_ROLE) {
        _blacklisted[account] = false;
        emit UnBlacklisted(account);
    }

    /// @notice Check if blacklisted
    function isBlacklisted(address account) external view returns (bool) {
        return _blacklisted[account];
    }

    /// @notice Clock mode for voting
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=blocknumber&from=default";
    }

    /// @notice Current clock value
    function clock() public view override returns (uint48) {
        return uint48(block.number);
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    function _update(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Capped, ERC20Votes)
    {
        // Blacklist check
        if (from != address(0) && _blacklisted[from]) revert AccountBlacklisted(from);
        if (to != address(0) && _blacklisted[to]) revert AccountBlacklisted(to);

        // Pause check (allow mint/burn)
        if (from != address(0) && to != address(0)) {
            _requireNotPaused();
        }

        super._update(from, to, amount);
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
