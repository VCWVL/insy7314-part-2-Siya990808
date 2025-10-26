// server/routes/employeeAuth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const csrf = require('csurf');
const router = express.Router();
const Employee = require('../models/Employee');

// CSRF protection 
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: false, 
    sameSite: 'lax'
  }
});

router.post('/login', async (req, res) => {
  try {
    console.log('Employee login attempt:', { username: req.body.username });

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Find employee by username
    const employee = await Employee.findOne({ 
      username: username.trim(),
      isActive: true // Only active employees can login
    });
    
    if (!employee) {
      console.log('Employee not found or inactive:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, employee.passwordHash);
    if (!isValidPassword) {
      console.log('Invalid password for employee:', username);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Successful login
    console.log('Employee login successful:', username);
    
    // Update last login
    employee.lastLoginDate = new Date();
    await employee.save();

    // Set employee session (different from customer session)
    req.session.employee = {
      _id: employee._id,
      employeeId: employee.employeeId,
      username: employee.username,
      fullName: employee.fullName,
      role: employee.role,
      department: employee.department
    };

    res.json({
      message: 'Employee login successful',
      employee: req.session.employee
    });

  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Employee Logout - NO CSRF needed
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Employee logout error:', err);
      return res.status(500).json({ message: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Employee logout successful' });
  });
});

// Employee Session Check - NO CSRF needed 
router.get('/session', (req, res) => {
  if (req.session.employee) {
    res.json({ authenticated: true, employee: req.session.employee });
  } else {
    res.status(401).json({ authenticated: false, message: 'Not authenticated' });
  }
});

// Get CSRF token for employee portal - WITH CSRF protection
router.get('/csrf-token', csrfProtection, (req, res) => {
  console.log('🔑 CSRF token requested by employee');
  res.json({ csrfToken: req.csrfToken() });
});

module.exports = router;