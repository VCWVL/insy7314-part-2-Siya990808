const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const User = require('../models/User');

// Get CSRF token
router.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: 'dev-csrf-token' }); // Simplified for now
});

// Security status check
router.get('/security-status', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Login route - SIMPLIFIED
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt:', { 
      username: req.body.username, 
      accountNumber: req.body.accountNumber 
    });

    const { username, accountNumber, password } = req.body;

    // Basic validation
    if (!username || !accountNumber || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Find user by username only for now
    const user = await User.findOne({ 
      username: username.trim()
    });
    
    if (!user) {
      console.log('User not found:', username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      console.log('Invalid password for user:', username);
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Successful login
    console.log('Login successful for user:', username);
    
    // Set session
    req.session.user = {
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      accountNumber: user.accountNumber
    };

    res.json({
      message: 'Login successful',
      user: req.session.user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Register route - SIMPLIFIED
router.post('/register', async (req, res) => {
  try {
    console.log('Registration attempt:', req.body);

    const { fullName, idNumber, accountNumber, username, password } = req.body;

    // Basic validation
    if (!fullName || !idNumber || !accountNumber || !username || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: username.trim() }, 
        { idNumber: idNumber.trim() }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with these details' });
    }

    // Hash password
    const saltRounds = 12;
    const salt = await bcrypt.genSalt(saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      fullName: fullName.trim(),
      idNumber: idNumber.trim(),
      accountNumber: accountNumber.trim(),
      username: username.trim(),
      passwordHash,
      passwordSalt: salt
    });

    await user.save();
    console.log('User registered successfully:', username);

    res.status(201).json({ 
      message: 'User registered successfully. Please login.' 
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: errors.join(', ') });
    }
    
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// Session check
router.get('/session', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: req.session.user });
  } else {
    res.json({ authenticated: false });
  }
});

module.exports = router;