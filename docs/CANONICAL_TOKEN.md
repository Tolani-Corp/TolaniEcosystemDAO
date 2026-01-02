# Canonical TUT Token Documentation

## 🏷️ Official Token Version

| Property | Value |
|----------|-------|
| **Canonical Contract** | `TUTTokenSmartV2.sol` |
| **Repository** | TolaniEcosystemDAO |
| **Solidity Version** | 0.8.28 |
| **OpenZeppelin Version** | 5.x (upgradeable) |
| **Status** | ✅ Production Ready |

---

## 📍 Token Variants

### 1. TUT Token (18 decimals) - Governance & Bridged

**Purpose:** Main governance token, bridged from L1 Ethereum to L2 Base

| Network | Address | Type |
|---------|---------|------|
| Ethereum Mainnet | TBD | Native TUT |
| Base Mainnet | TBD | Bridged TUT |
| Base Sepolia | `0x05AbCD77f178cF43E561091f263Eaa66353Dce87` | MockBridgedTUT |

**Features:**
- 18 decimals (standard ERC20)
- ERC20Votes for DAO governance
- EIP-2612 Permit for gasless approvals
- ERC2771 Meta-transactions
- Capped at 100,000,000 TUT
- Initial supply: 50,000,000 TUT

### 2. uTUT Token (6 decimals) - Payments & Utility

**Purpose:** Ecosystem utility token for payments, rewards, and micro-transactions

| Network | Address | Type |
|---------|---------|------|
| Base Mainnet | TBD | Native uTUT |
| Base Sepolia | `0xf4758a12583F424B65CC860A2ff3D3B501cf591C` | Native uTUT |

**Features:**
- 6 decimals (USDC-like precision)
- Optimized for payment rails
- Training rewards denominated in uTUT
- Convertible to TUT via TUTConverterSimple

---

## 🔄 Token Relationship

```
TUT (18 decimals)  ←→  uTUT (6 decimals)
      ↓                     ↓
 Governance            Payments
 Staking               Rewards
 DEX Liquidity         Merchant Transactions
```

**Conversion Rate:** 1 TUT = 1 uTUT (value parity, different precision)

- Converting 1 TUT (18 decimals) = 1,000,000,000,000 wei TUT
- Results in 1 uTUT (6 decimals) = 1,000,000 wei uTUT

---

## 📂 Repository Structure

### TolaniEcosystemDAO (THIS REPO - CANONICAL)

```
contracts/
├── TUTTokenSmartV2.sol      # ✅ CANONICAL TUT implementation
├── TolaniToken.sol          # Interface only (references TolaniToken repo)
├── TUTTokenReference.sol    # Reference implementation
└── training/
    └── uTUTToken.sol        # uTUT implementation (6 decimals)
```

### TolaniToken (External Repo)

```
contracts/
├── 04_TUTToken.sol          # Original simple version
├── 11_TUTTokenSmart.sol     # Smart version (older)
└── 12_TUTTokenSmartV2.sol   # ✅ Synced from EcosystemDAO
```

---

## 🔐 Security Features

### TUTTokenSmartV2.sol Capabilities

| Feature | Implementation | Use Case |
|---------|----------------|----------|
| **Access Control** | OpenZeppelin AccessControl | Role-based permissions |
| **MINTER_ROLE** | `keccak256("MINTER_ROLE")` | Mint new tokens |
| **PAUSER_ROLE** | `keccak256("PAUSER_ROLE")` | Emergency pause |
| **UPGRADER_ROLE** | `keccak256("UPGRADER_ROLE")` | UUPS upgrades |
| **BLACKLIST_ROLE** | `keccak256("BLACKLIST_ROLE")` | Compliance blacklist |
| **Pausable** | PausableUpgradeable | Emergency stop |
| **Reentrancy** | Built into OZ | Attack prevention |
| **UUPS Upgrade** | UUPSUpgradeable | Safe upgrades |

### Blacklist Functions

```solidity
// Add to blacklist (requires BLACKLIST_ROLE)
function blacklist(address account) external;

// Remove from blacklist (requires BLACKLIST_ROLE)
function unBlacklist(address account) external;

// Check blacklist status (public view)
function isBlacklisted(address account) external view returns (bool);
```

---

## 🌐 DEX Compatibility

### ✅ DEX-Ready Features

| Feature | Status | Notes |
|---------|--------|-------|
| ERC20 Standard | ✅ | Full compliance |
| 18 Decimals | ✅ | Standard precision |
| EIP-2612 Permit | ✅ | Gasless approvals for DEX aggregators |
| No transfer fees | ✅ | Clean transfers |
| No rebasing | ✅ | Stable balances |
| Pausable | ⚠️ | Can pause, but standard for governance tokens |

### DeFi Contracts (In Repository)

| Contract | Purpose | Status |
|----------|---------|--------|
| `LiquidityManager.sol` | Uniswap V3 liquidity management | Ready to deploy |
| `LiquidityIncentives.sol` | LP farming rewards | Ready to deploy |
| `StakingPool.sol` | Single-sided TUT staking | Ready to deploy |

---

## 📋 Version History

| Version | Date | Changes |
|---------|------|---------|
| TUTToken (04_) | 2024 | Original ERC20 |
| TUTTokenSmart (11_) | 2024 | Added ERC2771, Permit |
| **TUTTokenSmartV2** | 2025 | Added Blacklist, Custom Errors, OZ 5.x |

---

## 🚀 Deployment Guidelines

### For Mainnet Deployment

1. **Use TUTTokenSmartV2.sol** from this repository
2. **Never use** older versions from TolaniToken repo
3. **Deploy via UUPS proxy** for upgradeability
4. **Set trusted forwarder** in constructor for meta-tx
5. **Initialize with:**
   - Owner: Gnosis Safe multi-sig
   - Initial Supply: 50,000,000 TUT (50M × 10^18)
   - Cap: 100,000,000 TUT (100M × 10^18)

### Constructor & Initialize

```solidity
// Constructor (set in deployment)
constructor(address trustedForwarder)

// Initialize (called once after proxy deployment)
function initialize(
    address owner,           // Multi-sig address
    uint256 initialSupply,   // 50_000_000 * 10**18
    uint256 cap,             // 100_000_000 * 10**18
    address forwarder        // Same as constructor trustedForwarder
) external initializer
```

---

## ⚠️ Important Notes

1. **DO NOT** deploy any version other than `TUTTokenSmartV2.sol`
2. **ALWAYS** verify the contract on block explorer after deployment
3. **TRANSFER** admin roles to Gnosis Safe before going live
4. **TEST** on testnet (Base Sepolia) before mainnet
5. **AUDIT** recommended before mainnet deployment

---

## 🔗 Related Documentation

- [PRE_MAINNET_CHECKLIST.md](../deployments/PRE_MAINNET_CHECKLIST.md)
- [DEPLOYMENT_SUMMARY.md](../deployments/DEPLOYMENT_SUMMARY.md)
- [IBM-SKILLSBUILD-INTEGRATION.md](./IBM-SKILLSBUILD-INTEGRATION.md)

---

*Last Updated: January 2, 2026*
*Maintained by: Tolani Corp*
