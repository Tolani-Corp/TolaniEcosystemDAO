// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";

/**
 * @title uTUT - Micro Utility Token
 * @author Tolani Labs
 * @notice 6-decimal micro-utility token for training rewards, ESG, and payroll on Base L2
 * @dev Part of the Tolani Labs + IBM SkillsBuild Integration
 * 
 * Key Features:
 * - 6 decimals (vs TUT's 18) for micro-transactions
 * - Mintable by MINTER_ROLE (TrainingRewards, ESGRewards contracts)
 * - Burnable for conversion back to TUT via TUTConverter
 * - Pausable for emergency stops
 * - Upgradeable via UUPS pattern
 * 
 * Conversion Rate: 1 uTUT = 10^12 wei TUT (10^6 * 10^6 = 10^12)
 * Example: 1.000000 uTUT = 0.000001000000000000 TUT
 */
contract uTUT is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    ERC20PermitUpgradeable,
    UUPSUpgradeable
{
    /* ========== CONSTANTS ========== */
    string private constant TOKEN_NAME = "Tolani Micro Utility Token";
    string private constant TOKEN_SYMBOL = "uTUT";
    uint8 private constant TOKEN_DECIMALS = 6;

    /* ========== ROLES ========== */
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /* ========== STATE VARIABLES ========== */
    /// @notice Maximum supply cap for uTUT (equivalent to TUT allocation for training)
    /// @dev 12.5M uTUT for bootstrap phase (12,500,000 * 10^6)
    uint256 public cap;
    
    /// @notice Reference to TUTConverter for authorized burning during conversion
    address public converter;

    /* ========== EVENTS ========== */
    event CapUpdated(uint256 oldCap, uint256 newCap);
    event ConverterUpdated(address indexed oldConverter, address indexed newConverter);
    event RewardMinted(address indexed to, uint256 amount, bytes32 indexed campaignId);

    /* ========== ERRORS ========== */
    error ZeroAddress();
    error ExceedsCap(uint256 requested, uint256 available);
    error NotConverter();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the uTUT token
     * @param owner Address to receive admin roles
     * @param initialCap Maximum mintable supply (in 6 decimal units)
     */
    function initialize(
        address owner,
        uint256 initialCap
    ) external initializer {
        if (owner == address(0)) revert ZeroAddress();

        __ERC20_init(TOKEN_NAME, TOKEN_SYMBOL);
        __ERC20Burnable_init();
        __ERC20Permit_init(TOKEN_NAME);
        __AccessControl_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        cap = initialCap;

        // Grant roles to owner
        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(MINTER_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Returns the number of decimals (6 for micro-transactions)
     */
    function decimals() public pure override returns (uint8) {
        return TOKEN_DECIMALS;
    }

    /**
     * @notice Returns remaining mintable supply
     */
    function remainingMintable() external view returns (uint256) {
        return cap > totalSupply() ? cap - totalSupply() : 0;
    }

    /* ========== MINTING FUNCTIONS ========== */

    /**
     * @notice Mint uTUT tokens (for training rewards)
     * @param to Recipient address
     * @param amount Amount to mint (6 decimals)
     * @dev Only callable by MINTER_ROLE (TrainingRewards contract)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (totalSupply() + amount > cap) {
            revert ExceedsCap(amount, cap - totalSupply());
        }
        _mint(to, amount);
    }

    /**
     * @notice Mint uTUT with campaign tracking (for IBM SkillsBuild integration)
     * @param to Recipient learner address
     * @param amount Amount to mint (6 decimals)
     * @param campaignId Identifier for the training campaign/track
     * @dev Emits RewardMinted for analytics and ESG reporting
     */
    function mintReward(
        address to,
        uint256 amount,
        bytes32 campaignId
    ) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (totalSupply() + amount > cap) {
            revert ExceedsCap(amount, cap - totalSupply());
        }
        _mint(to, amount);
        emit RewardMinted(to, amount, campaignId);
    }

    /* ========== ADMIN FUNCTIONS ========== */

    /**
     * @notice Update the supply cap (only during growth phases)
     * @param newCap New maximum supply cap
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     */
    function setCap(uint256 newCap) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newCap < totalSupply()) {
            revert ExceedsCap(totalSupply(), newCap);
        }
        uint256 oldCap = cap;
        cap = newCap;
        emit CapUpdated(oldCap, newCap);
    }

    /**
     * @notice Set the TUTConverter address
     * @param newConverter Address of the TUTConverter contract
     * @dev Only callable by DEFAULT_ADMIN_ROLE
     */
    function setConverter(address newConverter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newConverter == address(0)) revert ZeroAddress();
        address oldConverter = converter;
        converter = newConverter;
        emit ConverterUpdated(oldConverter, newConverter);
    }

    /**
     * @notice Burn uTUT during conversion to TUT
     * @param from Address to burn from
     * @param amount Amount to burn
     * @dev Only callable by the TUTConverter contract
     */
    function burnForConversion(address from, uint256 amount) external {
        if (msg.sender != converter) revert NotConverter();
        _burn(from, amount);
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

    /* ========== HOOKS ========== */

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override whenNotPaused {
        super._update(from, to, value);
    }
}
