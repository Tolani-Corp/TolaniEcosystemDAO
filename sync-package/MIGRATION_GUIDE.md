# TUTTokenSmartV2 Migration Guide

## Overview
This document describes migrating from TUTTokenSmart (11_) to TUTTokenSmartV2 (12_).

## Breaking Changes
1. **Solidity Version**: 0.8.17 → 0.8.28
2. **OpenZeppelin**: draft-ERC20Permit → ERC20PermitUpgradeable (stable)
3. **Storage Gap**: 50 → 48 slots (to accommodate _blacklisted mapping)

## New Features
- `BLACKLIST_ROLE`: For regulatory compliance
- `blacklist(address)`: Add address to blacklist
- `unBlacklist(address)`: Remove from blacklist
- `isBlacklisted(address)`: Check blacklist status
- Custom errors: `ZeroAddress()`, `AccountBlacklisted(address)`, `InvalidInitialSupply(uint256, uint256)`

## Initialize Parameters (unchanged)
```solidity
function initialize(
    address owner,
    uint256 initialSupply,
    uint256 cap,
    address forwarder  // trusted forwarder for meta-tx
) external initializer
```

## Upgrade Path
Since this changes storage layout, you must:
1. Deploy new implementation
2. Validate upgrade compatibility: `npx hardhat run scripts/deployment/02_validate_and_prepare_upgrade_TUTToken.js`
3. Perform upgrade via proxy admin

## Dependencies (package.json)
```json
{
  "@openzeppelin/contracts-upgradeable": "^5.0.0"
}
```

## Deployment
```bash
# Set environment
export PROXY_ADDRESS=0x... # existing proxy
export INIT_ARGS='["0xOwner","50000000000000000000000000","100000000000000000000000000","0xForwarder"]'

# Validate and deploy
npx hardhat run scripts/deployment/02_validate_and_prepare_upgrade_TUTToken.js --network mainnet
npx hardhat run scripts/deployment/03_upgrade_TUTToken.js --network mainnet
```

## Test Suite
The existing TUTToken.test.js should pass. Additional tests for blacklist:

```javascript
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
```

---
Generated: 2026-01-02T02:46:18.763Z
