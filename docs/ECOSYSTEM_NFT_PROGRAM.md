# Tolani Ecosystem NFT Program

## Status

This document is the operating policy for ecosystem NFTs issued by the Tolani Ecosystem DAO. It defines what can be minted, which records act as the source of truth, how evidence is stored, and which controls are required before minting.

The executable frontend policy registry is `frontend/src/lib/nft-policy.ts`. The persisted issuance state is `frontend/convex/nftMintRecords.ts` and the `nftMintRecords` table in `frontend/convex/schema.ts`.

## Program Objectives

- Issue verifiable credentials for training completions, steward roles, DAO evidence approvals, work orders, and accepted deliverables.
- Keep NFTs anchored to existing DAO records instead of creating a second source of truth.
- Publish only safe public metadata on-chain and keep private evidence in controlled storage.
- Support revocation and supersession without deleting historical issuance records.
- Prepare a clean path to a future `TolaniEcosystemNFT` contract on Base.

## Source Of Truth IDs

Every NFT must have one durable source-of-truth ID before metadata is pinned or minted.

| Record Type | Policy ID | Source ID Format | Source System |
| --- | --- | --- | --- |
| Training certificate | `tut.training-certificate.nft.v1` | `TUT-CERT-{YYYY}-{SEQ}` | Training rewards, SkillsBuild, verified credential provider |
| Work order | `tccg.work-order.nft.v1` | `TCCG-WO-{YYYY}-{SEQ}` | Work board, TCCG operations |
| Work deliverable | `tccg.work-deliverable.nft.v1` | `TCCG-DELIV-{YYYY}-{SEQ}` | Work deliverable and review records |
| DAO evidence packet | `dao.evidence-packet.nft.v1` | `DAO-EVID-{YYYY}-{SEQ}` | Tolani Labs to DAO evidence queue |
| Steward badge | `tolani.steward-badge.nft.v1` | `TOLANI-BADGE-{YYYY}-{SEQ}` | Steward registry, governance, role administration |

The Convex `nftMintRecords.sourceOfTruthId` field is the operational anchor. On-chain token metadata should also include this ID.

## Dynamic Policy Structure

Each policy version defines:

- `id`, `schema`, `version`, `name`, and `recordType`
- `sourceOfTruthPrefix`
- `tokenStandard`
- `transferability`
- issuer, approver, and revocation roles
- mint triggers
- required evidence
- required public metadata fields
- metadata and evidence storage targets
- privacy level
- risk controls
- status flow
- on-chain and off-chain fields
- whether DAO proposal approval is required

Current status flow:

```text
draft -> eligible -> approved -> mint_queued -> minted
                                      |
                                      v
                         revoked or superseded
```

Rejected records remain auditable and can be remediated by creating a corrected record or moving the same record back through review.

## Token Rules

Training certificates, work deliverable credentials, DAO evidence records, and steward badges should be non-transferable. They represent facts about a person, role, review, or source record and should not be treated as tradable collectibles.

Work order NFTs may be assignment-restricted when they represent operational rights or responsibility. Transfer or reassignment must be controlled by the work owner or DAO policy, not by open market transfers.

## Contract Authority

Do not treat the deployer wallet as the long-term authority. The smart default is:

- `Tolani DAO` owns and administers protocol-level contracts, treasury-linked contracts, governance-linked NFT contracts, and anything that implies DAO authority, public credentials, or token/reward control.
- `Tolani Labs` may deploy or operate lab, education, validation, and metadata tooling, but should act as an issuer or service operator under DAO-approved policy when the NFT affects DAO credentials, rewards, or governance records.
- Production admin roles should move to a Safe, timelock, or DAO-approved role structure. A human deployer can create the contract, but should not remain the durable owner.
- Lab-specific contracts can be created by Tolani Labs when they do not custody DAO funds, do not imply DAO governance authority, and do not mint DAO credentials without DAO approval.

Practical rule: `Tolani Labs can originate evidence; Tolani DAO controls canonical ecosystem issuance`.

Recommended future contract:

```text
contracts/ecosystem/TolaniEcosystemNFT.sol
```

Recommended contract features:

- `ERC721` issuer contract for typed ecosystem records.
- `AccessControl` roles for issuer, revoker, pauser, and admin.
- Non-transferable behavior for credentials and evidence.
- Duplicate prevention by `keccak256(kind, recipient, referenceId, evidenceHash)`.
- On-chain fields limited to token ID, owner, token URI, reference hash, evidence hash, issuer, timestamps, and revocation state.
- No raw learner data, work files, grades, payroll details, or private evidence on-chain.

## Storage Policy

Use a layered storage model:

