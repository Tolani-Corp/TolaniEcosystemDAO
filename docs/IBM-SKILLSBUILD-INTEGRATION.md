# IBM SkillsBuild Integration

## Tolani Labs + Tolani Ecosystem DAO

This integration enables a web3-powered workforce engine combining IBM SkillsBuild's global learning platform with Tolani's tokenized coordination system.

## 🎯 Vision

**Learn → Earn → Work**

- **Learn**: IBM SkillsBuild provides free, high-quality training
- **Earn**: Learners receive uTUT tokens for verified completions  
- **Work**: Trained learners join Tolani Corp's talent pipeline

## 📋 Smart Contracts

| Contract | Purpose | Chain |
|----------|---------|-------|
| [uTUT](./contracts/training/uTUT.sol) | 6-decimal micro-utility token | Base |
| [TUTConverter](./contracts/training/TUTConverter.sol) | TUT ↔ uTUT conversion | Base |
| [SessionKeyRegistry](./contracts/training/SessionKeyRegistry.sol) | Session permission management | Base/World Chain |
| [TrainingRewards](./contracts/training/TrainingRewards.sol) | Reward distribution for completions | Base |
| [GasTreasuryModule](./contracts/training/GasTreasuryModule.sol) | Relayer gas reimbursements | Base |
| [SessionInvoker](./contracts/training/SessionInvoker.sol) | Action orchestration | Base |

## 🔄 Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    LEARN → EARN FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ENROLL & LEARN                                              │
│     └── Learner → IBM SkillsBuild → Complete Modules            │
│                                                                  │
│  2. COMPLETION & VERIFICATION                                   │
│     └── SkillsBuild → Badge/Certificate → Tolani Labs Backend   │
│                                                                  │
│  3. SESSION CREATION                                            │
│     └── Backend → SessionKeyRegistry.openSession()              │
│                                                                  │
│  4. ON-CHAIN REWARD                                             │
│     └── Relayer → SessionInvoker.invokeTrainingReward()         │
│         └── TrainingRewards.grantReward()                       │
│             └── uTUT.mintReward() → Learner Wallet              │
│                                                                  │
│  5. LEARNER UTILITY                                             │
│     └── uTUT can be used for:                                   │
│         • Access to Tolani Labs programs                        │
│         • Discounts in ecosystem services                       │
│         • Proof-of-participation                                │
│         • Convert back to TUT                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 💰 Token Economics

### uTUT (Micro Utility Token)

| Property | Value |
|----------|-------|
| Symbol | uTUT |
| Decimals | 6 |
| Conversion | 1 TUT = 1,000,000 uTUT |
| Chain | Base L2 |

### Conversion Rate
```
1 TUT (18 decimals) = 1,000,000 uTUT (6 decimals)
1 uTUT = 0.000001 TUT
Conversion factor: 10^12
```

### Training Campaign Rewards

| Track | Reward/Module | Reward/Completion | Budget |
|-------|---------------|-------------------|--------|
| Construction Tech | 500 uTUT | 2,000 uTUT | 500K uTUT |
| AI & Cloud | 750 uTUT | 4,000 uTUT | 1M uTUT |
| ESG Track | 400 uTUT | 1,500 uTUT | 300K uTUT |
| Cybersecurity | 600 uTUT | 2,500 uTUT | 500K uTUT |
| Professional Skills | 300 uTUT | 1,200 uTUT | 200K uTUT |

## 🚀 Deployment

### Prerequisites

1. Node.js 18+
2. Hardhat
3. Network RPC (Alchemy recommended)
4. Deployer wallet with ETH

### Deploy to Testnet

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your keys

# Deploy to Base Sepolia
npx hardhat run scripts/training/deploy-integration.js --network baseSepolia

