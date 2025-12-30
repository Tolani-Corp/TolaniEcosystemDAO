/**
 * IPFS Deployment Script for TolaniDAO Frontend
 * 
 * This script helps deploy the frontend to IPFS for true decentralization.
 * You can then point your ENS domain (tolanidao.eth) to the IPFS hash.
 * 
 * Options:
 * 1. Fleek (recommended) - https://fleek.co
 * 2. Pinata - https://pinata.cloud
 * 3. web3.storage - https://web3.storage
 * 4. Local IPFS node
 */

const fs = require('fs');
const path = require('path');

// Configuration
const FRONTEND_BUILD_DIR = path.join(__dirname, '../frontend/out');

async function checkBuildExists() {
  if (!fs.existsSync(FRONTEND_BUILD_DIR)) {
    console.log("❌ Frontend build not found!");
    console.log("   Run: cd frontend && pnpm build");
    return false;
  }
  
  const files = fs.readdirSync(FRONTEND_BUILD_DIR);
  console.log("✅ Build directory found with", files.length, "files/folders");
  return true;
}

async function calculateBuildSize() {
  function getSize(dirPath) {
    let size = 0;
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        size += getSize(filePath);
      } else {
        size += stat.size;
      }
    }
    return size;
  }
  
  const totalSize = getSize(FRONTEND_BUILD_DIR);
  return (totalSize / 1024 / 1024).toFixed(2);
}

async function main() {
  console.log("🌐 IPFS Deployment Helper for TolaniDAO");
  console.log("━".repeat(60));

  // Check build exists
  const buildExists = await checkBuildExists();
  if (!buildExists) {
    process.exit(1);
  }

  const buildSize = await calculateBuildSize();
  console.log("📦 Build size:", buildSize, "MB");
  console.log("");

  // ═══════════════════════════════════════════════════════════════
  // DEPLOYMENT OPTIONS
  // ═══════════════════════════════════════════════════════════════
  console.log("📋 DEPLOYMENT OPTIONS");
  console.log("═".repeat(60));
  
  console.log(`
┌─────────────────────────────────────────────────────────────┐
│ OPTION 1: Fleek (Recommended)                               │
├─────────────────────────────────────────────────────────────┤
│ • Automatic IPFS pinning + CDN                              │
│ • GitHub integration for auto-deploy                        │
│ • Free tier available                                       │
│                                                             │
│ Steps:                                                      │
│ 1. Go to https://fleek.co                                   │
│ 2. Connect GitHub repo: Tolani-Corp/TolaniEcosystemDAO      │
│ 3. Set build command: cd frontend && pnpm install && pnpm build │
│ 4. Set publish directory: frontend/out                      │
│ 5. Deploy and get IPFS CID                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ OPTION 2: Pinata                                            │
├─────────────────────────────────────────────────────────────┤
│ • Simple file upload to IPFS                                │
│ • Free tier: 1GB storage                                    │
│                                                             │
│ Steps:                                                      │
│ 1. Go to https://pinata.cloud                               │
│ 2. Create account and get API keys                          │
│ 3. Upload frontend/out folder                               │
│ 4. Get IPFS CID (starts with Qm... or bafy...)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ OPTION 3: web3.storage                                      │
├─────────────────────────────────────────────────────────────┤
│ • Free decentralized storage                                │
│ • Backed by Filecoin                                        │
│                                                             │
│ Steps:                                                      │
│ 1. Go to https://web3.storage                               │
│ 2. Create account                                           │
│ 3. Upload frontend/out folder                               │
│ 4. Get IPFS CID                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ OPTION 4: IPFS CLI (Local Node)                             │
├─────────────────────────────────────────────────────────────┤
│ Install: https://docs.ipfs.tech/install/                    │
│                                                             │
│ Commands:                                                   │
│ $ ipfs daemon                    # Start IPFS node          │
│ $ ipfs add -r frontend/out       # Upload and get CID       │
│ $ ipfs pin add <CID>             # Pin content              │
└─────────────────────────────────────────────────────────────┘
`);

  // ═══════════════════════════════════════════════════════════════
  // ENS CONFIGURATION
  // ═══════════════════════════════════════════════════════════════
  console.log("🔗 ENS DOMAIN SETUP");
  console.log("═".repeat(60));
  console.log(`
After getting your IPFS CID, configure your ENS domain:

1. Go to https://app.ens.domains
2. Connect wallet that owns tolanidao.eth
3. Search for and select your domain
4. Click "Records" tab
5. Set Content Hash:
   
   For IPFS CID v0 (starts with Qm):
   └─ ipfs://QmYourCIDHere

   For IPFS CID v1 (starts with bafy):
   └─ ipfs://bafyYourCIDHere

6. Confirm transaction

Access Methods After Setup:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
• https://tolanidao.eth.limo     (Public gateway)
• https://tolanidao.eth.link     (Cloudflare gateway)
• tolanidao.eth                  (In ENS-compatible browsers)
• ipfs://<your-cid>              (Direct IPFS)
`);

  // ═══════════════════════════════════════════════════════════════
  // QUICK DEPLOY WITH PINATA CLI
  // ═══════════════════════════════════════════════════════════════
  console.log("⚡ QUICK DEPLOY (Pinata CLI)");
  console.log("═".repeat(60));
  console.log(`
If you have Pinata API keys, you can deploy directly:

1. Install Pinata CLI:
   $ npm install -g @pinata/sdk

2. Create .env entries:
   PINATA_API_KEY=your_api_key
   PINATA_SECRET_KEY=your_secret_key

3. Run deploy:
   $ npx pinata-cli upload frontend/out

Or use the Pinata web interface for drag-and-drop upload.
`);

  // ═══════════════════════════════════════════════════════════════
  // NETLIFY + IPFS HYBRID
  // ═══════════════════════════════════════════════════════════════
  console.log("🔄 HYBRID APPROACH (Current Setup)");
  console.log("═".repeat(60));
  console.log(`
Your current setup:
• Primary: https://tolanidao.netlify.app (Netlify CDN)
• ENS URL record: https://tolanidao.netlify.app

This works! Users visiting tolanidao.eth.limo will redirect
to your Netlify site. For full decentralization, deploy to
IPFS and set the contenthash instead of URL record.

Current ENS Setup Steps:
1. Go to https://app.ens.domains
2. Connect wallet
3. Select tolanidao.eth → Records
4. Add URL record: https://tolanidao.netlify.app
5. Save (requires transaction)
`);

  console.log("\n✅ Build is ready for deployment!");
  console.log("   Location:", FRONTEND_BUILD_DIR);
}

main().catch(console.error);
