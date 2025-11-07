const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

describe('Authentication API', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://bankinguser:bankingpassword@banking-cluster.aacnujn.mongodb.net/banking_app?retryWrites=true&w=majority&appName=banking-cluster');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('health endpoint should work', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
  });
});