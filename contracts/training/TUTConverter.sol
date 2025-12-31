// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./uTUT.sol";

/**
 * @title TUTConverter
 * @author Tolani Labs
 * @notice Converts between TUT (18 decimals) and uTUT (6 decimals) tokens
 * @dev Part of the Tolani Labs + IBM SkillsBuild Integration
 * 
 * Conversion Rate:
 * - 1 uTUT (6 decimals) = 10^12 wei TUT (smallest unit)
 * - 1 TUT (full token) = 1,000,000 uTUT
 * 
 * Example conversions:
 * - 100 uTUT → 0.0001 TUT (100 * 10^12 = 10^14 wei TUT)
 * - 1 TUT → 1,000,000 uTUT
 * 
 * Flow:
 * - TUT → uTUT: User deposits TUT, receives equivalent uTUT
 * - uTUT → TUT: User burns uTUT, receives equivalent TUT
 * 
 * Security:
 * - Requires sufficient TUT balance in converter for uTUT→TUT
 * - Uses ReentrancyGuard for all conversion operations
 * - Pausable for emergency stops
 */
contract TUTConverter is
    Initializable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    /* ========== CONSTANTS ========== */
    
    /// @notice Conversion factor: 1 uTUT = 10^12 wei TUT
    /// @dev TUT has 18 decimals, uTUT has 6 decimals. Difference = 12 decimals
    uint256 public constant CONVERSION_FACTOR = 10 ** 12;

    /* ========== ROLES ========== */
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant TREASURY_ROLE = keccak256("TREASURY_ROLE");

    /* ========== STATE VARIABLES ========== */
    
    /// @notice TUT token contract (18 decimals) on Ethereum/bridged
    IERC20 public tut;
    
    /// @notice uTUT token contract (6 decimals) on Base
    uTUT public utut;

    /// @notice Total TUT converted to uTUT (for analytics)
    uint256 public totalTutToUtut;
    
    /// @notice Total uTUT converted back to TUT (for analytics)
    uint256 public totalUtutToTut;

    /* ========== EVENTS ========== */
    event ConvertedToUTUT(
        address indexed user,
        uint256 tutAmount,
        uint256 ututAmount,
        uint256 timestamp
    );
    
    event ConvertedToTUT(
        address indexed user,
        uint256 ututAmount,
        uint256 tutAmount,
        uint256 timestamp
    );
    
    event TreasuryDeposit(
        address indexed from,
        uint256 amount
    );
    
    event TreasuryWithdraw(
        address indexed to,
        uint256 amount
    );

    /* ========== ERRORS ========== */
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientTutBalance(uint256 requested, uint256 available);
    error InsufficientUtutBalance(uint256 requested, uint256 available);
    error InsufficientConverterBalance(uint256 requested, uint256 available);
    error TransferFailed();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initialize the converter
     * @param owner Address to receive admin roles
     * @param tutToken Address of TUT token (18 decimals)
     * @param ututToken Address of uTUT token (6 decimals)
     */
    function initialize(
        address owner,
        address tutToken,
        address ututToken
    ) external initializer {
        if (owner == address(0)) revert ZeroAddress();
        if (tutToken == address(0)) revert ZeroAddress();
        if (ututToken == address(0)) revert ZeroAddress();

        __AccessControl_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        tut = IERC20(tutToken);
        utut = uTUT(ututToken);

        _grantRole(DEFAULT_ADMIN_ROLE, owner);
        _grantRole(PAUSER_ROLE, owner);
        _grantRole(UPGRADER_ROLE, owner);
        _grantRole(TREASURY_ROLE, owner);
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice Get the TUT balance available for uTUT→TUT conversions
     * @return Available TUT in converter treasury
     */
    function availableTutBalance() external view returns (uint256) {
        return tut.balanceOf(address(this));
    }

    /**
     * @notice Calculate uTUT amount from TUT input
     * @param tutAmount Amount of TUT (18 decimals)
     * @return ututAmount Equivalent uTUT (6 decimals)
     */
    function calculateUtutFromTut(uint256 tutAmount) public pure returns (uint256) {
        return tutAmount / CONVERSION_FACTOR;
    }

    /**
     * @notice Calculate TUT amount from uTUT input
     * @param ututAmount Amount of uTUT (6 decimals)
     * @return tutAmount Equivalent TUT (18 decimals)
     */
    function calculateTutFromUtut(uint256 ututAmount) public pure returns (uint256) {
        return ututAmount * CONVERSION_FACTOR;
    }

    /* ========== CONVERSION FUNCTIONS ========== */

    /**
     * @notice Convert TUT to uTUT
     * @param tutAmount Amount of TUT to convert (18 decimals)
     * @dev User must approve this contract to spend their TUT first
     * 
     * Flow:
     * 1. User approves converter to spend TUT
     * 2. Converter transfers TUT from user
     * 3. Converter mints equivalent uTUT to user
     */
    function convertToUtut(uint256 tutAmount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        if (tutAmount == 0) revert ZeroAmount();
        
        uint256 ututAmount = calculateUtutFromTut(tutAmount);
        if (ututAmount == 0) revert ZeroAmount(); // TUT amount too small
        
        // Check user has enough TUT
        uint256 userBalance = tut.balanceOf(msg.sender);
        if (userBalance < tutAmount) {
            revert InsufficientTutBalance(tutAmount, userBalance);
        }

        // Transfer TUT from user to converter (acts as reserve)
        bool success = tut.transferFrom(msg.sender, address(this), tutAmount);
        if (!success) revert TransferFailed();

        // Mint uTUT to user
        utut.mint(msg.sender, ututAmount);

        totalTutToUtut += tutAmount;

        emit ConvertedToUTUT(msg.sender, tutAmount, ututAmount, block.timestamp);
    }

    /**
     * @notice Convert uTUT back to TUT
     * @param ututAmount Amount of uTUT to convert (6 decimals)
     * @dev Requires converter to have sufficient TUT balance
     * 
     * Flow:
     * 1. Check converter has enough TUT
     * 2. Burn uTUT from user
     * 3. Transfer equivalent TUT to user
     */
    function convertToTut(uint256 ututAmount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        if (ututAmount == 0) revert ZeroAmount();
        
        uint256 tutAmount = calculateTutFromUtut(ututAmount);
        
        // Check user has enough uTUT
        uint256 userBalance = utut.balanceOf(msg.sender);
        if (userBalance < ututAmount) {
            revert InsufficientUtutBalance(ututAmount, userBalance);
        }

        // Check converter has enough TUT
        uint256 converterBalance = tut.balanceOf(address(this));
        if (converterBalance < tutAmount) {
            revert InsufficientConverterBalance(tutAmount, converterBalance);
        }

        // Burn uTUT from user (requires user approval or we use burnForConversion)
        utut.burnForConversion(msg.sender, ututAmount);

        // Transfer TUT to user
        bool success = tut.transfer(msg.sender, tutAmount);
        if (!success) revert TransferFailed();

        totalUtutToTut += ututAmount;

        emit ConvertedToTUT(msg.sender, ututAmount, tutAmount, block.timestamp);
    }

    /* ========== TREASURY FUNCTIONS ========== */

    /**
     * @notice Deposit TUT to converter for uTUT→TUT conversions
     * @param amount Amount of TUT to deposit
     * @dev Called by treasury to fund the converter
     */
    function depositTut(uint256 amount) 
        external 
        onlyRole(TREASURY_ROLE) 
        nonReentrant 
    {
        if (amount == 0) revert ZeroAmount();
        
        bool success = tut.transferFrom(msg.sender, address(this), amount);
        if (!success) revert TransferFailed();
        
        emit TreasuryDeposit(msg.sender, amount);
    }

    /**
     * @notice Withdraw excess TUT from converter
     * @param to Recipient address
     * @param amount Amount to withdraw
     * @dev Emergency function for treasury management
     */
    function withdrawTut(address to, uint256 amount) 
        external 
        onlyRole(TREASURY_ROLE) 
        nonReentrant 
    {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        
        uint256 balance = tut.balanceOf(address(this));
        if (balance < amount) {
            revert InsufficientConverterBalance(amount, balance);
        }
        
        bool success = tut.transfer(to, amount);
        if (!success) revert TransferFailed();
        
        emit TreasuryWithdraw(to, amount);
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
