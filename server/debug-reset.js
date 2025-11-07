const mongoose = require('mongoose');
require('dotenv').config();

async function debugReset() {
  console.log('🔧 DEBUGGING RESET ENDPOINT\n');
  
  // 1. Check environment variables
  console.log('1. Environment Variables:');
  console.log('   ALLOW_DB_RESET:', process.env.ALLOW_DB_RESET);
  console.log('   MONGO_URI exists:', !!process.env.MONGODB_URI);
  console.log('   NODE_ENV:', process.env.NODE_ENV);
  
  // 2. Test MongoDB connection directly
  console.log('\n2. Testing MongoDB Connection:');
  const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://bankinguser:bankingpassword@banking-cluster.aacnujn.mongodb.net/banking_app?retryWrites=true&w=majority&appName=banking-cluster';
  
  try {
    console.log('   Connecting to:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    
    await mongoose.connect(mongoUri);
    console.log('   ✅ MongoDB Connected');
    console.log('   ReadyState:', mongoose.connection.readyState);
    console.log('   Database Name:', mongoose.connection.db?.databaseName);
    
    // 3. Test drop database
    console.log('\n3. Testing Database Drop:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('   Collections before:', collections.map(c => c.name));
    
    await mongoose.connection.db.dropDatabase();
    console.log('   ✅ Database dropped successfully');
    
    const collectionsAfter = await mongoose.connection.db.listCollections().toArray();
    console.log('   Collections after:', collectionsAfter.map(c => c.name));
    
    await mongoose.connection.close();
    console.log('\n🎉 All tests passed! The issue is in your server setup.');
    
  } catch (error) {
    console.log('   ❌ MongoDB Error:', error.message);
    console.log('   Full error:', error);
  }
}

debugReset();