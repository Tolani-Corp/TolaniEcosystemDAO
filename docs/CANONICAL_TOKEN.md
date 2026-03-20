# Canonical TUT Token Documentation

## Official Token Version

| Property | Value |
|----------|-------|
| Canonical Contract | `contracts/token/TUTToken.sol` |
| Repository | `TolaniEcosystemDAO` |
| Solidity Version | `0.8.28` |
| OpenZeppelin Version | `5.x (upgradeable)` |
| Status | Production-ready deployment path |

## Token Variants

### TUT

Main governance and treasury token.

| Property | Value |
|----------|-------|
| Symbol | `TUT` |
| Decimals | `18` |
| Initial Supply | `50,000,000 TUT` |
| Max Cap | `100,000,000 TUT` |
| Features | Votes, Permit, Burnable, Pausable, Blacklist, UUPS |

### uTUT

Utility token for learning, rewards, and micro-transactions.

| Property | Value |
|----------|-------|
| Symbol | `uTUT` |
| Decimals | `6` |
| Purpose | Training rewards, ESG utility, payment rails |

## Repository Structure

```text
contracts/
  token/
    TUTToken.sol
  TUTTokenSmartV2.sol
  TolaniToken.sol
  training/
    uTUT.sol
    TUTConverter.sol
```

## Deployment Guidance

Use `contracts/token/TUTToken.sol` for all new deployments.

The underlying implementation remains `contracts/TUTTokenSmartV2.sol`, but external integrations, scripts, and tests should point to the canonical `TUTToken` entrypoint.

### Deployment Commands

```bash
pnpm deploy:tut:local
pnpm deploy:tut:sepolia
```

### Initialize Parameters

```solidity
function initialize(
    address owner,
    uint256 initialSupply,
    uint256 cap,
    address forwarder
) external initializer
```

## Operational Rules

1. Use `TUTToken.sol` as the canonical contract name.
2. Do not use mock governance tokens outside isolated tests.
3. Treat this repository as the source of truth for TUT and uTUT.
4. Transfer operational roles to timelock or multisig before production use.
