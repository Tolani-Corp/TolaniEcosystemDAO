# TUT Tokenomics Deployment Guide
# Tolani Ecosystem DAO
# 
# Target Timeline:
# - Q4 2025: Testnet deployment (current)
# - Q1-Q3 2026: Capital raising, community building
# - Q4 2026: Mainnet staking launch with $20K-$30K liquidity
#
# ============================================================

# ============================================================
# ENVIRONMENT SETUP
# ============================================================

# Required Environment Variables (add to .env):
#
# TUT_TOKEN_ADDRESS=0x...           # Deployed TUT token
# STAKING_POOL_ADDRESS=0x...        # Deployed staking pool
# TOKEN_ALLOCATOR_ADDRESS=0x...     # Deployed allocator
# TREASURY_ADDRESS=0x...            # DAO treasury
# TIMELOCK_ADDRESS=0x...            # Governance timelock
# GNOSIS_SAFE_ADDRESS=0x...         # Multisig safe
# PRIVATE_KEY=...                   # Deployer private key

# ============================================================
# SCRIPT REFERENCE
# ============================================================

# View tokenomics configuration:
# npx hardhat run scripts/tokenomics/config.js

# Check current status:
# npx hardhat run scripts/tokenomics/status.js --network sepolia

# Mint initial supply (50M TUT):
# npx hardhat run scripts/tokenomics/mint-initial-supply.js --network sepolia

# Initialize allocation pools:
# npx hardhat run scripts/tokenomics/initialize-allocator.js --network sepolia

# Setup staking pool rewards:
# npx hardhat run scripts/tokenomics/initialize-staking.js --network sepolia

# Deploy liquidity (when capital raised):
# npx hardhat run scripts/tokenomics/setup-liquidity.js --network sepolia

# ============================================================
# DEPLOYMENT CHECKLIST
# ============================================================

# PHASE 1: TESTNET (Q4 2025) ✅
# [ ] Deploy TUT token contract
# [ ] Deploy Governor + Timelock
# [ ] Deploy Treasury
# [ ] Deploy StakingPool
# [ ] Deploy TokenAllocator
# [ ] Verify contracts on Etherscan
# [ ] Test governance flow

# PHASE 2: PREPARATION (Q1-Q3 2026)
# [ ] Complete security audit
# [ ] Raise $20K-$30K capital for liquidity
# [ ] Finalize mainnet wallet addresses
# [ ] Setup Gnosis Safe with proper signers
# [ ] Community distribution planning
# [ ] Legal review completion

# PHASE 3: MAINNET LAUNCH (Q4 2026)
# [ ] Deploy contracts to mainnet
# [ ] Execute mint-initial-supply.js
# [ ] Execute initialize-allocator.js
# [ ] Transfer tokens to vesting contracts
# [ ] Execute setup-liquidity.js ($25K TUT/ETH pool)
# [ ] Execute initialize-staking.js
# [ ] Announce staking launch

# ============================================================
# KEY PARAMETERS (from config.js)
# ============================================================

# Token:
#   Initial Supply: 50,000,000 TUT
#   Max Cap:        100,000,000 TUT
#   Initial Price:  ~$0.0125 per TUT

# Liquidity:
#   Target USD:     $25,000 (range: $20K-$30K)
#   TUT Allocation: 2,000,000 TUT
#   ETH Required:   ~7.14 ETH (@$3500/ETH)
#   Pool:           Uniswap V3, 0.3% fee tier

# Staking:
#   Initial Rewards: 2,000,000 TUT (Year 1)
#   Distribution:    ~5,479 TUT/day
#   Tiers:           FLEXIBLE, BRONZE, SILVER, GOLD, DIAMOND

# ============================================================
# QUICK COMMANDS
# ============================================================

# Show tokenomics summary:
echo "Run: node scripts/tokenomics/config.js"

# Check status on Sepolia:
echo "Run: npx hardhat run scripts/tokenomics/status.js --network sepolia"
