# TCAS Credential Contract

`contracts/ecosystem/TolaniEcosystemNFT.sol` is the DAO-side contract for Tolani Certified Access System credential tokens.

## Purpose

The contract mints non-transferable certification credentials for completed and approved Tolani ecosystem training, inspections, steward roles, bounty authorization, and service-delivery authority.

These tokens are work-access credentials, not collectibles or investment assets.

## Token Rules

- Standard posture: ERC-5192-style soulbound NFT.
- Transferable: false.
- Sellable: false.
- Tradable: false.
- Assignable: false.
- Marketplace listing: false.
- Minting: approved issuer only.
- Renewal: approved issuer only.
- Revocation: approved revoker only.
- Private learner evidence stays off-chain; only hashes and public-safe metadata URI are stored.

## Main Functions

```solidity
issueCredential(address recipient, bytes32 credentialId, string metadataURI, uint64 expiresAt)

issueCredentialWithEvidence(
  address recipient,
  bytes32 credentialId,
  string metadataURI,
  bytes32 credentialType,
  bytes32 evidenceHash,
  bytes32 sourceHash,
  uint64 expiresAt
)

revokeCredential(uint256 tokenId, string reason)
renewCredential(uint256 tokenId, uint64 newExpiration)
locked(uint256 tokenId)
isCredentialActive(uint256 tokenId)
```

## Events

```solidity
CredentialIssued(address indexed recipient, bytes32 credentialId, string metadataURI)
CredentialRevoked(address indexed recipient, bytes32 credentialId, string reason)
CredentialRenewed(address indexed recipient, bytes32 credentialId, uint256 newExpiration)
IssuerApproved(address indexed issuer, string issuerType)
IssuerRemoved(address indexed issuer)
```

## Deployment

Base Sepolia:

```bash
pnpm credentials:deploy:base-sepolia
```

Base mainnet:

```bash
pnpm credentials:deploy:base
```

Optional environment:

```bash
TCAS_ADMIN_ADDRESS=0x...
TCAS_ISSUER_ADDRESS=0x...
TCAS_ISSUER_TYPE="Tolani Foundation"
TCAS_REVOKER_ADDRESS=0x...
```

Production deployment should wait for DAO-approved admin, issuer, revoker, Safe, and timelock posture.
