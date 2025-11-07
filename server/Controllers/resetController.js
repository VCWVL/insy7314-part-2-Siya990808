const mongoose = require("mongoose");

async function resetDatabase(req, res) {
  console.log("🔄 Reset endpoint called - Clearing collections...");
  
  try {
    // 1. Check if reset is allowed
    if (process.env.ALLOW_DB_RESET !== "true") {
      return res.status(403).json({ 
        error: "Database reset not allowed",
        hint: "Set ALLOW_DB_RESET=true to enable this endpoint" 
      });
    }

    // 2. Check MongoDB connection
    console.log("📊 MongoDB Connection State:", mongoose.connection.readyState);
    if (mongoose.connection.readyState !== 1) {
      console.log("❌ MongoDB not connected");
      return res.status(500).json({ error: "Database not connected" });
    }

    // 3. Clear individual collections instead of dropping database
    const db = mongoose.connection.db;
    const collectionsToClear = ['users', 'employees', 'transactions', 'bruteforces', 'connection_test'];
    
    console.log("🗑️ Clearing collections:", collectionsToClear);
    
    let clearedCount = 0;
    const results = [];

    for (const collectionName of collectionsToClear) {
      try {
        const collection = db.collection(collectionName);
        const result = await collection.deleteMany({});
        results.push({
          collection: collectionName,
          deletedCount: result.deletedCount,
          status: 'success'
        });
        clearedCount++;
        console.log(`✅ Cleared ${collectionName}: ${result.deletedCount} documents`);
      } catch (error) {
        console.log(`⚠️ Could not clear ${collectionName}:`, error.message);
        results.push({
          collection: collectionName,
          error: error.message,
          status: 'failed'
        });
      }
    }

    // Don't clear sessions collection (it's managed by connect-mongo)
    
    console.log(`✅ Reset completed: ${clearedCount} collections cleared`);
    
    return res.status(200).json({ 
      message: `Test data cleared successfully - ${clearedCount} collections reset`,
      cleared: clearedCount,
      details: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("❌ ERROR in resetDatabase:", error.message);
    
    return res.status(500).json({ 
      error: "Failed to reset database",
      details: error.message
    });
  }
}

module.exports = { resetDatabase };