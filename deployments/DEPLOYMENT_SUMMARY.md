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

## 📝 Next Steps

1. **Base L2 Deployment**: 
   - Get testnet ETH from https://www.alchemy.com/faucets/base-sepolia
   - Run: `npx hardhat run scripts/training/deploy-base-simple.js --network baseSepolia`
2. ~~**TokenAllocator**: Execute Timelock operation to initialize TRAINING_REWARDS pool~~ ✅ Done
3. **Relayer Setup**: Configure Gelato/Pimlico for gasless transactions
4. **API Integration**: Connect IBM SkillsBuild webhook to TrainingRewards
5. **Frontend**: Add training module to DAO dashboard

---

## 🔗 Base L2 Deployment (Pending)

### Prerequisites
```bash
# 1. Get Base Sepolia testnet ETH (requires 0.001 ETH on mainnet)
# Visit: https://www.alchemy.com/faucets/base-sepolia
# Wallet: 0x753b53809360bec8742a235D8B60375a57965099

# 2. Deploy contracts
npx hardhat run scripts/training/deploy-base-simple.js --network baseSepolia
```

### Deployment Script
- **Simple Contracts**: `scripts/training/deploy-base-simple.js`
- **Upgradeable (UUPS)**: `scripts/training/deploy-upgradeable.js`

---

## 🛠️ Deployer

- **Address**: `0x753b53809360bec8742a235D8B60375a57965099`
- **Network**: Sepolia
- **Date**: December 31, 2025
