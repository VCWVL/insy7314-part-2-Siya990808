const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server'); // This imports the Express app without starting the server

describe('Health Check API', () => {
  beforeAll(async () => {
    // Ensure MongoDB is connected but don't start the server
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://bankinguser:bankingpassword@banking-cluster.aacnujn.mongodb.net/banking_app?retryWrites=true&w=majority&appName=banking-cluster');
    }
  });

  afterAll(async () => {
    // Close MongoDB connection
    await mongoose.connection.close();
  });

  it('should return health status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toEqual('OK');
  });

  it('should return database status', async () => {
    const res = await request(app).get('/health');
    expect(res.body.database).toBeDefined();
  });
});