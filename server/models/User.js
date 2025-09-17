// server/models/User.js - EXCEEDS STANDARD User Model with Security
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
  // ===== BASIC USER INFORMATION =====
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
  
  // ===== PASSWORD SECURITY =====
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
    default: [],
    validate: {
      validator: function(arr) {
        return arr.length <= 5; // Maximum 5 historical passwords
      },
      message: 'Password history cannot exceed 5 entries'
    }
  },
  
  lastPasswordChange: {
    type: Date,
    default: Date.now
  },
  
  // ===== ACCOUNT SECURITY =====
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
  
  // ===== SESSION MANAGEMENT =====
  activeSession: {
    type: String,
    default: null
  },
  
  lastLoginDate: {
    type: Date
  },
  
  lastLoginIP: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // IPv4 format
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        // IPv6 format (including ::1 for localhost)
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        return ipv4Regex.test(v) || ipv6Regex.test(v) || v === '::1';
      },
      message: 'Invalid IP address format'
    }
  },
  
  // ===== ACCOUNT STATUS =====
  isActive: {
    type: Boolean,
    default: true
  },
  
  role: {
    type: String,
    enum: ['customer', 'employee', 'admin'],
    default: 'customer'
  },
  
  // ===== REGISTRATION TRACKING =====
  registrationDate: {
    type: Date,
    default: Date.now
  },
  
  registrationIP: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        // IPv4 format
        const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        // IPv6 format (including ::1 for localhost)
        const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
        return ipv4Regex.test(v) || ipv6Regex.test(v) || v === '::1';
      },
      message: 'Invalid registration IP address format'
    }
  },
  
  // ===== PASSWORD RESET =====
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  
  // ===== SECURITY PREFERENCES =====
  securitySettings: {
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    loginNotifications: {
      type: Boolean,
      default: true
    },
    sessionTimeout: {
      type: Number,
      default: 30 // minutes
    }
  },
  
  // ===== AUDIT TRAIL =====
  securityEvents: [{
    eventType: {
      type: String,
      enum: ['LOGIN', 'LOGOUT', 'PASSWORD_CHANGE', 'FAILED_LOGIN', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    details: mongoose.Schema.Types.Mixed
  }],
  
  // ===== TIMESTAMPS =====
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  collection: 'users'
});

// ========== INDEXES FOR PERFORMANCE & SECURITY ==========
// Unique indexes
UserSchema.index({ username: 1 }, { unique: true });
UserSchema.index({ idNumber: 1 }, { unique: true });
UserSchema.index({ accountNumber: 1 }, { unique: true });

// Performance indexes
UserSchema.index({ isActive: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ lastLoginDate: 1 });

// Security indexes
UserSchema.index({ lockoutUntil: 1 }, { sparse: true });
UserSchema.index({ resetPasswordToken: 1 }, { sparse: true });
UserSchema.index({ activeSession: 1 }, { sparse: true });

// Compound indexes for login queries
UserSchema.index({ username: 1, accountNumber: 1, isActive: 1 });

// ========== VIRTUAL PROPERTIES ==========

// Check if account is currently locked
UserSchema.virtual('isLocked').get(function() {
  return !!(this.lockoutUntil && this.lockoutUntil > Date.now());
});

// Get password age in days
UserSchema.virtual('passwordAge').get(function() {
  if (!this.lastPasswordChange) return null;
  return Math.floor((Date.now() - this.lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24));
});

// Get days since last login
UserSchema.virtual('daysSinceLastLogin').get(function() {
  if (!this.lastLoginDate) return null;
  return Math.floor((Date.now() - this.lastLoginDate.getTime()) / (1000 * 60 * 60 * 24));
});

