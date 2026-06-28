// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

interface IERC5192 {
    event Locked(uint256 tokenId);
    event Unlocked(uint256 tokenId);

    function locked(uint256 tokenId) external view returns (bool);
}

/**
 * @title TolaniEcosystemNFT
 * @notice TCAS-compatible soulbound credential contract for Tolani ecosystem certifications.
 * @dev Stores compact public references only. Private learner evidence must remain off-chain.
 */
contract TolaniEcosystemNFT is ERC721URIStorage, AccessControl, Pausable, IERC5192 {
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    struct CredentialRecord {
        bytes32 credentialId;
        bytes32 credentialType;
        bytes32 evidenceHash;
        bytes32 sourceHash;
        address issuer;
        uint64 issuedAt;
        uint64 expiresAt;
        bool revoked;
    }

    uint256 private _nextTokenId;

    mapping(uint256 => CredentialRecord) private _credentialRecords;
    mapping(bytes32 => uint256) private _credentialTokenIds;
    mapping(address => string) private _issuerTypes;

    event CredentialIssued(address indexed recipient, bytes32 credentialId, string metadataURI);
    event CredentialRevoked(address indexed recipient, bytes32 credentialId, string reason);
    event CredentialRenewed(address indexed recipient, bytes32 credentialId, uint256 newExpiration);
    event IssuerApproved(address indexed issuer, string issuerType);
    event IssuerRemoved(address indexed issuer);

    error ZeroAddress();
    error EmptyCredentialId();
    error CredentialAlreadyIssued(bytes32 credentialId);
    error CredentialNotFound(uint256 tokenId);
    error CredentialRevokedAlready(uint256 tokenId);
    error CredentialNonTransferable(uint256 tokenId);
    error InvalidExpiration();

    constructor(address admin) ERC721("Tolani Ecosystem Credential", "TCAS") {
        if (admin == address(0)) revert ZeroAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ISSUER_ROLE, admin);
        _grantRole(REVOKER_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    /**
     * @notice Issue a soulbound credential with minimal TCAS fields.
     */
    function issueCredential(
        address recipient,
        bytes32 credentialId,
        string calldata metadataURI,
        uint64 expiresAt
    ) external onlyRole(ISSUER_ROLE) whenNotPaused returns (uint256 tokenId) {
        return _issueCredential(
            recipient,
            credentialId,
            metadataURI,
            bytes32(0),
            bytes32(0),
            bytes32(0),
            expiresAt
        );
    }

    /**
     * @notice Issue a soulbound credential with evidence and source hashes.
     */
    function issueCredentialWithEvidence(
        address recipient,
        bytes32 credentialId,
        string calldata metadataURI,
        bytes32 credentialType,
        bytes32 evidenceHash,
        bytes32 sourceHash,
        uint64 expiresAt
    ) external onlyRole(ISSUER_ROLE) whenNotPaused returns (uint256 tokenId) {
        return _issueCredential(
            recipient,
            credentialId,
            metadataURI,
            credentialType,
            evidenceHash,
            sourceHash,
            expiresAt
        );
    }

    function approveIssuer(
        address issuer,
        string calldata issuerType
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (issuer == address(0)) revert ZeroAddress();
        _issuerTypes[issuer] = issuerType;
        _grantRole(ISSUER_ROLE, issuer);
        emit IssuerApproved(issuer, issuerType);
    }

    function removeIssuer(address issuer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _issuerTypes[issuer] = "";
        _revokeRole(ISSUER_ROLE, issuer);
        emit IssuerRemoved(issuer);
    }

    function revokeCredential(
        uint256 tokenId,
        string calldata reason
    ) external onlyRole(REVOKER_ROLE) {
        address recipient = _credentialOwnerOf(tokenId);
        CredentialRecord storage record = _credentialRecords[tokenId];
        if (record.revoked) revert CredentialRevokedAlready(tokenId);

        record.revoked = true;
        emit CredentialRevoked(recipient, record.credentialId, reason);
    }

    function renewCredential(
        uint256 tokenId,
        uint64 newExpiration
    ) external onlyRole(ISSUER_ROLE) {
        _credentialOwnerOf(tokenId);
        if (newExpiration != 0 && newExpiration <= block.timestamp) {
            revert InvalidExpiration();
        }

        CredentialRecord storage record = _credentialRecords[tokenId];
        record.expiresAt = newExpiration;
        emit CredentialRenewed(ownerOf(tokenId), record.credentialId, newExpiration);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function locked(uint256 tokenId) external view override returns (bool) {
        _credentialOwnerOf(tokenId);
        return true;
    }

    function getCredentialRecord(
        uint256 tokenId
    ) external view returns (CredentialRecord memory) {
        _credentialOwnerOf(tokenId);
        return _credentialRecords[tokenId];
    }

    function getCredentialTokenId(bytes32 credentialId) external view returns (uint256) {
        return _credentialTokenIds[credentialId];
    }

    function getIssuerType(address issuer) external view returns (string memory) {
        return _issuerTypes[issuer];
    }

    function isCredentialActive(uint256 tokenId) external view returns (bool) {
        _credentialOwnerOf(tokenId);
        CredentialRecord memory record = _credentialRecords[tokenId];
        return !record.revoked && (record.expiresAt == 0 || record.expiresAt >= block.timestamp);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return interfaceId == type(IERC5192).interfaceId || super.supportsInterface(interfaceId);
    }

    function _issueCredential(
        address recipient,
        bytes32 credentialId,
        string calldata metadataURI,
        bytes32 credentialType,
        bytes32 evidenceHash,
        bytes32 sourceHash,
        uint64 expiresAt
    ) internal returns (uint256 tokenId) {
        if (recipient == address(0)) revert ZeroAddress();
        if (credentialId == bytes32(0)) revert EmptyCredentialId();
        if (_credentialTokenIds[credentialId] != 0) revert CredentialAlreadyIssued(credentialId);
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpiration();

        tokenId = ++_nextTokenId;
        _credentialTokenIds[credentialId] = tokenId;
        _credentialRecords[tokenId] = CredentialRecord({
            credentialId: credentialId,
            credentialType: credentialType,
            evidenceHash: evidenceHash,
            sourceHash: sourceHash,
            issuer: msg.sender,
            issuedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            revoked: false
        });

        _safeMint(recipient, tokenId);
        _setTokenURI(tokenId, metadataURI);

        emit CredentialIssued(recipient, credentialId, metadataURI);
        emit Locked(tokenId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert CredentialNonTransferable(tokenId);
        }
        return super._update(to, tokenId, auth);
    }

    function _credentialOwnerOf(uint256 tokenId) internal view returns (address owner) {
        owner = _ownerOf(tokenId);
        if (owner == address(0)) revert CredentialNotFound(tokenId);
    }
}
