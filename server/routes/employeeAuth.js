const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const Employee = require('../models/Employee');

// --- Employee Login ---
router.post('/login', async (req, res) => {
  try {
    console.log('🔐 Employee login attempt:', req.body.username);
    
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const employee = await Employee.findOne({ 
      username: username.trim(), 
      isActive: true 
    });

    if (!employee) {
      console.log('❌ Employee not found:', username);
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // Check if account is locked
    if (employee.lockUntil && employee.lockUntil > Date.now()) {
      const lockTimeLeft = Math.ceil((employee.lockUntil - Date.now()) / (1000 * 60));
      return res.status(403).json({ 
        message: `Account locked. Try again in ${lockTimeLeft} minutes.` 
      });
    }

    const isValidPassword = await bcrypt.compare(password, employee.passwordHash);

    if (!isValidPassword) {
      employee.loginAttempts += 1;
      let message = 'Invalid credentials.';

      // Warn on 5th attempt
      if (employee.loginAttempts === 5) {
        message = 'LAST ATTEMPT! YOU WILL BE LOCKED OUT AFTER THIS.';
      }

      // Lock on 6th attempt
      if (employee.loginAttempts >= 6) {
        employee.lockUntil = Date.now() + (30 * 60 * 1000); // 30 minutes
        message = 'Account locked due to failed attempts. Try again in 30 minutes.';
      }

      await employee.save();
      return res.status(401).json({ message });
    }

    // SUCCESSFUL LOGIN
    employee.loginAttempts = 0;
    employee.lockUntil = undefined;
    employee.lastLoginDate = new Date();
    await employee.save();

    req.session.employee = {
      _id: employee._id,
      employeeId: employee.employeeId,
      username: employee.username,
      fullName: employee.fullName,
      role: employee.role,
      department: employee.department
    };

    console.log('✅ Login successful for:', username);
    res.json({ 
      message: 'Login successful', 
      employee: req.session.employee 
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// --- Employee Logout ---
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

// --- Session Check ---
router.get('/session', (req, res) => {
  if (req.session.employee) {
    res.json({ authenticated: true, employee: req.session.employee });
  } else {
    res.status(401).json({ authenticated: false, message: 'Not authenticated' });
  }
});

module.exports = router;