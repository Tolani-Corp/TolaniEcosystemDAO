# TUT Utility & Evidence Authority Plane v1

## Decision

TUT v1 is governed as a utility/governance rail whose economic actions must be downstream of independently governed source-system evidence. This increment does not activate public token sales, liquidity marketing, production minting, automated rewards, token-transfer services, or legal-membership admission.

The operating rule is:

> Source systems prove outcomes. The DAO decides policy and eligibility. Treasury authority approves economic action. Accounting records what actually occurred. TUT never rewrites the underlying fact.

## Wyoming DAO anchor

The authority plane records the verified formation facts for Tolani Ecosystem DAO LLC:

- Wyoming entity: `Tolani Ecosystem DAO LLC`
- Original ID: `2026-002049125`
- filed: `2026-08-05`
- management: member-managed
- public identifier: `0x90e9d7189D605a824C2481Fe88A1d9A7DDFAF71D`
- Governor identifier: `0xeEd65936FaEDb315c598F8b1aF796289BCE2B7f6`

The operating agreement has not been reconciled in this repository for this increment. Therefore code must not infer legal membership, member admission, transfer restrictions, distributions, or other legal rights that depend on that governing document.

## Ten control surfaces

### 1. Legal classification registry

`config/tut/legal-classification-v1.json` defines the current fail-closed classification posture:

- TAES class: `TUT_UTILITY_GOVERNANCE`
- production minting: disabled
- equity, debt, principal, interest, dividend, revenue share, redemption and subsidiary-ownership rights: false
- counsel review required before public sale/liquidity activation or investor-rights changes

This is a governance implementation posture, not a legal opinion.

### 2. Authorized utility registry

`config/tut/authorized-utilities-v1.json` identifies candidate entity/use-case pairs. Every v1 entry has `acceptanceEnabled: false`.

A registry entry does not mean an operating subsidiary currently accepts TUT. Activation requires separate commercial, legal, accounting, technical and treasury evidence.

### 3. Reward program registry

`config/tut/reward-programs-v1.json` separates evidence production, reward eligibility and emission.

Those are three different authorities:

```text
source event
  -> evidence production
  -> evidence review
  -> reward eligibility
  -> wallet/compliance gate where required
  -> treasury authorization
  -> external execution
  -> accounting/reconciliation
```

No source entity may collapse those steps.

### 4. Evidence Receipt schema

`schemas/tut-evidence-receipt-v1.schema.json` is deliberately pseudonymous. It contains hashes/digests and authority metadata, not worker/customer PII.

It does not contain:

- email
- phone
- name
- SSN
- date of birth
- wallet address
- requested TUT amount

The producer proves an event. The producer does not choose the reward amount.

### 5. Treasury authorization policy

`TUTUtilityEvidenceAuthority.authorizeReward()` records a treasury-approved entitlement only after reviewed evidence and configured program rules pass.

It does **not** mint or transfer TUT.

The authority contract has no ERC20 reference, no `MINTER_ROLE`, no `.mint()` call and no transfer primitive.

### 6. Wallet eligibility / AML / sanctions layer

The contract contains a wallet eligibility registry with states:

- `Unknown`
- `Eligible`
- `ReviewRequired`
- `Blocked`
- `Expired`

Programs declare whether wallet eligibility is required. The registry stores a digest of the authoritative screening evidence rather than sensitive identity information.

The exact KYC/AML/sanctions process is risk- and jurisdiction-dependent and remains outside this contract.

### 7. Emission budget controls

Reward programs can define:

- per-receipt cap
- epoch cap
- epoch start/end
- compliance requirement
- evidence-production status
- reward-eligibility status

`emissionEnabled` is forced to `false` by the v1 contract. Attempts to register a program with emission enabled revert.

### 8. Public TUT claims policy

`config/tut/public-claims-policy-v1.json` denies unapproved public claims by default and blocks themes including:

- price appreciation
- guaranteed value/returns/liquidity
- dividends
- revenue share
- interest/principal
- equity/subsidiary ownership
- automatic legal DAO membership
- investment/profit promises

AI-generated token campaigns and public-sale/liquidity marketing remain disabled.

### 9. Membership firewall

The v1 contract hard-codes:

- `TOKEN_POSSESSION_CREATES_LEGAL_MEMBERSHIP = false`
- `TOKEN_VOTING_POWER_CREATES_LEGAL_MEMBERSHIP = false`
- `TOKEN_DELEGATION_CREATES_LEGAL_MEMBERSHIP = false`

The registry also states that legal member admission is governed by the operating agreement and formal legal admission—not token balance, delegation, reward receipt or a source-system event.

This does not remove TUT's technical ERC20Votes capability. It prevents technical voting power from being silently recharacterized as legal LLC membership.

### 10. Entity accounting ledger

The v1 accounting protocol records:

- `EARNED`
- `ISSUED`
- `REDEEMED`
- `EXPIRED`
- `BURNED`
- `TREASURY_HELD`

Every observed external accounting action requires an immutable external receipt digest. `ISSUED` entries must reference an existing, non-revoked, non-expired authorization and cannot exceed its authorized amount.

Recording an accounting entry does not itself cause a token movement.

## TaskStaff: first evidence producer

TaskStaff is the first admitted evidence producer through:

- entity: `tolani.taskstaff`
- program: `taskstaff.worker-qualification-evidence.v1`
- source event: `worker_intake.qualified`
- TAES class: `E0_EVIDENCE_ANCHOR`

This pilot is intentionally **evidence-only**:

- evidence production: enabled
- reward eligibility: disabled
- emission: disabled
- per-receipt TUT cap: 0
- epoch TUT cap: 0

A human-qualified TaskStaff worker-intake event can therefore prove that the cross-repository evidence contract works without implying employment, placement, compensation, token entitlement, wallet eligibility or legal DAO membership.

A reserved future program, `taskstaff.accepted-mission-outcome.v1`, exists only as a disabled policy placeholder. It may not activate until an authoritative mission-outcome acceptance event, worker-classification/tax analysis, treasury budget, wallet policy, legal review and production execution path are separately accepted.

## TAES dependency

This plane inherits the DAO TAES boundary:

- `E0_EVIDENCE_ANCHOR`
- `TUT_UTILITY_GOVERNANCE`
- `productionMintingEnabled: false`

`F1_FINANCIAL_RWA_INSTRUMENT` and `C1_COLLATERAL_ELIGIBLE_ASSET` are not enabled by this plane.

## Production promotion requirements

Before any actual TUT reward distribution is enabled, require at minimum:

1. reconciled operating agreement and current legal review;
2. explicit decision on the canonical deployed TUT contract/source-of-truth conflict;
3. approved treasury/multisig/timelock execution path;
4. contract role transfer away from individual owner authority where applicable;
5. wallet eligibility policy appropriate to the use case and jurisdictions;
6. tax/accounting treatment for reward recipients and entities;
7. live evidence-producer authentication and anti-replay controls;
8. per-program budget approval;
9. staging/testnet execution and revocation evidence;
10. independent security review;
11. explicit production authority receipt.

Until those gates pass, v1 remains an evidence, eligibility, authorization and accounting control plane—not a production token-distribution engine.
