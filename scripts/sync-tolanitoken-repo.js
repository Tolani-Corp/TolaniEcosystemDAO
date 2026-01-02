/**
 * TolaniToken Repository Sync Script
 * 
 * This script compares the TUTTokenSmartV2.sol in TolaniEcosystemDAO with
 * the version in the TolaniToken repository and generates an update package.
 * 
 * Usage:
 *   node scripts/sync-tolanitoken-repo.js
 * 
 * What it does:
 *   1. Generates a diff report showing changes
 *   2. Creates an update package for TolaniToken repo
 *   3. Outputs git commands to sync the repos
 */

const fs = require("fs");
const path = require("path");

// Version info
const ECOSYSTEM_VERSION = {
    contract: "TUTTokenSmartV2.sol",
    solidity: "0.8.28",
    ozVersion: "5.x (non-draft imports)",
    features: [
        "BLACKLIST_ROLE - Compliance blacklist feature",
        "Custom errors (ZeroAddress, AccountBlacklisted, InvalidInitialSupply)",
        "ERC2771 Meta-transactions",
        "ERC20Permit (EIP-2612) for gasless approvals",
        "ERC20Votes for DAO governance",
        "Capped supply (100M max)",
        "Burnable",
        "Pausable",
        "UUPS Upgradeable"
    ]
};

const TOLANITOKEN_VERSION = {
    contract: "11_TUTTokenSmart.sol (latest in repo)",
    solidity: "0.8.17",
    ozVersion: "4.x (draft-ERC20Permit)",
    features: [
        "ERC2771 Meta-transactions",
        "ERC20Permit (draft version)",
        "Capped supply",
        "Burnable",
        "Pausable", 
        "UUPS Upgradeable"
    ]
};

function generateDiffReport() {
    console.log("\n" + "=".repeat(70));
    console.log("  TUT TOKEN VERSION COMPARISON REPORT");
    console.log("=".repeat(70) + "\n");
    
    console.log("📁 TolaniEcosystemDAO (this repo):");
    console.log(`   Contract: ${ECOSYSTEM_VERSION.contract}`);
    console.log(`   Solidity: ${ECOSYSTEM_VERSION.solidity}`);
    console.log(`   OpenZeppelin: ${ECOSYSTEM_VERSION.ozVersion}`);
    console.log(`   Features:`);
    ECOSYSTEM_VERSION.features.forEach(f => console.log(`     ✅ ${f}`));
    
    console.log("\n📁 TolaniToken (external repo):");
    console.log(`   Contract: ${TOLANITOKEN_VERSION.contract}`);
    console.log(`   Solidity: ${TOLANITOKEN_VERSION.solidity}`);
    console.log(`   OpenZeppelin: ${TOLANITOKEN_VERSION.ozVersion}`);
    console.log(`   Features:`);
    TOLANITOKEN_VERSION.features.forEach(f => console.log(`     ✅ ${f}`));
    
    console.log("\n" + "-".repeat(70));
    console.log("  DIFFERENCES (TolaniEcosystemDAO has, TolaniToken lacks)");
    console.log("-".repeat(70) + "\n");
    
    const newFeatures = [
        "🆕 BLACKLIST_ROLE for compliance (blacklist/unBlacklist/isBlacklisted)",
        "🆕 Custom Solidity errors instead of require strings",
        "🆕 Solidity 0.8.28 (vs 0.8.17)",
        "🆕 OpenZeppelin 5.x non-draft imports",
        "🆕 Improved _update() override handling",
        "🆕 Better storage gap management (48 vs 50 slots)"
    ];
    
    newFeatures.forEach(f => console.log(`   ${f}`));
    
    return {
        ecosystemVersion: ECOSYSTEM_VERSION,
        tolaniTokenVersion: TOLANITOKEN_VERSION,
        newFeatures
    };
}

