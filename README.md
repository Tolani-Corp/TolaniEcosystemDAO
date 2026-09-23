# Tolani Ecosystem DAO

A Hardhat-based enterprise DAO and TUT utility infrastructure repository for the Tolani ecosystem.

## Canonical role

**Tolani Ecosystem DAO, LLC is the enterprise / corporate-support DAO.** It coordinates enterprise protocol governance, TUT utility standards, enterprise treasury controls, role/operator registries, shared infrastructure and cross-company proposals.

**The Tolani Foundation Community DAO (TFDAO) is a separate public-benefit governance domain.** Foundation charitable assets, restricted donations, program authority, employment, safeguarding and legal/tax obligations do not inherit authority from this repository or from enterprise DAO votes.

See:

- `docs/GOVERNANCE_DOMAIN_SPLIT_V1.md`
- `config/governance-domains.v1.json`

This repository contains the canonical Tolani token stack:
- `contracts/token/TUTToken.sol`: stable deployment entrypoint for the TUT token
- `contracts/TUTTokenSmartV2.sol`: production TUT implementation
- `contracts/training/uTUT.sol`: utility token for learning, rewards, and micro-transactions
- `contracts/training/TUTConverter.sol`: conversion rail between TUT and uTUT

## Enterprise governance scope

The Tolani Ecosystem DAO provides governance and treasury infrastructure for:
- enterprise protocol governance
- TUT utility standards and interoperability
- enterprise role management
- enterprise treasury management
- ecosystem partner/operator governance
- shared infrastructure coordination

It does **not** provide direct authority over Foundation restricted donations, Foundation community treasury assets, Foundation employment/safeguarding or charitable program execution.

### Smart Contracts

1. `TUTToken`: canonical upgradeable TUT deployment entrypoint
2. `TolaniEcosystemGovernor`: enterprise Governor contract for creating and voting on proposals
3. `TolaniEcosystemTimelock`: enterprise timelock controller
4. `TolaniTreasury`: enterprise DAO treasury contract
5. `uTUT`: 6-decimal utility token for learning and rewards
6. `TUTConverter`: bridge/conversion rail between TUT and uTUT

## TUT Token Details

| Property | Value |
|----------|-------|
| Symbol | `TUT` |
| Decimals | `18` |
| Initial Supply | `50,000,000 TUT` |
| Max Cap | `100,000,000 TUT` |
| Features | ERC20, ERC20Votes, Permit, Burnable, Pausable, Blacklist, UUPS |

## Current Governor parameters

| Parameter | Value |
|-----------|-------|
| Voting Delay | 1 day (~7,200 blocks) |
| Voting Period | 1 week (~50,400 blocks) |
| Proposal Threshold | 100,000 TUT |
| Quorum | 4% of total supply |
| Timelock Delay | 1 hour |

These parameters apply to the current **enterprise DAO Governor** implementation. They do not define Foundation Community DAO membership or voting weight.

## Installation

```bash
pnpm install
```

## Compile Contracts

```bash
pnpm compile
```

## Run Tests

```bash
pnpm test
```

## Deploy

### Local Network

```bash
pnpm node
pnpm deploy:tut:local
pnpm deploy:local
```

### Sepolia

```bash
pnpm deploy:tut:sepolia
pnpm deploy:sepolia
```

### Environment

```env
TUT_TOKEN_ADDRESS=0x...
SEPOLIA_RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
TUT_TRUSTED_FORWARDER=0x...
```

If `TUT_TOKEN_ADDRESS` is omitted, deploy scripts default to the canonical TUT token from this repository. Set `USE_MOCK_GOV_TOKEN=true` only for isolated testing.

## Enterprise governance flow

1. Establish eligible enterprise governance identity/power.
2. Create an enterprise proposal.
3. Vote.
4. Queue in the enterprise timelock.
5. Execute only within enterprise authority after delay.

A proposal targeting The Tolani Foundation must cross the Foundation authority boundary and obtain a **Foundation decision receipt** before Foundation-side execution. Enterprise passage alone is not Foundation authority.

## Migration posture

Governance-domain split v1 is specification/shadow only. It does not activate new money movement, Foundation custody, Foundation smart-contract authority or production cross-domain execution.

## License

MIT
