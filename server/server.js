const express = require('express');
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const csrf = require('csurf');
const MongoStore = require('connect-mongo');
require('dotenv').config();

const app = express();

// ========== SECURITY CONFIGURATION ==========

// 1. SECURITY HEADERS
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true
}));

// 2. RATE LIMITING
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  message: {
    error: 'Too many authentication attempts, please try again later.',
  }
});

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: () => 500,
  validate: { delayMs: false } 
});

// 3. CORS CONFIGURATION
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin 
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3001'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], 
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'X-CSRF-Token', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// 4. BODY PARSING & COMPRESSION
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 5. SESSION CONFIGURATION
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb+srv://bankinguser:bankingpassword@banking-cluster.aacnujn.mongodb.net/banking_app?retryWrites=true&w=majority&appName=banking-cluster',
    ttl: 24 * 60 * 60 
  }),
  cookie: {
    secure: false, 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, 
    sameSite: 'lax' 
  }
}));

// 6. CSRF PROTECTION - Only apply to specific routes
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: false, 
    sameSite: 'lax'
  }
});

// Apply CSRF to specific routes instead of all /api routes
app.get('/api/auth/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// ADD THIS FOR EMPLOYEE ROUTES:
app.get('/api/employeeauth/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// 7. LOGGING
app.use(morgan('combined'));

// 8. RATE LIMITING MIDDLEWARE
app.use(limiter);
app.use(speedLimiter);

// ========== DATABASE CONNECTION ==========
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://bankinguser:bankingpassword@banking-cluster.aacnujn.mongodb.net/banking_app?retryWrites=true&w=majority&appName=banking-cluster')
.then(() => console.log('✅ MongoDB Connected'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// ========== ROUTES ==========
// Import routes
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const userRoutes = require('./routes/users');
const employeeAuthRoutes = require('./routes/employeeAuth');
const employeeTransactionRoutes = require('./routes/employeeTransactions');

// Apply routes with appropriate rate limiting
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/transactions', csrfProtection, transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/employeeauth', authLimiter, employeeAuthRoutes); // ← FIXED PATH
app.use('/api/employee/transactions', employeeTransactionRoutes);

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// ========== ERROR HANDLING ==========
// CSRF error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({
      error: 'Invalid CSRF token'
    });
  }
  next(err);
});

// General error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);

  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ========== SERVER STARTUP ==========
const PORT = process.env.PORT || 5000;

// HTTP Server
const httpServer = app.listen(PORT, () => {
  console.log(` HTTP Server running on port ${PORT}`);
  console.log(`📍 Access at: http://localhost:${PORT}`);
  console.log('✅ Security features active:');
  console.log('   • Rate Limiting & DDoS Protection');
  console.log('   • CSRF Protection');
  console.log('   • XSS Protection');
  console.log('   • Security Headers (Helmet.js)');
  console.log('   • Session Security');
});

module.exports = app;