// Security score calculation
UserSchema.virtual('securityScore').get(function() {
  let score = 100;
  
  // Deduct for failed login attempts
  if (this.loginAttempts > 0) {
    score -= this.loginAttempts * 5;
  }
  
  // Deduct if account is locked
  if (this.isLocked) {
    score -= 25;
  }
  
  // Deduct for old passwords
  const passwordAge = this.passwordAge;
  if (passwordAge > 90) score -= 10;
  if (passwordAge > 180) score -= 20;
  
  // Deduct for inactive accounts
  const daysSinceLogin = this.daysSinceLastLogin;
  if (daysSinceLogin > 30) score -= 5;
  if (daysSinceLogin > 90) score -= 15;
  
  return Math.max(0, Math.min(100, score));
});

// ========== MIDDLEWARE HOOKS ==========

// Pre-save middleware to update timestamps and validate data
UserSchema.pre('save', function(next) {
  // Update the updatedAt timestamp
  this.updatedAt = new Date();
  
  // Validate password history length
  if (this.passwordHistory && this.passwordHistory.length > 5) {
    this.passwordHistory = this.passwordHistory.slice(-5);
  }
  
  // Clear lockout if expired
  if (this.lockoutUntil && this.lockoutUntil <= new Date()) {
    this.loginAttempts = undefined;
    this.lockoutUntil = undefined;
    this.lastFailedLogin = undefined;
  }
  
  next();
});

// Post-save middleware for logging
UserSchema.post('save', function(doc) {
  // Log significant changes (in production, send to security monitoring)
  if (this.isModified('passwordHash')) {
    console.log(`Password changed for user: ${doc.username} at ${new Date()}`);
  }
  
  if (this.isModified('lockoutUntil') && doc.lockoutUntil) {
    console.log(`Account locked for user: ${doc.username} until ${doc.lockoutUntil}`);
  }
});

// ========== INSTANCE METHODS ==========

// Method to add security event
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

// Method to check if password needs to be changed
UserSchema.methods.needsPasswordChange = function() {
  const passwordAge = this.passwordAge;
  return passwordAge && passwordAge > 90; // 90 days
};

// Method to get recent security events
UserSchema.methods.getRecentSecurityEvents = function(days = 30) {
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.securityEvents.filter(event => event.timestamp >= cutoffDate);
};

// Method to check if user has suspicious activity
UserSchema.methods.hasSuspiciousActivity = function() {
  const recentEvents = this.getRecentSecurityEvents(7); // Last 7 days
  const failedLogins = recentEvents.filter(event => event.eventType === 'FAILED_LOGIN');
  
  return {
    suspicious: failedLogins.length > 5 || this.loginAttempts > 3,
    reasons: [
      ...(failedLogins.length > 5 ? ['Multiple failed login attempts'] : []),
      ...(this.loginAttempts > 3 ? ['Current failed login attempts'] : []),
      ...(this.isLocked ? ['Account currently locked'] : [])
    ],
    failedLoginCount: failedLogins.length,
    currentFailedAttempts: this.loginAttempts
  };
};

// ========== STATIC METHODS ==========

// Find users with security issues
UserSchema.statics.findUsersWithSecurityIssues = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  
  return this.find({
    $or: [
      { lockoutUntil: { $exists: true, $gt: new Date() } }, // Currently locked
      { loginAttempts: { $gt: 3 } }, // Multiple failed attempts
      { lastPasswordChange: { $lt: ninetyDaysAgo } }, // Old password
      { lastLoginDate: { $lt: thirtyDaysAgo } }, // Inactive account
      { isActive: false } // Disabled account
    ]
  });
};

// Get security statistics
UserSchema.statics.getSecurityStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        lockedUsers: {
          $sum: {
            $cond: [
              { $gt: ['$lockoutUntil', new Date()] },
              1,
              0
            ]
          }
        },
        usersWithFailedAttempts: {
          $sum: {
            $cond: [{ $gt: ['$loginAttempts', 0] }, 1, 0]
          }
        },
        averagePasswordAge: {
          $avg: {
            $divide: [
              { $subtract: [new Date(), '$lastPasswordChange'] },
              86400000 // Convert to days
            ]
          }
        }
      }
    }
  ]);
};

// ========== EXPORT MODEL ==========
const User = mongoose.model('User', UserSchema);

module.exports = User;