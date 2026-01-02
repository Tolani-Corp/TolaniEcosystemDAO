// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IWorldID.sol";

/**
 * @title WorldIDVerifier
 * @notice Verifies World ID proofs for Tolani Labs anti-sybil protection
 * @dev Integrates with World ID to ensure 1 human = 1 learner for fair reward distribution
 * 
 * Use Cases:
 * - Prevent bot farming of uTUT rewards
 * - Ensure fair distribution of training rewards
 * - Sybil-resistant scholarship programs (Foundation)
 */
contract WorldIDVerifier is AccessControl {
    /// @notice World ID contract address
    IWorldID public immutable worldId;
    
    /// @notice World ID app ID (from Developer Portal)
    uint256 public immutable appId;
    
    /// @notice Action ID for Tolani Labs verification
    uint256 public immutable actionId;
    
    /// @notice Group ID: 1 = Orb verified (highest trust), 0 = Device verified
    uint256 public groupId = 1;
    
    /// @notice Tracks nullifiers to prevent double-verification
    mapping(uint256 => bool) public nullifierHashes;
    
    /// @notice Maps wallet addresses to their verification status
    mapping(address => bool) public isVerified;
    
    /// @notice Maps wallet addresses to their nullifier hash
    mapping(address => uint256) public walletNullifier;
    
    /// @notice Manager role for configuration
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    
    /// @notice Events
    event Verified(address indexed wallet, uint256 nullifierHash);
    event GroupIdUpdated(uint256 oldGroupId, uint256 newGroupId);
    event VerificationRevoked(address indexed wallet, uint256 nullifierHash);
    
    /// @notice Errors
    error InvalidProof();
    error AlreadyVerified();
    error NullifierAlreadyUsed();
    error NotVerified();
    error ZeroAddress();
    
    /**
     * @notice Constructor
     * @param _worldId World ID contract address
     * @param _appId World ID app ID from Developer Portal
     * @param _actionId Action ID for this verification
     * @param _governance Governance address for admin role
     */
    constructor(
        address _worldId,
        uint256 _appId,
        uint256 _actionId,
        address _governance
    ) {
        if (_worldId == address(0) || _governance == address(0)) revert ZeroAddress();
        
        worldId = IWorldID(_worldId);
        appId = _appId;
        actionId = _actionId;
        
        _grantRole(DEFAULT_ADMIN_ROLE, _governance);
        _grantRole(MANAGER_ROLE, _governance);
    }
    
    /**
     * @notice Verify a World ID proof and mark wallet as verified
     * @param wallet The wallet address to verify
     * @param root The World ID Merkle root
     * @param nullifierHash The nullifier hash (unique per user per action)
     * @param proof The ZK proof
     */
    function verify(
        address wallet,
        uint256 root,
        uint256 nullifierHash,
        uint256[8] calldata proof
    ) external {
        if (wallet == address(0)) revert ZeroAddress();
        if (isVerified[wallet]) revert AlreadyVerified();
        if (nullifierHashes[nullifierHash]) revert NullifierAlreadyUsed();
        
        // Compute signal hash (the wallet address being verified)
        uint256 signalHash = uint256(keccak256(abi.encodePacked(wallet))) >> 8;
        
        // Compute external nullifier hash
        uint256 externalNullifierHash = uint256(
            keccak256(abi.encodePacked(appId, actionId))
        ) >> 8;
        
        // Verify the proof with World ID
        worldId.verifyProof(
            root,
            groupId,
            signalHash,
            nullifierHash,
            externalNullifierHash,
            proof
        );
        
        // Mark as verified
        nullifierHashes[nullifierHash] = true;
        isVerified[wallet] = true;
        walletNullifier[wallet] = nullifierHash;
        
        emit Verified(wallet, nullifierHash);
    }
    
    /**
     * @notice Check if a wallet is World ID verified
     * @param wallet The wallet to check
     * @return bool True if verified
     */
    function isHuman(address wallet) external view returns (bool) {
        return isVerified[wallet];
    }
    
    /**
     * @notice Update the group ID (Orb vs Device verification level)
     * @param _groupId New group ID (1 = Orb, 0 = Device)
     */
    function setGroupId(uint256 _groupId) external onlyRole(MANAGER_ROLE) {
        require(_groupId <= 1, "Invalid group ID");
        uint256 oldGroupId = groupId;
        groupId = _groupId;
        emit GroupIdUpdated(oldGroupId, _groupId);
    }
    
    /**
     * @notice Revoke verification (admin only, for abuse cases)
     * @param wallet The wallet to revoke
     */
    function revokeVerification(address wallet) external onlyRole(MANAGER_ROLE) {
        if (!isVerified[wallet]) revert NotVerified();
        
        uint256 nullifier = walletNullifier[wallet];
        isVerified[wallet] = false;
        // Note: We don't remove nullifierHashes to prevent re-verification abuse
        
        emit VerificationRevoked(wallet, nullifier);
    }
    
    /**
     * @notice Batch check verification status
     * @param wallets Array of wallets to check
     * @return statuses Array of verification statuses
     */
    function batchIsHuman(address[] calldata wallets) 
        external 
        view 
        returns (bool[] memory statuses) 
    {
        statuses = new bool[](wallets.length);
        for (uint256 i = 0; i < wallets.length; i++) {
            statuses[i] = isVerified[wallets[i]];
        }
    }
}
