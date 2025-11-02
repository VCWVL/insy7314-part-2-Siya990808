const mongoose = require('mongoose');

// Employee Schema
const EmployeeSchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  passwordSalt: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['employee', 'admin'],
    default: 'employee'
  },
  department: {
    type: String,
    default: 'International Payments'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginDate: Date,

  // --- Login attempt tracking fields ---
  loginAttempts: { 
    type: Number, 
    default: 0 // Tracks consecutive failed login attempts
  },
  lockUntil: { 
    type: Date // Timestamp until account is locked
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Employee', EmployeeSchema);
