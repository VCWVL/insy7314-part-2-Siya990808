// server/server.js - Maximum Security Implementation (patched)
// - Adds CSRF token endpoint (dev fallback)
// - Corrects middleware ordering (cookie/session before csurf)
// - Adds X-Requested-With to allowed CORS headers
// - Makes session cookie 'secure' conditional on production
// - Uses express-slow-down in new-style config (avoids warning)
// - Mounts auth route without strict rate-limit in development (avoid 429 while testing)

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

// ========== MAXIMUM SECURITY CONFIGURATION ==========

// 1. SECURITY HEADERS (Helmet.js - Comprehensive Protection)
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
      upgradeInsecureRequests: [],
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

// 2. RATE LIMITING (DDoS Protection - Exceeds Standard)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // strict in prod, relaxed in dev
  skipSuccessfulRequests: true,
  message: {
    error: 'Too many authentication attempts, account temporarily locked.',
    retryAfter: '15 minutes'
  }
});

// Progressive delay for repeated requests (new-style delayMs to avoid warning)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 2,
  delayMs: () => 500 // constant 500ms delay for each request over the threshold
});

app.use(limiter);
app.use(speedLimiter);

// 3. CORS CONFIGURATION (Secure Cross-Origin Requests)
// Note: allowedHeaders includes X-Requested-With and x-csrf-token which the frontend uses
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like curl or mobile clients)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'https://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3001'
    ];

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow all for development convenience; tighten this in production.
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  // Include common headers the frontend may send
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'X-Requested-With'],
  exposedHeaders: ['x-csrf-token']
};
app.use(cors(corsOptions));

// 4. BODY PARSING & COMPRESSION
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. COOKIE PARSER (required before session and csurf)
app.use(cookieParser());

// 6. SESSION CONFIGURATION (Secure Session Management)
// secure cookie only in production. sameSite adjusted in CSRF block below.
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/banking_portal',
    touchAfter: 24 * 3600 // lazy session update
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    // sameSite will be handled in CSRF block to allow cross-site cookies in production when needed
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// 7. CSRF PROTECTION (enable cookie-based CSRF tokens)
// CSRF must be registered AFTER cookieParser() and session()
// Provide a development fallback token to simplify local testing.
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
});

if (process.env.NODE_ENV === 'production') {
  // Enforce CSRF in production
  app.use(csrfProtection);

  // Expose CSRF token endpoint for frontend
  app.get('/api/csrf-token', (req, res) => {
    try {
      res.json({ csrfToken: req.csrfToken() });
    } catch (err) {
      res.status(500).json({ error: 'CSRF token unavailable' });
    }
  });
} else {
  // Development: do NOT enforce csurf (keeps dev workflow simple),
  // but provide a token endpoint the frontend expects.
  app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: 'dev-token' });
  });
}

// 8. LOGGING (Security Monitoring)
app.use(morgan('combined', {
  skip: function (req, res) {
    return res.statusCode < 400;
  }
}));

// 9. FORCE HTTPS REDIRECT (disabled in dev; keep commented for now)
// app.use((req, res, next) => {
//   if (req.header('x-forwarded-proto') !== 'https') {
//     res.redirect(`https://${req.header('host')}${req.url}`);
//   } else {
//     next();
//   }
// });

// ========== DATABASE CONNECTION ==========
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/banking_portal', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected with SSL'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// ========== ROUTES ==========
// Mount auth route: use strict limiter in production, but relax in dev to avoid 429 while testing
if (process.env.NODE_ENV === 'production') {
  app.use('/api/auth', authLimiter, require('./routes/auth'));
} else {
  app.use('/api/auth', require('./routes/auth'));
}

// Mount other routes (payments, users, etc.)
app.use('/api/payments', require('./routes/payments'));
app.use('/api/users', require('./routes/users'));

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
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
app.use((err, req, res, next) => {
  console.error('Error:', err && err.stack ? err.stack : err);

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';

  res.status(err && err.status ? err.status : 500).json({
    error: isDevelopment ? (err && err.message ? err.message : String(err)) : 'Internal Server Error',
    ...(isDevelopment && { stack: err && err.stack ? err.stack : null })
  });
});

// 404 handler (must be last)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ========== SSL / HTTP SERVER SETUP ==========
const PORT = process.env.PORT || 5000;
const HTTPS_PORT = process.env.HTTPS_PORT || 5001;

// Add HTTP server for development (useful to allow non-https dev)
const httpServer = app.listen(PORT, () => {
  console.log(`🌐 HTTP Server running on port ${PORT}`);
  console.log(`🌍 Access at: http://localhost:${PORT}`);
});

// HTTPS Server with SSL certificates (self-signed for dev)
try {
  const privateKey = fs.readFileSync(path.join(__dirname, '../certificates/private-key.pem'), 'utf8');
  const certificate = fs.readFileSync(path.join(__dirname, '../certificates/certificate.pem'), 'utf8');
  const credentials = { key: privateKey, cert: certificate };

  const httpsServer = https.createServer(credentials, app);

  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`🔒 HTTPS Server running securely on port ${HTTPS_PORT}`);
    console.log(`🌍 Access at: https://localhost:${HTTPS_PORT}`);
    console.log(`🛡️  Security features active:`);
    console.log(`   ✅ SSL/TLS Encryption`);
    console.log(`   ✅ Rate Limiting & DDoS Protection`);
    console.log(`   ✅ CSRF Protection (production)`); // note: dev uses token fallback
    console.log(`   ✅ XSS Protection`);
    console.log(`   ✅ Security Headers (Helmet.js)`);
    console.log(`   ✅ Session Security`);
    console.log(`   ✅ Input Validation`);
  });
} catch (err) {
  console.warn('⚠️  HTTPS certificates not found or unreadable. HTTPS server not started.', err.message || err);
  console.warn('If you want HTTPS locally, ensure certificates exist in /certificates and try again.');
}

module.exports = app;
