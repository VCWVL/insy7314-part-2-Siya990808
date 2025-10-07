const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

async function createTestUser() {
  try {
    // Use the same connection string from your environment
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://bankinguser:bankingpassword@banking-cluster.aacnujn.mongodb.net/banking_app?retryWrites=true&w=majority&appName=banking-cluster';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if test user already exists
    const existingUser = await User.findOne({ username: 'testuser' });
    if (existingUser) {
      console.log('✅ Test user already exists');
      console.log('Username: testuser');
      console.log('Password: TestPass123!');
      console.log('Account Number: 1234567890');
      process.exit(0);
    }

    // Create test user
    const saltRounds = 12;
    const salt = await bcrypt.genSalt(saltRounds);
    const passwordHash = await bcrypt.hash('TestPass123!', salt);

    const testUser = new User({
      fullName: 'Test User',
      idNumber: '9001015081089',
      accountNumber: '1234567890',
      username: 'testuser',
      passwordHash: passwordHash,
      passwordSalt: salt
    });

    await testUser.save();
    console.log('✅ Test user created successfully!');
    console.log('Username: testuser');
    console.log('Password: TestPass123!');
    console.log('Account Number: 1234567890');

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    console.log('Please check your MongoDB connection string in the .env file');
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

createTestUser();