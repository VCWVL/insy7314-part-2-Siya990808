// server/test-connection.js
const mongoose = require('mongoose');
require('dotenv').config();

console.log(' Testing MongoDB Atlas connection...');
console.log(' Environment:', process.env.NODE_ENV || 'development');

// Hide password in connection string for security
const connectionString = process.env.MONGODB_URI;
const maskedConnection = connectionString ? connectionString.replace(/:[^:@]*@/, ':***@') : 'NOT FOUND';
console.log(' Connection string:', maskedConnection);

if (!connectionString) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Test connection with additional options for Atlas
mongoose.connect(connectionString, {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(async () => {
  console.log('✅ Successfully connected to MongoDB Atlas!');
  console.log('  Database name:', mongoose.connection.name);
  console.log(' Connection state:', mongoose.connection.readyState);
  console.log(' Host:', mongoose.connection.host);
  
  try {
    // Test database operations
    console.log('\n Testing database operations...');
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(' Available collections:', collections.map(c => c.name).join(', ') || 'None yet');
    
    // Test a simple write/read operation
    const testCollection = mongoose.connection.db.collection('connection_test');
    const testDoc = { 
      message: 'Atlas connection test', 
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    await testCollection.insertOne(testDoc);
    console.log('✅ Write operation successful');
    
    const readDoc = await testCollection.findOne({ message: 'Atlas connection test' });
    console.log('✅ Read operation successful');
    
    // Clean up test document
    await testCollection.deleteOne({ _id: readDoc._id });
    console.log('✅ Cleanup successful');
    
    console.log('\n All database operations completed successfully!');
    console.log(' Your application is ready to use MongoDB Atlas');
    
  } catch (dbError) {
    console.error('❌ Database operation failed:', dbError.message);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
})
.catch(err => {
  console.error('❌ MongoDB Atlas connection failed:');
  console.error(' Error message:', err.message);
  
  if (err.message.includes('authentication failed')) {
    console.error(' Check your username and password in the connection string');
  } else if (err.message.includes('ENOTFOUND')) {
    console.error(' Check your network connection and cluster hostname');
  } else if (err.message.includes('bad auth')) {
    console.error(' Check your database user permissions');
  }
  
  process.exit(1);
});