# Tolani Ecosystem DAO

A Hardhat-based DAO and token infrastructure repository for the Tolani ecosystem.

This repository now contains the canonical Tolani token stack:
- `contracts/token/TUTToken.sol`: stable deployment entrypoint for the TUT token
- `contracts/TUTTokenSmartV2.sol`: production TUT implementation
- `contracts/training/uTUT.sol`: utility token for learning, rewards, and micro-transactions
- `contracts/training/TUTConverter.sol`: conversion rail between TUT and uTUT

## Overview

The Tolani Ecosystem DAO provides governance and treasury infrastructure for:
- protocol governance
- role management
- treasury management
- ecosystem operations
- training, rewards, and utility-token flows

### Smart Contracts

1. `TUTToken`: canonical upgradeable TUT deployment entrypoint
2. `TolaniEcosystemGovernor`: Governor contract for creating and voting on proposals
3. `TolaniEcosystemTimelock`: Timelock controller for delayed execution
4. `TolaniTreasury`: Treasury contract for managing DAO funds
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

## Governance Parameters

| Parameter | Value |
|-----------|-------|
| Voting Delay | 1 day (~7,200 blocks) |
| Voting Period | 1 week (~50,400 blocks) |
| Proposal Threshold | 100,000 TUT |
| Quorum | 4% of total supply |
| Timelock Delay | 1 hour |

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
# Start a local node
pnpm node

# Deploy canonical TUT
pnpm deploy:tut:local

# Deploy DAO core against canonical TUT
pnpm deploy:local
```

### Sepolia

```bash
pnpm deploy:tut:sepolia
pnpm deploy:sepolia
```

### Environment

Create a `.env` file with at least:

```env
TUT_TOKEN_ADDRESS=0x...
SEPOLIA_RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
TUT_TRUSTED_FORWARDER=0x...
```

If `TUT_TOKEN_ADDRESS` is omitted, the deploy scripts now default to deploying the canonical TUT token from this repository. Set `USE_MOCK_GOV_TOKEN=true` only when you explicitly want the legacy mock path.

## Project Structure

```text
contracts/
  token/
    TUTToken.sol
  TUTTokenSmartV2.sol
  TolaniGovernor.sol
  TolaniTimelock.sol
  TolaniTreasury.sol
  training/
    uTUT.sol
    TUTConverter.sol
  mocks/
    MockGovernanceToken.sol
scripts/
  deploy-tut-token.js
  deploy.js
  deploy-full.js
test/
  TUTToken.test.js
  TolaniDAO.test.js
```

## Governance Flow

1. Acquire or mint TUT
2. Delegate voting power
3. Create proposals
4. Vote
5. Queue in timelock
6. Execute after delay

## Notes

- `MockGovernanceToken.sol` remains in the repository as an explicit fallback for isolated testing only.
- The canonical source of truth for TUT in this repo is `contracts/token/TUTToken.sol`.
- Historical references to an external `TolaniToken` repository are deprecated.

## License

MIT
