// server/routes/auth.js - EXCEEDS STANDARD Authentication
const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const ExpressBrute = require('express-brute');
const ExpressBruteMongooseStore = require('express-brute-mongoose');
const mongoose = require('mongoose');

const User = require('../models/User');
const { 
  validateRegistration, 
  validateLogin, 
  handleValidationErrors,
  sensitiveOperationLimiter 
} = require('../middleware/validation');
const {
  hashPassword,
  verifyPassword,
  analyzePasswordStrength,
  checkPasswordHistory,
  addToPasswordHistory,
  handleFailedLogin,
  isAccountLocked,
  resetFailedAttempts,
  generateResetToken,
  verifyResetToken,
  logSecurityEvent
} = require('../utils/passwordSecurity');

const router = express.Router();

// ========== BRUTE FORCE PROTECTION ==========
const BruteForceSchema = new mongoose.Schema({
  _id: String,
  data: {
    count: Number,
    lastRequest: Date,
    firstRequest: Date
  },
  expires: { type: Date, index: { expires: '1d' } }
});

const BruteForceModel = mongoose.model('bruteforce', BruteForceSchema);
const store = new ExpressBruteMongooseStore(BruteForceModel);

const bruteforce = new ExpressBrute(store, {
  freeRetries: 3,
  minWait: 5 * 60 * 1000, // 5 minutes
  maxWait: 60 * 60 * 1000, // 1 hour
  failCallback: (req, res, next, nextValidRequestDate) => {
    logSecurityEvent('BRUTE_FORCE_DETECTED', null, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      nextValidRequestDate
    });
    
    res.status(429).json({
      error: 'Too many failed attempts',
      message: 'Account temporarily locked due to suspicious activity',
      retryAfter: Math.round((nextValidRequestDate.getTime() - Date.now()) / 1000)
    });
  }
});

// ========== ADDITIONAL RATE LIMITING ==========
const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts per 15 minutes
  message: {
    error: 'Authentication rate limit exceeded',
    retryAfter: '15 minutes'
  }
});

// ========== UTILITY FUNCTIONS ==========

const generateJWT = (userId, sessionId) => {
  return jwt.sign(
    { 
      userId, 
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      type: 'access'
    },
    process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    { 
      expiresIn: '24h',
      issuer: 'secure-banking-portal',
      audience: 'banking-customers'
    }
  );
};

const generateSessionId = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

// ========== CUSTOMER REGISTRATION ==========
router.post('/register', 
  strictAuthLimiter,
  bruteforce.prevent,
  validateRegistration, 
  handleValidationErrors, 
  async (req, res) => {
    try {
      const { fullName, idNumber, accountNumber, username, password } = req.body;
      
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { username },
          { idNumber },
          { accountNumber }
        ]
      });
      
      if (existingUser) {
        logSecurityEvent('DUPLICATE_REGISTRATION_ATTEMPT', null, {
          ip: req.ip,
          username,
          idNumber: idNumber.slice(0, 4) + '****' + idNumber.slice(-2)
        });
        
        return res.status(409).json({
          error: 'Registration failed',
          message: 'User with these details already exists'
        });
      }
      
      // Analyze password strength
      const passwordAnalysis = analyzePasswordStrength(password);
      if (!passwordAnalysis.isStrong) {
        return res.status(400).json({
          error: 'Weak password',
          message: 'Password does not meet security requirements',
          requirements: passwordAnalysis.feedback
        });
      }
      
      // Hash password with advanced security
      const passwordData = await hashPassword(password);
      
      // Create new user
      const user = new User({
        fullName,
        idNumber,
        accountNumber,
        username,
        passwordHash: passwordData.hash,
        passwordSalt: passwordData.customSalt,
        passwordHistory: [passwordData],
        lastPasswordChange: new Date(),
        registrationDate: new Date(),
        registrationIP: req.ip,
        isActive: true,
        role: 'customer'
      });
      
      await user.save();
      
      logSecurityEvent('USER_REGISTERED', user._id, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        userId: user._id
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      
      logSecurityEvent('REGISTRATION_ERROR', null, {
        error: error.message,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Registration failed',
        message: 'Internal server error'
      });
    }
  }
);

