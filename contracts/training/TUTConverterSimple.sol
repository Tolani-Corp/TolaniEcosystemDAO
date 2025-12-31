// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IuTUTSimple {
    function mint(address to, uint256 amount) external;
    function burnForConversion(address from, uint256 amount) external;
}

/**
 * @title TUTConverterSimple - TUT ↔ uTUT Conversion (Non-Upgradeable)
 * @author Tolani Labs
 * @notice Simplified converter for Sepolia testnet
 */
contract TUTConverterSimple is AccessControl, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /* ========== CONSTANTS ========== */
    /// @notice 1 uTUT (6 decimals) = 10^12 wei of TUT (18 decimals)
    uint256 public constant CONVERSION_FACTOR = 1e12;

    /* ========== STATE VARIABLES ========== */
    IERC20 public tutToken;
    IuTUTSimple public ututToken;
    
    uint256 public totalTutDeposited;
    uint256 public totalUtutMinted;

    /* ========== EVENTS ========== */
    event ConvertedToUtut(address indexed user, uint256 tutAmount, uint256 ututAmount);
    event ConvertedToTut(address indexed user, uint256 ututAmount, uint256 tutAmount);
    event TutDeposited(address indexed from, uint256 amount);
    event TutWithdrawn(address indexed to, uint256 amount);

    /* ========== ERRORS ========== */
    error ZeroAddress();
    error ZeroAmount();
    error InsufficientTutReserve(uint256 requested, uint256 available);

    /**
     * @notice Initialize the converter
     * @param owner Admin address
     * @param _tutToken TUT token address
     * @param _ututToken uTUT token address
     */
    constructor(address owner, address _tutToken, address _ututToken) {
        if (owner == address(0) || _tutToken == address(0) || _ututToken == address(0)) {
            revert ZeroAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, owner);

        tutToken = IERC20(_tutToken);
        ututToken = IuTUTSimple(_ututToken);
    }

    /* ========== CONVERSION FUNCTIONS ========== */

    /**
     * @notice Convert TUT to uTUT
     * @param tutAmount Amount of TUT to convert (18 decimals)
     * @return ututAmount Amount of uTUT received (6 decimals)
     */
    function convertToUtut(uint256 tutAmount) external nonReentrant whenNotPaused returns (uint256 ututAmount) {
        if (tutAmount == 0) revert ZeroAmount();

        ututAmount = tutAmount / CONVERSION_FACTOR;
        if (ututAmount == 0) revert ZeroAmount();

        tutToken.safeTransferFrom(msg.sender, address(this), tutAmount);
        totalTutDeposited += tutAmount;
        totalUtutMinted += ututAmount;

        ututToken.mint(msg.sender, ututAmount);

        emit ConvertedToUtut(msg.sender, tutAmount, ututAmount);
    }

    /**
     * @notice Convert uTUT back to TUT
     * @param ututAmount Amount of uTUT to convert (6 decimals)
     * @return tutAmount Amount of TUT received (18 decimals)
     */
    function convertToTut(uint256 ututAmount) external nonReentrant whenNotPaused returns (uint256 tutAmount) {
        if (ututAmount == 0) revert ZeroAmount();

        tutAmount = ututAmount * CONVERSION_FACTOR;

        uint256 tutBalance = tutToken.balanceOf(address(this));
        if (tutAmount > tutBalance) {
            revert InsufficientTutReserve(tutAmount, tutBalance);
        }

        ututToken.burnForConversion(msg.sender, ututAmount);

        totalTutDeposited -= tutAmount;
        totalUtutMinted -= ututAmount;

        tutToken.safeTransfer(msg.sender, tutAmount);

        emit ConvertedToTut(msg.sender, ututAmount, tutAmount);
    }

    /* ========== ADMIN FUNCTIONS ========== */

    /**
     * @notice Deposit TUT to back uTUT conversions
     * @param amount Amount of TUT to deposit
     */
    function depositTut(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (amount == 0) revert ZeroAmount();
        tutToken.safeTransferFrom(msg.sender, address(this), amount);
        emit TutDeposited(msg.sender, amount);
    }

    /**
     * @notice Withdraw TUT reserves
     * @param amount Amount of TUT to withdraw
     */
    function withdrawTut(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (amount == 0) revert ZeroAmount();
        uint256 tutBalance = tutToken.balanceOf(address(this));
        if (amount > tutBalance) {
            revert InsufficientTutReserve(amount, tutBalance);
        }
        tutToken.safeTransfer(msg.sender, amount);
        emit TutWithdrawn(msg.sender, amount);
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /* ========== VIEW FUNCTIONS ========== */

    function getTutReserve() external view returns (uint256) {
        return tutToken.balanceOf(address(this));
    }

    function previewConvertToUtut(uint256 tutAmount) external pure returns (uint256) {
        return tutAmount / CONVERSION_FACTOR;
    }

    function previewConvertToTut(uint256 ututAmount) external pure returns (uint256) {
        return ututAmount * CONVERSION_FACTOR;
    }
}
