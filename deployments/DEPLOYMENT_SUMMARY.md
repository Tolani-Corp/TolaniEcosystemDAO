# Tolani Ecosystem DAO - Deployment Summary

## 🌐 Network: Sepolia Testnet

---

## 📋 Core DAO Contracts

| Contract | Address | Etherscan |
|----------|---------|-----------|
| TUT Token | `0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6` | [View](https://sepolia.etherscan.io/address/0x6888CE424242B2d4460104Ffc5042E8B1A52F3E6) |
| Governor | `0x1aB158036C5cdb5ACcfb0ae1B390A7E89273C86f` | [View](https://sepolia.etherscan.io/address/0x1aB158036C5cdb5ACcfb0ae1B390A7E89273C86f) |
| Timelock | `0x9d0ccD1371B3a1f570B353c46840C268Aac57872` | [View](https://sepolia.etherscan.io/address/0x9d0ccD1371B3a1f570B353c46840C268Aac57872) |
| Treasury | `0xBB9d207ee665e9680458F2E451098f23D707Ad25` | [View](https://sepolia.etherscan.io/address/0xBB9d207ee665e9680458F2E451098f23D707Ad25) |
| TokenAllocator | `0x2b3B2a6036099B144b0C5fB95a26b775785B3360` | [View](https://sepolia.etherscan.io/address/0x2b3B2a6036099B144b0C5fB95a26b775785B3360) |

---

## 📚 IBM SkillsBuild Training Contracts (Simple/Non-Upgradeable)

Deployed: 2025-12-31

| Contract | Address | Etherscan | Status |
|----------|---------|-----------|--------|
| uTUT Token | `0xc9D0D68aC9A4678Fb58CB7AE5c4c6b0B7cf60E38` | [View](https://sepolia.etherscan.io/address/0xc9D0D68aC9A4678Fb58CB7AE5c4c6b0B7cf60E38#code) | ✅ Verified |
| TUTConverter | `0x82D131Fbf9aC7629499cC05DA21b7dD317e5748D` | [View](https://sepolia.etherscan.io/address/0x82D131Fbf9aC7629499cC05DA21b7dD317e5748D#code) | ✅ Verified |
| SessionKeyRegistry | `0xF9e6A163852D7B73B8F5A13cAbAe529C5b4c4c27` | [View](https://sepolia.etherscan.io/address/0xF9e6A163852D7B73B8F5A13cAbAe529C5b4c4c27#code) | ✅ Verified |
| GasTreasuryModule | `0x7CcD8F8D02A00161d576Dca26D79e3e292Da3Cfd` | [View](https://sepolia.etherscan.io/address/0x7CcD8F8D02A00161d576Dca26D79e3e292Da3Cfd#code) | ✅ Verified |
| TrainingRewards | `0x6C5892afBdf60123edd408404347E59F72D4Eb4c` | [View](https://sepolia.etherscan.io/address/0x6C5892afBdf60123edd408404347E59F72D4Eb4c#code) | ✅ Verified |
| SessionInvoker | `0x46Fc54f90023098655b237E3543609BF8dCB938e` | [View](https://sepolia.etherscan.io/address/0x46Fc54f90023098655b237E3543609BF8dCB938e#code) | ✅ Verified |

---

## 🎓 Training Campaigns

| Campaign | ID | Reward | Budget | Status |
|----------|-----|--------|--------|--------|
| Tolani Construction Tech Track | `TOLANI_CONSTRUCTION_TECH_V1` | 2,000 uTUT | 500,000 uTUT | ✅ Active |
| Tolani AI & Cloud Track | `TOLANI_AI_CLOUD_V1` | 4,000 uTUT | 1,000,000 uTUT | ✅ Active |
| Tolani ESG Track | `TOLANI_ESG_TRACK_V1` | 1,500 uTUT | TBD | ⏳ Pending |

### Campaign IDs (Keccak256 Hashes)
```
CONSTRUCTION: keccak256("TOLANI_CONSTRUCTION_TECH_V1")
AI_CLOUD:     keccak256("TOLANI_AI_CLOUD_V1")
ESG:          keccak256("TOLANI_ESG_TRACK_V1")
```

---

## 💰 TokenAllocator Pools (Initialized 2025-12-31)

| Pool | Allocation | Limit (TUT) | Status |
|------|------------|-------------|--------|
| TRAINING_REWARDS | 10% | 10,000,000 | ✅ Initialized |
| TASK_BOUNTIES | 15% | 15,000,000 | ✅ Initialized |
| ECOSYSTEM_GRANTS | 20% | 20,000,000 | ✅ Initialized |
| COMMUNITY_INCENTIVES | 10% | 10,000,000 | ✅ Initialized |
| RESERVE | 20% | 20,000,000 | ✅ Initialized |
| TOLANI_FOUNDATION | 25% | 25,000,000 | ✅ Initialized |
| **TOTAL** | **100%** | **100,000,000** | ✅ Complete |

### Timelock Operations
- **GOVERNANCE_ROLE Grant**: [Tx 0x598c941d...](https://sepolia.etherscan.io/tx/0x598c941dd21d928ed29bae4bdbb0d769fba99e9cd18728dfacbbf9af7ba1b7a0)
- **Pool Initialization**: 6 transactions executed successfully

---

## 🔢 Token Economics

### TUT Token (Governance)
- **Decimals**: 18
- **Total Supply**: 100,000,000 TUT
- **Distribution**: Via TokenAllocator pools

### uTUT Token (Training Rewards)
- **Decimals**: 6 (micro-utility)
- **Mint Cap**: 100,000,000 uTUT (100M)
- **Conversion**: 1 TUT = 1,000,000 uTUT (factor: 10^12)

---

## ✅ Validation Tests Completed

### Learn → Earn Flow (2025-12-31)
1. ✅ Session opened successfully
2. ✅ CONSTRUCTION campaign reward: 2,000 uTUT minted
3. ✅ AI_CLOUD campaign reward: 4,000 uTUT minted
4. ✅ Duplicate prevention working (AlreadyCompleted check)
5. ✅ Total earned in testing: 6,000 uTUT

---

## 📁 Contract Files

### Simple (Non-Upgradeable) - For Testnet
- `contracts/training/uTUTSimple.sol`
- `contracts/training/TUTConverterSimple.sol`
- `contracts/training/SessionKeyRegistrySimple.sol`
- `contracts/training/TrainingRewardsSimple.sol`
- `contracts/training/GasTreasuryModuleSimple.sol`
- `contracts/training/SessionInvokerSimple.sol`

### Upgradeable - For Production (Base L2)
- `contracts/training/uTUT.sol`
- `contracts/training/TUTConverter.sol`
- `contracts/training/SessionKeyRegistry.sol`
- `contracts/training/TrainingRewards.sol`
- `contracts/training/GasTreasuryModule.sol`
- `contracts/training/SessionInvoker.sol`

---

## 🔑 Role Configuration

### uTUT Roles
- `MINTER_ROLE`: TrainingRewards contract

### SessionKeyRegistry Roles
- `INVOKER_ROLE`: SessionInvoker contract

### TrainingRewards Roles
- `REWARDER_ROLE`: Owner, SessionInvoker
- `CAMPAIGN_MANAGER_ROLE`: Owner

### GasTreasuryModule Roles
- `TREASURER_ROLE`: Owner
- `RELAYER_ROLE`: Pending relayer setup

---

## � Base L2 Deployment (Completed 2026-01-01)

| Contract | Address | Basescan | Status |
|----------|---------|----------|--------|
| uTUT Token | `0xf4758a12583F424B65CC860A2ff3D3B501cf591C` | [View](https://sepolia.basescan.org/address/0xf4758a12583F424B65CC860A2ff3D3B501cf591C) | ⏳ Pending Verification |
| SessionKeyRegistry | `0xD360F7c69c18dA78461BE5364cBC56C14b584607` | [View](https://sepolia.basescan.org/address/0xD360F7c69c18dA78461BE5364cBC56C14b584607) | ⏳ Pending Verification |
| GasTreasuryModule | `0xC12035B044c5988E9977E50bA0913AEF4eec28F7` | [View](https://sepolia.basescan.org/address/0xC12035B044c5988E9977E50bA0913AEF4eec28F7) | ⏳ Pending Verification |
| TrainingRewards | `0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC` | [View](https://sepolia.basescan.org/address/0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC) | ⏳ Pending Verification |
| SessionInvoker | `0x7Eb46955704c7a75c6eA182A8b0E8C1ec2b06867` | [View](https://sepolia.basescan.org/address/0x7Eb46955704c7a75c6eA182A8b0E8C1ec2b06867) | ⏳ Pending Verification |

### Base L2 Training Campaigns
| Campaign | ID | Reward | Budget |
|----------|-----|--------|--------|
| Tolani Construction Tech Track | `TOLANI_CONSTRUCTION_TECH_V1` | 2,000 uTUT | 500,000 uTUT |
| Tolani AI & Cloud Track | `TOLANI_AI_CLOUD_V1` | 4,000 uTUT | 1,000,000 uTUT |
| Tolani ESG Track | `TOLANI_ESG_TRACK_V1` | 1,500 uTUT | 400,000 uTUT |

### Verification Commands (Requires BASESCAN_API_KEY)
```bash
# Add to .env: BASESCAN_API_KEY=your_basescan_api_key
# Get free key at: https://basescan.org/myapikey

npx hardhat verify --network baseSepolia 0xf4758a12583F424B65CC860A2ff3D3B501cf591C "0x753b53809360bec8742a235D8B60375a57965099" "12500000000000000000"
npx hardhat verify --network baseSepolia 0xD360F7c69c18dA78461BE5364cBC56C14b584607 "0x753b53809360bec8742a235D8B60375a57965099"
npx hardhat verify --network baseSepolia 0xC12035B044c5988E9977E50bA0913AEF4eec28F7 "0x753b53809360bec8742a235D8B60375a57965099"
npx hardhat verify --network baseSepolia 0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC "0x753b53809360bec8742a235D8B60375a57965099" "0xf4758a12583F424B65CC860A2ff3D3B501cf591C" "0xD360F7c69c18dA78461BE5364cBC56C14b584607"
npx hardhat verify --network baseSepolia 0x7Eb46955704c7a75c6eA182A8b0E8C1ec2b06867 "0x753b53809360bec8742a235D8B60375a57965099" "0xD360F7c69c18dA78461BE5364cBC56C14b584607" "0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC" "0xC12035B044c5988E9977E50bA0913AEF4eec28F7"
```

---

## � DeFi Contracts (Base Sepolia - Deployed 2026-01-02)

| Contract | Address | Basescan | Status |
|----------|---------|----------|--------|
| StakingPool | `0x829C9F2EAA45Eb587a6A683087b796A74B2826F7` | [View](https://sepolia.basescan.org/address/0x829C9F2EAA45Eb587a6A683087b796A74B2826F7#code) | ✅ Verified |
| LiquidityIncentives | `0xFe7FEf4E4604478Ce49BbCC1231460E3E5869E53` | [View](https://sepolia.basescan.org/address/0xFe7FEf4E4604478Ce49BbCC1231460E3E5869E53#code) | ✅ Verified |
| LiquidityManager | N/A | - | ⏸️ Mainnet Only |

### StakingPool Tiers
| Tier | Lock Period | Multiplier | Min Stake |
|------|-------------|------------|-----------|
| FLEXIBLE | None | 1.0x | 100 TUT |
| BRONZE | 30 days | 1.25x | 1,000 TUT |
| SILVER | 90 days | 1.5x | 10,000 TUT |
| GOLD | 180 days | 2.0x | 50,000 TUT |
| DIAMOND | 365 days | 3.0x | 100,000 TUT |

### LiquidityIncentives Config
- **Reward Token**: TUT
- **Reward Rate**: 1 TUT/sec
- **Duration**: 30 days
- **Initial Funding**: 10,000 TUT

---

## 💳 Payment System (Base Sepolia)

| Contract | Address | Basescan | Status |
|----------|---------|----------|--------|
| MerchantRegistry | `0x17904f65220771fDBAbca6eCcDdAf42345C9571d` | [View](https://sepolia.basescan.org/address/0x17904f65220771fDBAbca6eCcDdAf42345C9571d) | ✅ Deployed |
| PaymentProcessor v2 | `0x6A0e297A0116dDeaaa5d1F8a8f6372cC8a7843e1` | [View](https://sepolia.basescan.org/address/0x6A0e297A0116dDeaaa5d1F8a8f6372cC8a7843e1) | ✅ Deployed |

### Payment Features
- ✅ Merchant registration & approval
- ✅ Payment processing (uTUT)
- ✅ Fee distribution (1% platform, configurable merchant)
- ✅ **Merchant-initiated refunds** (v2)
- ✅ **Partial refunds** (v2)

---

## 📝 Next Steps

1. ~~**Base L2 Deployment**~~ ✅ Completed!
2. ~~**TokenAllocator**: Execute Timelock operation to initialize TRAINING_REWARDS pool~~ ✅ Done
3. ~~**DeFi Contracts**: Deploy StakingPool & LiquidityIncentives~~ ✅ Done
4. ~~**Contract Verification**: Verify DeFi contracts on Basescan~~ ✅ Done
5. **Relayer Setup**: Configure Gelato/Pimlico for gasless transactions
6. **API Integration**: Connect IBM SkillsBuild webhook to TrainingRewards
7. **Frontend**: Add DeFi staking UI to dashboard
8. **Mainnet Prep**: Multi-sig setup, gas estimates, audit review

---

## 🛠️ Deployer

- **Address**: `0x753b53809360bec8742a235D8B60375a57965099`
- **Networks**: Sepolia (L1), Base Sepolia (L2)
- **Dates**: 
  - Sepolia: December 31, 2025
  - Base Sepolia: January 1, 2026
