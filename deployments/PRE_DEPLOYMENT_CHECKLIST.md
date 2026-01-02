# Tolani Ecosystem DAO - Pre-Deployment Checklist

## 🧹 Cleanup Summary (Completed)

### Files Removed
- [x] `scripts/temp-check-ops.js` - temporary debug file
- [x] `scripts/temp-check.js` - temporary debug file  
- [x] `scripts/temp-fund-ops.js` - temporary debug file
- [x] `scripts/debug-payment.js` - debug script
- [x] `cache/console-history.txt` - hardhat console history
- [x] `.env.example` - outdated, replaced by `.env.template`

### Files Created/Updated
- [x] `.env.template` - comprehensive template with all required variables
- [x] `.gitignore` - added exception for `.env.template`
- [x] `deployments/STRESS_TEST_RESULTS.md` - test documentation

---

## 📋 Deployment Readiness

### ✅ Contracts Ready (Base Sepolia - Testnet)

| Contract | Address | Status |
|----------|---------|--------|
| uTUT Token | `0xf4758a12583F424B65CC860A2ff3D3B501cf591C` | ✅ Verified |
| MockBridgedTUT | `0x05AbCD77f178cF43E561091f263Eaa66353Dce87` | ✅ Verified |
| TUTConverterSimple | `0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2` | ✅ Verified |
| TrainingRewardsSimple | `0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC` | ✅ Verified |
| MerchantRegistry | `0x17904f65220771fDBAbca6eCcDdAf42345C9571d` | ✅ Verified |
| PaymentProcessor | `0x43c1B7C2D9d362369851D3a0996e4222ca9b7ef2` | ⚠️ Bug Found |
| Treasury | `0xC12035B044c5988E9977E50bA0913AEF4eec28F7` | ✅ Verified |

### ⚠️ Known Issues

1. **PaymentProcessor Bug** - Payments fail despite correct role configuration
   - Merchants register successfully
   - PaymentProcessor has REGISTRAR_ROLE
   - Direct token transfers work
   - `pay()` function reverts without error message
   - **Recommendation**: Debug before mainnet deployment

---

## 🔐 Environment Configuration

### Required for Deployment

```bash
# Copy template and fill in your values
cp .env.template .env
```

### Critical Variables to Set

| Variable | Description | Required |
|----------|-------------|----------|
| `PRIVATE_KEY` | Deployer wallet private key (no 0x) | ✅ YES |
| `WALLET_ADDRESS` | Deployer wallet address | ✅ YES |
| `BASE_RPC_URL` | Base mainnet RPC (Alchemy/Infura) | ✅ YES |
| `BASESCAN_API_KEY` | For contract verification | ✅ YES |
| `GNOSIS_SAFE_ADDRESS` | Multi-sig for admin | ✅ YES |

### Security Checklist

- [ ] Generate NEW private keys for mainnet (never reuse testnet keys)
- [ ] Set up hardware wallet for signing
- [ ] Configure Gnosis Safe with multiple signers
- [ ] Remove all testnet private keys from .env
- [ ] Use paid RPC provider (Alchemy/Infura) for reliability

---

## 📊 Stress Test Results

| Scenario | Status | Success Rate |
|----------|--------|--------------|
| Training Volume | ✅ PASS | 100% (55/55 operations) |
| Payment Rails | ⚠️ PARTIAL | 16.7% (5/30 operations) |
| Token Conversion | ✅ PASS | 100% (20/20 operations) |

See [STRESS_TEST_RESULTS.md](./STRESS_TEST_RESULTS.md) for details.

---

## 🚀 Mainnet Deployment Steps

### 1. Pre-Deployment
- [ ] Fix PaymentProcessor bug
- [ ] Re-run stress tests after fix
- [ ] Generate fresh mainnet wallets
- [ ] Fund deployer wallet with BASE ETH
- [ ] Update `.env` with mainnet configuration

### 2. Deployment Order
```
1. uTUT Token
2. TUTConverterSimple (with bridged TUT address)
3. MerchantRegistry
4. PaymentProcessor
5. TrainingRewardsSimple
6. Treasury
```

### 3. Post-Deployment
- [ ] Verify all contracts on Basescan
- [ ] Transfer admin roles to Gnosis Safe
- [ ] Test each contract function
- [ ] Update frontend with mainnet addresses
- [ ] Monitor first 24 hours closely

---

## 📁 Project Structure (Clean)

```
├── .env.template          # Environment template (commit this)
├── .env                   # Your secrets (NEVER commit)
├── contracts/             # Solidity contracts
│   ├── payments/          # Payment rails contracts
│   └── training/          # Training rewards contracts
├── scripts/
│   ├── payments/          # Payment deployment scripts
│   ├── training/          # Training deployment scripts
│   └── stress-tests/      # Stress test scenarios
├── deployments/           # Deployment records
│   ├── DEPLOYMENT_SUMMARY.md
│   ├── STRESS_TEST_RESULTS.md
│   └── *.json             # Contract artifacts
└── test/                  # Unit tests
```

---

*Last updated: January 2025*
