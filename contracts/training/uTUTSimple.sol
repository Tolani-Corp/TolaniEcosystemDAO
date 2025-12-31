// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title uTUTSimple - Micro Utility Token (Non-Upgradeable)
 * @author Tolani Labs
 * @notice 6-decimal micro-utility token for training rewards on Sepolia testnet
 * @dev Simplified version for testing - use uTUT.sol with proxies for production
 */
contract uTUTSimple is
    AccessControl,
    Pausable,
    ERC20,
    ERC20Burnable,
    ERC20Permit
{
    /* ========== CONSTANTS ========== */
    uint8 private constant TOKEN_DECIMALS = 6;

    /* ========== ROLES ========== */
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /* ========== STATE VARIABLES ========== */
    uint256 public cap;
    address public converter;

    /* ========== EVENTS ========== */
    event CapUpdated(uint256 oldCap, uint256 newCap);
    event ConverterUpdated(address indexed oldConverter, address indexed newConverter);
    event RewardMinted(address indexed to, uint256 amount, bytes32 indexed campaignId);

    /* ========== ERRORS ========== */
    error CapExceeded(uint256 totalSupply, uint256 amount, uint256 cap);
    error ZeroAddress();
    error ZeroAmount();
    error OnlyConverter();

    /**
     * @notice Initialize the contract
     * @param owner Admin and initial role holder
     * @param initialCap Maximum supply cap
     */
    constructor(address owner, uint256 initialCap)
        ERC20("Tolani Micro Utility Token", "uTUT")
        ERC20Permit("Tolani Micro Utility Token")
    {
        if (owner == address(0)) revert ZeroAddress();
        if (initialCap == 0) revert ZeroAmount();

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(MINTER_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);

        cap = initialCap;
    }

    /* ========== EXTERNAL FUNCTIONS ========== */

    /**
     * @notice Override decimals to return 6
     */
    function decimals() public pure override returns (uint8) {
        return TOKEN_DECIMALS;
    }

    /**
     * @notice Mint uTUT to an address (for rewards)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (totalSupply() + amount > cap) {
            revert CapExceeded(totalSupply(), amount, cap);
        }
        _mint(to, amount);
    }

    /**
     * @notice Mint with campaign tracking
     * @param to Recipient address
     * @param amount Amount to mint
     * @param campaignId Campaign identifier
     */
    function mintReward(
        address to,
        uint256 amount,
        bytes32 campaignId
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (totalSupply() + amount > cap) {
            revert CapExceeded(totalSupply(), amount, cap);
        }
        _mint(to, amount);
        emit RewardMinted(to, amount, campaignId);
    }

    /**
     * @notice Burn tokens during TUT conversion
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnForConversion(address from, uint256 amount) external {
        if (msg.sender != converter) revert OnlyConverter();
        _burn(from, amount);
    }

    /**
     * @notice Set converter contract address
     * @param _converter New converter address
     */
    function setConverter(address _converter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_converter == address(0)) revert ZeroAddress();
        address oldConverter = converter;
        converter = _converter;
        emit ConverterUpdated(oldConverter, _converter);
    }

    /**
     * @notice Update supply cap
     * @param newCap New cap value
     */
    function updateCap(uint256 newCap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newCap == 0) revert ZeroAmount();
        uint256 oldCap = cap;
        cap = newCap;
        emit CapUpdated(oldCap, newCap);
    }

    /**
     * @notice Pause all token operations
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /**
     * @notice Unpause token operations
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
}
