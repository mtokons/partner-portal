import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env.production') });

async function runTest() {
  console.log("🚀 Starting Wallet Recharge System Test...");
  
  // Test User Info (Hasnain's ID from logs)
  const testUserId = "oRvWByNMEZRAOITRsD9pfIj012h2";
  const testUserName = "Hasnain (Tester)";
  const rechargeAmount = 10;
  const description = "Automated System Test - Verification of fix (Small Amount)";

  try {
    const { getCoinWallet, createCoinTransaction, updateCoinWallet, createCoinWallet } = await import('../src/lib/sharepoint.ts');
    
    console.log("🔍 1. Checking if wallet exists for user: " + testUserId);
    let wallet = await getCoinWallet(testUserId);
    
    if (!wallet) {
      console.log("➕ Wallet not found. Creating new wallet...");
      wallet = await createCoinWallet({
        userId: testUserId,
        userName: testUserName,
        balance: 0,
        currency: "SCCG",
        totalEarned: 0,
        totalSpent: 0,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    console.log(`✅ Wallet confirmed (ID: ${wallet.id}). Current Balance: ${wallet.balance}`);
    
    console.log("💰 2. Creating transaction with NEW field mappings...");
    // CoinTransaction mapping test
    const tx = await createCoinTransaction({
      walletId: wallet.id,
      userId: testUserId,
      transactionType: "top-up",
      amount: rechargeAmount,
      runningBalance: wallet.balance + rechargeAmount,
      description: description,
      referenceId: `test-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: "System Tester",
    });
    
    if (tx.id === "failed") {
      throw new Error("Transaction creation FAILED (Check SharePoint logs)");
    }
    console.log(`✅ Transaction created successfully! (TX ID: ${tx.id})`);
    
    console.log("📈 3. Updating wallet balance in SharePoint...");
    await updateCoinWallet(testUserId, {
      balance: wallet.balance + rechargeAmount,
    });
    
    const finalWallet = await getCoinWallet(testUserId);
    console.log(`✨ TEST SUCCESSFUL: Final Balance for Hasnain is ${finalWallet.balance} SCCG.`);
    process.exit(0);
    
  } catch (error) {
    console.error("❌ TEST FAILED:", error.message);
    process.exit(1);
  }
}

runTest();