// ========== CUSTOMER LOGIN ==========
router.post('/login', 
  strictAuthLimiter,
  bruteforce.prevent,
  validateLogin, 
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username, accountNumber, password } = req.body;
      
      // Find user
      const user = await User.findOne({ 
        username, 
        accountNumber, 
        isActive: true 
      });
      
      if (!user) {
        // Generic error to prevent user enumeration
        logSecurityEvent('LOGIN_ATTEMPT_INVALID_USER', null, {
          ip: req.ip,
          username,
          accountNumber: accountNumber.slice(0, 4) + '****'
        });
        
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials'
        });
      }
      
      // Check if account is locked
      const lockStatus = await isAccountLocked(user._id);
      if (lockStatus.locked) {
        logSecurityEvent('LOGIN_ATTEMPT_LOCKED_ACCOUNT', user._id, {
          ip: req.ip,
          unlockTime: lockStatus.unlockTime
        });
        
        return res.status(423).json({
          error: 'Account locked',
          message: 'Account is temporarily locked due to failed login attempts',
          unlockTime: lockStatus.unlockTime
        });
      }
      
      // Verify password
      const isValidPassword = await verifyPassword(
        password, 
        user.passwordHash, 
        user.passwordSalt
      );
      
      if (!isValidPassword) {
        // Handle failed login attempt
        const attemptResult = await handleFailedLogin(user._id);
        
        logSecurityEvent('LOGIN_FAILED', user._id, {
          ip: req.ip,
          attemptsRemaining: attemptResult?.attemptsRemaining
        });
        
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid credentials',
          attemptsRemaining: attemptResult?.attemptsRemaining
        });
      }
      
      // Successful login - reset failed attempts
      await resetFailedAttempts(user._id);
      
      // Generate session
      const sessionId = generateSessionId();
      const token = generateJWT(user._id, sessionId);
      
      // Update user login information
      user.lastLoginDate = new Date();
      user.lastLoginIP = req.ip;
      user.activeSession = sessionId;
      await user.save();
      
      // Set secure HTTP-only cookie
      res.cookie('authToken', token, {
        httpOnly: true,
        secure: true, // HTTPS only
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
      
      logSecurityEvent('LOGIN_SUCCESSFUL', user._id, {
        ip: req.ip,
        sessionId
      });
      
      res.json({
        success: true,
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          fullName: user.fullName,
          role: user.role
        }
      });
      
    } catch (error) {
      console.error('Login error:', error);
      
      logSecurityEvent('LOGIN_ERROR', null, {
        error: error.message,
        ip: req.ip
      });
      
      res.status(500).json({
        error: 'Authentication failed',
        message: 'Internal server error'
      });
    }
  }
);

// ========== PASSWORD CHANGE ==========
router.post('/change-password', 
  sensitiveOperationLimiter,
  authenticateToken,
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: 'User not found'
        });
      }
      
      // Verify current password
      const isValidCurrentPassword = await verifyPassword(
        currentPassword, 
        user.passwordHash, 
        user.passwordSalt
      );
      
      if (!isValidCurrentPassword) {
        logSecurityEvent('PASSWORD_CHANGE_FAILED_CURRENT', userId, {
          ip: req.ip
        });
        
        return res.status(401).json({
          error: 'Current password is incorrect'
        });
      }
      
      // Check password strength
      const passwordAnalysis = analyzePasswordStrength(newPassword);
      if (!passwordAnalysis.isStrong) {
        return res.status(400).json({
          error: 'Weak password',
          requirements: passwordAnalysis.feedback
        });
      }
      
      // Check password history
      const isPasswordReused = await checkPasswordHistory(userId, newPassword);
      if (isPasswordReused) {
        return res.status(400).json({
          error: 'Password previously used',
          message: 'Please choose a password you haven\'t used before'
        });
      }
      
      // Hash new password
      const passwordData = await hashPassword(newPassword);
      
      // Update user
      user.passwordHash = passwordData.hash;
      user.passwordSalt = passwordData.customSalt;
      user.lastPasswordChange = new Date();
      
      // Add to password history
      await addToPasswordHistory(userId, passwordData);
      
      await user.save();
      
      logSecurityEvent('PASSWORD_CHANGED', userId, {
        ip: req.ip
      });
      
      res.json({
        success: true,
        message: 'Password changed successfully'
      });
      
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({
        error: 'Password change failed',
        message: 'Internal server error'
      });
    }
  }
);

// ========== LOGOUT ==========
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Clear server-side session
    await User.findByIdAndUpdate(userId, {
      $unset: { activeSession: 1 }
    });
    
    // Clear cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict'
    });
    
    logSecurityEvent('LOGOUT', userId, {
      ip: req.ip
    });
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
    
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed'
    });
  }
});

// ========== TOKEN VALIDATION MIDDLEWARE ==========
function authenticateToken(req, res, next) {
  const token = req.cookies.authToken || req.header('Authorization')?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      error: 'Access denied',
      message: 'No authentication token provided'
    });
  }
  
  try {
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback-secret-change-in-production'
    );
    
    req.user = decoded;
    next();
  } catch (error) {
    logSecurityEvent('INVALID_TOKEN', null, {
      ip: req.ip,
      error: error.message
    });
    
    res.status(403).json({
      error: 'Invalid token',
      message: 'Authentication token is invalid or expired'
    });
  }
}

// ========== SECURITY STATUS ENDPOINT ==========
router.get('/security-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select(
      'lastPasswordChange loginAttempts lastLoginDate passwordHistory'
    );
    
    const securityStatus = {
      passwordAge: user.lastPasswordChange 
        ? Math.floor((new Date() - user.lastPasswordChange) / (1000 * 60 * 60 * 24))
        : null,
      failedAttempts: user.loginAttempts || 0,
      lastLogin: user.lastLoginDate,
      passwordHistoryLength: user.passwordHistory?.length || 0
    };
    
    res.json(securityStatus);
  } catch (error) {
    console.error('Security status error:', error);
    res.status(500).json({ error: 'Unable to fetch security status' });
  }
});

module.exports = router;