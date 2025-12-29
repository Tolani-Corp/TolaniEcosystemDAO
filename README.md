# Tolani Ecosystem DAO

A decentralized autonomous organization (DAO) built with Hardhat and OpenZeppelin Governor contracts to manage the **Tolani Utility Token (TUT)** ecosystem.

## 🔗 Related Repository

This DAO is designed to govern the TUT token ecosystem:
- **TUT Token Repository**: [https://github.com/Tolani-Corp/TolaniToken](https://github.com/Tolani-Corp/TolaniToken)

## Overview

The Tolani Ecosystem DAO provides governance infrastructure for the TUT token, enabling token holders to participate in:

- **Protocol Governance** - Vote on proposals affecting the TUT ecosystem
- **Role Management** - Control MINTER_ROLE, PAUSER_ROLE, UPGRADER_ROLE on TUT token
- **Treasury Management** - Manage DAO funds and token distributions
- **Ecosystem Operations** - Govern TUT Escrow, HVAC Services, Faucet, and other contracts

### Smart Contracts

1. **ITUTToken** - Interface for the deployed TUT token (ERC20Votes compatible)
2. **TolaniEcosystemGovernor** - Governor contract for creating and voting on proposals
3. **TolaniEcosystemTimelock** - Timelock controller for delayed execution of passed proposals
4. **TolaniTreasury** - Treasury contract for managing DAO funds

## TUT Token Details

From the [TolaniToken repository](https://github.com/Tolani-Corp/TolaniToken):

| Property | Value |
|----------|-------|
| **Symbol** | TUT |
| **Decimals** | 18 |
| **Initial Supply** | 50,000,000 TUT |
| **Max Cap** | 100,000,000 TUT |
| **Features** | ERC20, Capped, Burnable, Pausable, Upgradeable (UUPS) |
| **Networks** | Ethereum, Polygon, Arbitrum |

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

### Prerequisites

1. Clone and deploy the TUT token from [TolaniToken repository](https://github.com/Tolani-Corp/TolaniToken)
2. Note the deployed TUT proxy address

### Local Network (Testing)

```bash
# Start a local node
pnpm node

# Deploy in another terminal (uses mock token for testing)
pnpm deploy:local
```

### Production Deployment

1. Create a `.env` file:
```env
TUT_TOKEN_ADDRESS=0x...  # Deployed TUT proxy address
SEPOLIA_RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
```

2. Deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Post-Deployment Setup

After deploying the DAO contracts, grant roles on the TUT token to the Timelock:

```bash
# On the TUT token contract, call:
# grantRole(MINTER_ROLE, timelockAddress)
# grantRole(PAUSER_ROLE, timelockAddress)
# grantRole(UPGRADER_ROLE, timelockAddress)
```

## Contract Addresses

After deployment, contract addresses will be displayed. Save them for frontend integration.

## Governance Flow

1. **Get TUT Tokens** - Acquire TUT tokens from the Tolani ecosystem
2. **Delegate** - Token holders delegate voting power to themselves or others
3. **Propose** - Create a proposal (requires 100,000 TUT tokens)
4. **Vote** - Vote on active proposals (For, Against, Abstain)
5. **Queue** - Queue passed proposals in the timelock
6. **Execute** - Execute after timelock delay (1 hour)

## Project Structure

```
├── contracts/
│   ├── TolaniToken.sol       # ITUTToken interface
│   ├── TolaniGovernor.sol    # Governor contract
│   ├── TolaniTimelock.sol    # Timelock controller
│   ├── TolaniTreasury.sol    # Treasury contract
│   └── mocks/
│       └── MockGovernanceToken.sol  # Mock token for testing
├── scripts/
│   └── deploy.js             # Deployment script
├── test/
│   └── TolaniDAO.test.js     # Test suite
├── hardhat.config.js         # Hardhat configuration
└── package.json
```

## Integration with TUT Ecosystem

This DAO can manage the following contracts from the TolaniToken repository:

| Contract | Purpose |
|----------|---------|
| TUTToken | Main utility token (ERC20, Votes, Upgradeable) |
| TUTEscrow | Escrow payments between parties |
| TUTHVACServices | HVAC service order management |
| TUTFaucet | Test token distribution |
| TUTDAO | Lightweight on-chain governance |
| TUTGovernor | Full OpenZeppelin Governor |

## ENS Domains

The Tolani ecosystem uses these ENS domains:

- **tolanicorp.eth** - Corporate identity
- **tolanidao.eth** - DAO portal
- **tolaniecosystemdao.eth** - Ecosystem DAO
- **tolanitoken.eth** - TUT token
- **tuttoken.eth** / **tuttoken.dao** - TUT token aliases

## License

MIT
