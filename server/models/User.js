const mongoose = require('mongoose');

// ========== PASSWORD HISTORY SCHEMA ==========
const PasswordHistorySchema = new mongoose.Schema({
  hash: {
    type: String,
    required: true
  },
  customSalt: {
    type: String,
    required: true
  },
  algorithm: {
    type: String,
    default: 'bcrypt'
  },
  saltRounds: {
    type: Number,
    default: 14
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// ========== MAIN USER SCHEMA ==========
const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters'],
    match: [/^[a-zA-Z\s\-']+$/, 'Name contains invalid characters']
  },
  
  idNumber: {
    type: String,
    required: [true, 'ID number is required'],
    unique: true,
    match: [/^[0-9]{13}$/, 'Invalid ID number format']
  },
  
  accountNumber: {
    type: String,
    required: [true, 'Account number is required'],
    unique: true,
    match: [/^[0-9]{8,12}$/, 'Invalid account number format']
  },
  
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    match: [/^[a-zA-Z0-9_]+$/, 'Username contains invalid characters']
  },
  
  passwordHash: {
    type: String,
    required: [true, 'Password hash is required']
  },
  
  passwordSalt: {
    type: String,
    required: [true, 'Password salt is required']
  },
  
  passwordHistory: {
    type: [PasswordHistorySchema],
    default: []
  },
  
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  
  loginAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  
  lockoutUntil: {
    type: Date
  },
  
  lastFailedLogin: {
    type: Date
  },
  
  lastSuccessfulLogin: {
    type: Date
  },
  
  activeSession: {
    type: String,
    default: null
  },
  
  lastLoginDate: {
    type: Date
  },
  
  lastLoginIP: {
    type: String
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  role: {
    type: String,
    enum: ['customer', 'employee', 'admin'],
    default: 'customer'
  },
  
  registrationDate: {
    type: Date,
    default: Date.now
  },
  
  registrationIP: {
    type: String
  },
  
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  securityEvents: [{
    eventType: {
      type: String,
      enum: ['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'FAILED_LOGIN', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED', 'ACCOUNT_CREATED'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed
  }]
}, {
  timestamps: true, 
  collection: 'users'
});

// REMOVED: Duplicate index definitions - Mongoose handles these automatically from unique: true

// ========== VIRTUAL PROPERTIES ==========
UserSchema.virtual('isLocked').get(function() {
  return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
});

// ========== INSTANCE METHODS ==========
UserSchema.methods.addSecurityEvent = function(eventType, ipAddress, userAgent, details = {}) {
  this.securityEvents.push({
    eventType,
    ipAddress,
    userAgent,
    details,
    timestamp: new Date()
  });
  
  // Keep only last 50 security events
  if (this.securityEvents.length > 50) {
    this.securityEvents = this.securityEvents.slice(-50);
  }
  
  return this.save();
};

// ========== EXPORT MODEL ==========
const User = mongoose.model('User', UserSchema);

module.exports = User;