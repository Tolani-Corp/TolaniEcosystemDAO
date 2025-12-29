// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/governance/utils/IVotes.sol";

/**
 * @title ITUTToken
 * @dev Interface for the Tolani Utility Token (TUT) from the TolaniToken repository
 * @notice This interface defines the expected functions from the deployed TUT token
 * @custom:repository https://github.com/Tolani-Corp/TolaniToken
 * 
 * TUT Token Details:
 * - Symbol: TUT
 * - Decimals: 18
 * - Initial Supply: 50,000,000 TUT
 * - Max Cap: 100,000,000 TUT
 * - Features: ERC20, Capped, Burnable, Pausable, Upgradeable (UUPS)
 * - Roles: MINTER_ROLE, PAUSER_ROLE, UPGRADER_ROLE
 */
interface ITUTToken is IERC20, IVotes {
    // Role constants
    function MINTER_ROLE() external view returns (bytes32);
    function PAUSER_ROLE() external view returns (bytes32);
    function UPGRADER_ROLE() external view returns (bytes32);
    
    // Cap functionality
    function cap() external view returns (uint256);
    
    // Minting (requires MINTER_ROLE)
    function mint(address to, uint256 amount) external;
    
    // Pause functionality (requires PAUSER_ROLE)
    function pause() external;
    function unpause() external;
    function paused() external view returns (bool);
    
    // Burn functionality
    function burn(uint256 amount) external;
    function burnFrom(address account, uint256 amount) external;
    
    // Role management
    function hasRole(bytes32 role, address account) external view returns (bool);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
}