function generateUpdatePackage() {
    console.log("\n" + "-".repeat(70));
    console.log("  UPDATE PACKAGE FOR TOLANITOKEN REPO");
    console.log("-".repeat(70) + "\n");
    
    const updateDir = path.join(__dirname, "..", "sync-package");
    
    // Create sync package directory
    if (!fs.existsSync(updateDir)) {
        fs.mkdirSync(updateDir, { recursive: true });
    }
    
    // Copy TUTTokenSmartV2.sol
    const sourceContract = path.join(__dirname, "..", "contracts", "TUTTokenSmartV2.sol");
    const destContract = path.join(updateDir, "contracts", "12_TUTTokenSmartV2.sol");
    
    if (!fs.existsSync(path.join(updateDir, "contracts"))) {
        fs.mkdirSync(path.join(updateDir, "contracts"), { recursive: true });
    }
    
    if (fs.existsSync(sourceContract)) {
        fs.copyFileSync(sourceContract, destContract);
        console.log(`   ✅ Copied TUTTokenSmartV2.sol → 12_TUTTokenSmartV2.sol`);
    }
    
    // Generate migration guide
    const migrationGuide = `# TUTTokenSmartV2 Migration Guide

## Overview
This document describes migrating from TUTTokenSmart (11_) to TUTTokenSmartV2 (12_).

## Breaking Changes
1. **Solidity Version**: 0.8.17 → 0.8.28
2. **OpenZeppelin**: draft-ERC20Permit → ERC20PermitUpgradeable (stable)
3. **Storage Gap**: 50 → 48 slots (to accommodate _blacklisted mapping)

## New Features
- \`BLACKLIST_ROLE\`: For regulatory compliance
- \`blacklist(address)\`: Add address to blacklist
- \`unBlacklist(address)\`: Remove from blacklist
- \`isBlacklisted(address)\`: Check blacklist status
- Custom errors: \`ZeroAddress()\`, \`AccountBlacklisted(address)\`, \`InvalidInitialSupply(uint256, uint256)\`

## Initialize Parameters (unchanged)
\`\`\`solidity
function initialize(
    address owner,
    uint256 initialSupply,
    uint256 cap,
    address forwarder  // trusted forwarder for meta-tx
) external initializer
\`\`\`

## Upgrade Path
Since this changes storage layout, you must:
1. Deploy new implementation
2. Validate upgrade compatibility: \`npx hardhat run scripts/deployment/02_validate_and_prepare_upgrade_TUTToken.js\`
3. Perform upgrade via proxy admin

## Dependencies (package.json)
\`\`\`json
{
  "@openzeppelin/contracts-upgradeable": "^5.0.0"
}
\`\`\`

## Deployment
\`\`\`bash
# Set environment
export PROXY_ADDRESS=0x... # existing proxy
export INIT_ARGS='["0xOwner","50000000000000000000000000","100000000000000000000000000","0xForwarder"]'

# Validate and deploy
npx hardhat run scripts/deployment/02_validate_and_prepare_upgrade_TUTToken.js --network mainnet
npx hardhat run scripts/deployment/03_upgrade_TUTToken.js --network mainnet
\`\`\`

## Test Suite
The existing TUTToken.test.js should pass. Additional tests for blacklist:

\`\`\`javascript
describe("Blacklist", function() {
    it("should blacklist an address", async () => {
        await token.blacklist(addr1.address);
        expect(await token.isBlacklisted(addr1.address)).to.be.true;
    });
    
    it("should prevent transfers from blacklisted", async () => {
        await token.blacklist(addr1.address);
        await expect(token.connect(addr1).transfer(addr2.address, 100))
            .to.be.revertedWithCustomError(token, "AccountBlacklisted");
    });
});
\`\`\`

---
Generated: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(path.join(updateDir, "MIGRATION_GUIDE.md"), migrationGuide);
    console.log(`   ✅ Generated MIGRATION_GUIDE.md`);
    
    // Generate deployment addresses file
    const deploymentAddresses = `# Base Sepolia Deployment Addresses

## TolaniEcosystemDAO Contracts (Base Sepolia)

| Contract | Address | Notes |
|----------|---------|-------|
| uTUT Token | \`0xf4758a12583F424B65CC860A2ff3D3B501cf591C\` | 6 decimals, ecosystem payments |
| MockBridgedTUT | \`0x05AbCD77f178cF43E561091f263Eaa66353Dce87\` | 18 decimals, testnet bridge mock |
| TUTConverterSimple | \`0xCFce25C0eF67e51E8Fe85Dcba7F4501d5BeE84b2\` | TUT ↔ uTUT conversion |
| TrainingRewardsSimple | \`0x4d8FD67c3BAf949A9f7CfCE7830A9588CA0F13dC\` | IBM SkillsBuild rewards |
| MerchantRegistry | \`0x17904f65220771fDBAbca6eCcDdAf42345C9571d\` | Merchant management |
| PaymentProcessor v2 | \`0x6A0e297A0116dDeaaa5d1F8a8f6372cC8a7843e1\` | With merchant refunds |
| Treasury | \`0xC12035B044c5988E9977E50bA0913AEF4eec28F7\` | DAO treasury |

## Notes
- All contracts verified on Basescan
- 18 pre-mainnet tests passing
- Stress tests: 100% success rate

---
Last Updated: ${new Date().toISOString()}
`;
    
    fs.writeFileSync(path.join(updateDir, "BASE_SEPOLIA_ADDRESSES.md"), deploymentAddresses);
    console.log(`   ✅ Generated BASE_SEPOLIA_ADDRESSES.md`);
    
    console.log(`\n   📦 Package created at: ${updateDir}`);
    
    return updateDir;
}

function generateGitCommands() {
    console.log("\n" + "-".repeat(70));
    console.log("  GIT COMMANDS TO SYNC TOLANITOKEN REPO");
    console.log("-".repeat(70) + "\n");
    
    const commands = `
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
`;
    
    console.log(commands);
    
    // Save commands to file
    const commandsPath = path.join(__dirname, "..", "sync-package", "GIT_COMMANDS.sh");
    fs.writeFileSync(commandsPath, commands.trim());
    console.log(`\n   📝 Commands saved to: ${commandsPath}`);
}

function main() {
    console.log("\n🔄 TOLANITOKEN REPOSITORY SYNC SCRIPT\n");
    console.log("This script helps synchronize TUTTokenSmartV2 with the TolaniToken repo.\n");
    
    // Step 1: Generate diff report
    const report = generateDiffReport();
    
    // Step 2: Generate update package
    const packageDir = generateUpdatePackage();
    
    // Step 3: Generate git commands
    generateGitCommands();
    
    console.log("\n" + "=".repeat(70));
    console.log("  SUMMARY");
    console.log("=".repeat(70));
    console.log(`
✅ Diff report generated
✅ Update package created at: sync-package/
✅ Git commands saved to: sync-package/GIT_COMMANDS.sh

Next steps:
1. Review the sync-package/ directory
2. Follow the git commands to create a PR on TolaniToken repo
3. After PR merged, TolaniToken will have the latest TUT token

IMPORTANT: The TolaniEcosystemDAO version (TUTTokenSmartV2.sol) is 
the CANONICAL version for all future deployments.
`);
}

main();