| Layer | Purpose |
| --- | --- |
| Convex | Operational review state, mint status, source links, and UI query state |
| D1 | Durable production index for public IDs, hash manifests, and audit joins |
| R2 | Private or limited evidence files, work artifacts, and generated metadata before pinning |
| IPFS | Public metadata JSON and public image assets when the record is ready to mint |
| Chain | Token ownership, token URI, evidence hash, source reference, and lifecycle events |

Public metadata may include:

- source-of-truth ID
- policy ID and version
- record type
- title
- issuer name or issuer wallet
- recipient wallet when appropriate
- issue date
- public evidence hash
- token lifecycle status

Public metadata must not include:

- private learner identity
- raw certificate files unless approved for public release
- payroll data
- bids, invoices, supplier pricing, or internal operating records
- private work files
- sensitive compliance notes

## Execution Workflow

1. Source intake
   - Create or identify the canonical source record.
   - Assign a source-of-truth ID using the active policy prefix.
   - Select the matching policy ID and version.

2. Evidence pack
   - Attach required proof, review notes, and hash values.
   - Store private evidence in R2 or the approved evidence store.
   - Draft public-safe metadata.

3. Policy review
   - Confirm required evidence and metadata fields.
   - Confirm recipient wallet and issuer role.
   - Confirm whether DAO proposal approval is required.

4. Storage lock
   - Write or update the Convex `nftMintRecords` entry.
   - Store metadata in R2.
   - Pin public metadata to IPFS when ready.
   - Record metadata URI and metadata hash.

5. Mint execution
   - Submit mint transaction from an approved issuer wallet or controlled mint service.
   - Record contract address, chain ID, token ID, and transaction hash.
   - Move mint record to `minted`.

6. Lifecycle control
   - Revoke when a credential or role is invalidated.
   - Supersede when a corrected record replaces the original.
   - Keep all historical records auditable.

## Dynamic Pre-Mint Rail

It is acceptable to build the dynamic mint rail before all production roles, storage, and duplicate-prevention components are settled, but only as a pre-mint rail. The rail may create draft, eligible, and approved records. It must not broadcast mint transactions or mark records as minted until all hard gates pass.

Hard gates before `eligible`:

- Active policy ID and version.
- Source-of-truth ID.

Hard gates before `mint_queued`:

- Issuer and approver authority resolved.
- Metadata and evidence storage ready.
- Duplicate source/evidence checks configured.

Hard gates before `minted`:

- Contract address, chain, and mint function configured.
- Metadata hash and evidence hash recorded.
- Recipient wallet confirmed when the token is recipient-specific.

The executable readiness evaluator is `evaluateNftMintRailReadiness` in `frontend/src/lib/nft-policy.ts`.

## Shortfalls And Mitigations

| Shortfall | Risk | Mitigation |
| --- | --- | --- |
| No NFT issuer contract is deployed yet | UI records could imply mint readiness before on-chain rails exist | Keep mint records in `draft`, `eligible`, or `approved` until contract address and issuer roles are configured |
| Private data exposure | Token metadata could leak learner, project, payroll, or supplier details | Use hashes and restricted evidence URIs; keep private files in R2/D1 access-controlled storage |
| Duplicate credential issuance | Same proof could mint multiple tokens | Use source-of-truth ID uniqueness in Convex and duplicate keys in the future contract |
| False credential claims | Bad evidence could create trusted credentials | Require issuer proof, reviewer wallet, evidence hash, and optional DAO proposal approval |
| Wallet loss or wrong recipient | Credential may be stranded or issued incorrectly | Require wallet confirmation before mint; use revocation and supersession records |
| Policy drift | Frontend, Convex, and contract rules could diverge | Version every policy and store `policyId` plus `policyVersion` on every mint record |
| Financial or collectible framing | Credentials may be misread as investment products | Use utility, credential, and record language only; avoid price, rarity, or speculative claims |
| Work-order confidentiality | Public metadata could reveal private commercial terms | Publish only approved summaries; store work files and commercial attachments outside public token metadata |

## Immediate Execution Backlog

Completed in this phase:

- Added the dynamic policy registry at `frontend/src/lib/nft-policy.ts`.
- Added the `/nft-policy` UI surface and navigation entry.
- Added the `nftMintRecords` Convex table and public query/mutation functions.
- Added lifecycle states, risk controls, source-of-truth ID generation, and policy review structure.

Next implementation phase:

- Add `contracts/ecosystem/TolaniEcosystemNFT.sol`.
- Add Hardhat tests for soulbound transfer rejection, duplicate prevention, role gates, minting, revocation, and URI behavior.
- Add a deployment script for Base Sepolia first.
- Add R2 metadata writer and IPFS pinning worker.
- Add UI actions that create mint records from training completions, work board approvals, accepted deliverables, DAO evidence approvals, and steward badge assignments.
- Add D1 production index for source-of-truth IDs and metadata hash manifests.
