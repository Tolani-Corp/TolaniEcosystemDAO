# Step 1: Clone TolaniToken repo (if not already)
git clone https://github.com/Tolani-Corp/TolaniToken.git
cd TolaniToken

# Step 2: Create a feature branch
git checkout -b feature/tut-token-v2-sync

# Step 3: Copy the sync package files
cp -r ../TolaniEcosystemDAO/sync-package/* ./

# Step 4: Update package.json dependencies
npm install @openzeppelin/contracts-upgradeable@^5.0.0

# Step 5: Commit changes
git add .
git commit -m "feat: Add TUTTokenSmartV2 with blacklist feature

- Upgrade Solidity to 0.8.28
- Add BLACKLIST_ROLE for compliance
- Add blacklist/unBlacklist/isBlacklisted functions
- Use custom errors instead of require strings
- Update to OpenZeppelin 5.x (non-draft imports)
- Sync with TolaniEcosystemDAO deployment

Related: TolaniEcosystemDAO Base Sepolia deployment"

# Step 6: Push and create PR
git push origin feature/tut-token-v2-sync

# Then create PR on GitHub:
# https://github.com/Tolani-Corp/TolaniToken/pull/new/feature/tut-token-v2-sync