# Or deploy to Sepolia (for testing)
npx hardhat run scripts/training/deploy-integration.js --network sepolia
```

### Post-Deployment Setup

1. **Verify contracts** on block explorer
2. **Configure relayer** with RELAYER_ROLE
3. **Fund GasTreasuryModule** with ETH
4. **Set up backend** verification pipeline
5. **Test** full Learn → Earn flow

## 📅 Implementation Phases

### Phase 1: Foundation (0-3 months)
- Deploy contracts to testnets
- Integrate Alchemy RPC and webhooks
- Create initial Tolani Track mappings
- Build badge verification pipeline

### Phase 2: Pilot (3-6 months)
- Deploy to Base mainnet
- Run pilot with 20-50 learners
- Issue uTUT rewards for completions
- Collect ESG and workforce metrics

### Phase 3: Scale (6-18 months)
- Expand to Africa, LATAM regions
- Onboard third-party partners
- Add new SkillsBuild modules
- Formalize DAO governance

## 🔐 Security

### Access Control Roles

| Role | Contracts | Purpose |
|------|-----------|---------|
| `MINTER_ROLE` | uTUT | Mint uTUT tokens |
| `SESSION_MANAGER_ROLE` | SessionKeyRegistry | Open/revoke sessions |
| `INVOKER_ROLE` | SessionKeyRegistry | Consume sessions |
| `REWARDER_ROLE` | TrainingRewards | Grant rewards |
| `CAMPAIGN_MANAGER_ROLE` | TrainingRewards | Manage campaigns |
| `RELAYER_ROLE` | GasTreasuryModule | Request reimbursements |
| `TREASURER_ROLE` | GasTreasuryModule | Manage treasury |

### Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Bridge/L2 failures | Keep canonical TUT on Ethereum, limit bridged amounts |
| Badge spoofing | Strict verification, IBM API cross-checks, audits |
| Token misuse | Clear utility-only messaging, controlled distribution |
| Regulatory | Legal counsel, utility emphasis, jurisdiction compliance |

## 📊 KPIs & Metrics

### Training
- Enrollments per track
- Completion rate
- Time to completion

### On-Chain
- Total uTUT distributed
- Average reward per learner
- Active wallets holding uTUT

### Workforce
- Learners hired by Tolani Corp
- Partner placements
- Retention rate

### ESG
- Regions served
- Demographics
- ESG tasks completed

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      ETHEREUM MAINNET                           │
│  ┌─────────────────┐                                            │
│  │  TUT Token      │ ← Canonical 18-decimal governance token    │
│  │  (Upgradeable)  │                                            │
│  └────────┬────────┘                                            │
│           │ Bridge                                              │
└───────────┼─────────────────────────────────────────────────────┘
            │
┌───────────┼─────────────────────────────────────────────────────┐
│           ▼           BASE L2                                   │
│  ┌─────────────────┐        ┌─────────────────┐                │
│  │  TUTConverter   │◄──────►│  uTUT Token     │                │
│  │  TUT ↔ uTUT     │        │  (6 decimals)   │                │
│  └─────────────────┘        └────────┬────────┘                │
│                                      │ mint                     │
│  ┌─────────────────┐        ┌────────▼────────┐                │
│  │ SessionRegistry │◄──────►│ TrainingRewards │                │
│  │ (Sessions)      │        │ (Campaigns)     │                │
│  └────────┬────────┘        └────────┬────────┘                │
│           │                          │                          │
│  ┌────────▼────────┐        ┌────────▼────────┐                │
│  │ SessionInvoker  │◄───────│ GasTreasury     │                │
│  │ (Orchestration) │        │ (Reimbursements)│                │
│  └────────┬────────┘        └─────────────────┘                │
│           │                                                     │
└───────────┼─────────────────────────────────────────────────────┘
            │
┌───────────┼─────────────────────────────────────────────────────┐
│           ▼           OFF-CHAIN                                 │
│  ┌─────────────────┐        ┌─────────────────┐                │
│  │ Tolani Labs     │◄──────►│ Relayer/Bundler │                │
│  │ Backend         │        │ Service         │                │
│  └────────┬────────┘        └─────────────────┘                │
│           │                                                     │
│  ┌────────▼────────┐        ┌─────────────────┐                │
│  │ IBM SkillsBuild │        │ Analytics &     │                │
│  │ API Integration │        │ Dashboards      │                │
│  └─────────────────┘        └─────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

## 📜 License

MIT License - See [LICENSE](../LICENSE)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Submit pull request

## 📞 Contact

- **Tolani Labs**: labs@tolani.io
- **Tolani Corp**: corp@tolani.io
- **GitHub**: [Tolani-Corp/TolaniEcosystemDAO](https://github.com/Tolani-Corp/TolaniEcosystemDAO)
