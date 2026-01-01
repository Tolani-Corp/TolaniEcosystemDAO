/**
 * Test the webhook server locally
 */

const BASE_URL = "http://localhost:3001";

// Test wallet (use a test address)
const TEST_WALLET = "0x1234567890123456789012345678901234567890";

async function testWebhook() {
  console.log("🧪 Testing SkillsBuild Webhook Server\n");
  
  // 1. Health check
  console.log("1️⃣  Health check...");
  try {
    const health = await fetch(`${BASE_URL}/health`);
    const healthData = await health.json();
    console.log("   ✅ Server healthy");
    console.log(`   Relayer: ${healthData.relayer}`);
    console.log(`   Balance: ${healthData.balance} ETH`);
  } catch (e) {
    console.log("   ❌ Server not running. Start with: npm start");
    return;
  }
  
  // 2. List courses
  console.log("\n2️⃣  Available courses...");
  const courses = await fetch(`${BASE_URL}/courses`);
  const coursesData = await courses.json();
  console.log(`   Found ${coursesData.courses.length} courses`);
  coursesData.courses.slice(0, 3).forEach(c => {
    console.log(`   - ${c.courseId}: ${c.reward} uTUT (${c.tag})`);
  });
  
  // 3. Test completion
  console.log("\n3️⃣  Testing completion webhook...");
  const testCompletion = await fetch(`${BASE_URL}/webhook/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress: TEST_WALLET,
      courseId: "ai-fundamentals"
    })
  });
  const completionResult = await testCompletion.json();
  console.log(`   Status: ${completionResult.status}`);
  if (completionResult.txHash) {
    console.log(`   TX: ${completionResult.txHash}`);
    console.log(`   Reward: ${completionResult.reward / 1_000_000} uTUT`);
  }
  
  // 4. Check status
  console.log(`\n4️⃣  Checking wallet status...`);
  const status = await fetch(`${BASE_URL}/status/${TEST_WALLET}`);
  const statusData = await status.json();
  console.log(`   Balance: ${statusData.uTUTBalance} uTUT`);
  console.log(`   Completions: ${statusData.completions?.length || 0}`);
  
  console.log("\n✅ Webhook tests complete!");
}

testWebhook().catch(console.error);
