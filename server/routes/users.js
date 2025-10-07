const express = require('express');
const router = express.Router();
const User = require('../models/User');
const csrf = require('csurf');

const csrfProtection = csrf({ 
  cookie: { 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  } 
});

// Get user profile
router.get('/profile', csrfProtection, async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId)
      .select('fullName username accountNumber registrationDate lastLoginDate');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Users route working' });
});

module.exports = router;
// References:
// GDPR.eu (2018) 'General Data Protection Regulation (GDPR)', 
// Available at: https://gdpr.eu/ (Accessed: 17 September 2025).
//
// NIST (2020) 'Privacy Framework: A Tool for Improving Privacy Through Enterprise Risk Management', 
// Version 1.0. Available at: https://doi.org/10.6028/NIST.CSWP.01162020
//
// OWASP Foundation (2021) 'Session Management Cheat Sheet', 
// Available at: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html (Accessed: 17 September 2025).
//
// Anderson, R. (2020) Security Engineering: A Guide to Building Dependable Distributed Systems. 3rd edn. Wiley.