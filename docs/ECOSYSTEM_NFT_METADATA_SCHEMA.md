# Ecosystem NFT Metadata Schema

## Metadata Envelope

NFT metadata must follow this public-safe envelope before it is pinned or submitted to a mint transaction.

```json
{
  "schema": "dao.dynamic-nft-metadata.v1",
  "sourceOfTruthId": "TUT-CERT-2026-000001",
  "policyId": "tut.training-certificate.nft.v1",
  "policyVersion": "1.0.0",
  "recordType": "training_certificate",
  "name": "Training Certificate NFT",
  "description": "Verified Tolani training completion credential.",
  "issuer": "Tolani Ecosystem DAO",
  "recipientWallet": "0x0000000000000000000000000000000000000000",
  "issuedAt": "2026-06-06T00:00:00.000Z",
  "source": {
    "type": "training_certificate",
    "id": "training-record-id",
    "system": "TrainingRewards",
    "uri": "https://example.invalid/source-record"
  },
  "evidence": [
    {
      "label": "Completion proof hash",
      "uri": "ipfs://metadata-or-proof-reference",
      "hash": "0x0000000000000000000000000000000000000000000000000000000000000000",
      "privacy": "limited"
    }
  ],
  "attributes": [
    {
      "trait_type": "Policy",
      "value": "tut.training-certificate.nft.v1"
    },
    {
      "trait_type": "Transferability",
      "value": "ERC-5192 soulbound"
    }
  ],
  "revocation": {
    "status": "active"
  }
}
```

## Required Metadata Fields

| Field | Required | Notes |
| --- | --- | --- |
| `schema` | Yes | Must be `dao.dynamic-nft-metadata.v1` |
| `sourceOfTruthId` | Yes | Durable off-chain anchor |
| `policyId` | Yes | Active policy ID used at issuance |
| `policyVersion` | Yes | Policy version used at issuance |
| `recordType` | Yes | One of the approved NFT record types |
| `name` | Yes | Human-readable token title |
| `description` | Yes | Utility or credential description, not investment language |
| `issuer` | Yes | Organization, system, or issuer wallet |
| `recipientWallet` | Conditional | Required for person or wallet-specific credentials |
| `issuedAt` | Yes | ISO timestamp |
| `source` | Yes | Source system and source record ID |
| `evidence` | Yes | At least one hash or URI for required proof |
| `attributes` | Yes | Public-safe traits only |
| `revocation` | Yes | Starts as `active` |

## Convex Mint Record

The operational record is stored in `nftMintRecords`.

```json
{
  "schema": "dao.dynamic-nft-record.v1",
  "sourceType": "training_certificate",
  "sourceId": "training-record-id",
  "sourceOfTruthId": "TUT-CERT-2026-000001",
  "policyId": "tut.training-certificate.nft.v1",
  "policyVersion": "1.0.0",
  "recordTitle": "Training Certificate NFT",
  "status": "approved",
  "tokenStandard": "ERC5192",
  "transferability": "soulbound",
  "chainId": 8453,
  "metadataUri": "ipfs://metadata-json",
  "metadataHash": "0xmetadatahash",
  "evidenceUri": "r2://private-proof-object",
  "evidenceHash": "0xevidencehash",
  "recipientWallet": "0x0000000000000000000000000000000000000000",
  "issuerWallet": "0x0000000000000000000000000000000000000000",
  "reviewerWallet": "0x0000000000000000000000000000000000000000",
  "createdAt": 1780704000000,
  "updatedAt": 1780704000000
}
```

## TCAS Credential Contract Record

`contracts/ecosystem/TolaniEcosystemNFT.sol` stores only compact public references. It is the on-chain credential layer for TCAS training certificates and other non-transferable ecosystem credentials.

```solidity
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
```

Duplicate prevention:

```solidity
mapping(bytes32 credentialId => uint256 tokenId)
```

The contract implements ERC-5192-style `locked(tokenId)` behavior. Minting is allowed by approved issuers, renewal is allowed by approved issuers, and revocation is allowed by approved revokers. Wallet-to-wallet transfers, sales, marketplace listings, and delegated assignment must fail.

## Privacy Rules

- Public metadata can contain source IDs, policy IDs, public evidence hashes, public project identifiers, issuer references, and token lifecycle state.
- Private or limited metadata must remain in R2, D1, Convex, or another controlled data store.
- Token metadata must not expose private learner information, payroll records, supplier pricing, raw work files, private compliance notes, private certificate files, or unpublished treasury strategy.
- If a field cannot be safely disclosed, store its hash publicly and keep the underlying file behind access controls.
