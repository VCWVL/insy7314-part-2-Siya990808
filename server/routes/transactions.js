const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const { body, validationResult } = require('express-validator');
const csrf = require('csurf');

// CSRF protection
const csrfProtection = csrf({ 
  cookie: { 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  } 
});

// ===================== POST /api/transactions =====================
router.post(
  '/',
  csrfProtection,
  [
    // Input validation with regex patterns matching frontend
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be greater than 0')
      .matches(/^\d{1,10}(\.\d{1,2})?$/)
      .withMessage('Invalid amount format'),
    
    body('currency')
      .isLength({ min: 3, max: 3 })
      .withMessage('Currency code must be 3 characters')
      .matches(/^[A-Z]{3}$/)
      .withMessage('Invalid currency code format'),
    
    body('provider')
      .notEmpty()
      .withMessage('Provider is required')
      .isIn(['StandardBank', 'FNB', 'ABSA', 'Nedbank', 'Capitec'])
      .withMessage('Invalid provider selected'),
    
    body('swiftCode')
      .isLength({ min: 8, max: 11 })
      .withMessage('SWIFT code must be 8-11 characters')
      .matches(/^[A-Z0-9]{8,11}$/)
      .withMessage('Invalid SWIFT code format'),
    
    body('beneficiaryAccount')
      .notEmpty()
      .withMessage('Beneficiary account is required')
      .isLength({ min: 5, max: 50 })
      .withMessage('Beneficiary account must be between 5-50 characters')
      .matches(/^[A-Za-z0-9\s\-]+$/)
      .withMessage('Invalid beneficiary account format')
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array().map(e => e.msg)
        });
      }

      // Check authentication
      const userId = req.session.user?._id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized - Please log in' });
      }

      // Create transaction
      const transaction = new Transaction({
        userId,
        amount: parseFloat(req.body.amount),
        currency: req.body.currency.toUpperCase().trim(),
        provider: req.body.provider.trim(),
        swiftCode: req.body.swiftCode.toUpperCase().trim(),
        beneficiaryAccount: req.body.beneficiaryAccount.trim(),
        date: new Date()
      });

      // Save to database
      await transaction.save();
      
      console.log(`Transaction created for user ${userId}: ${transaction.amount} ${transaction.currency}`);
      
      res.status(201).json({
        message: 'Transaction completed successfully',
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          currency: transaction.currency,
          provider: transaction.provider,
          date: transaction.date
        }
      });

    } catch (err) {
      console.error('Transaction error:', err);
      
      res.status(500).json({ 
        error: 'Server error processing transaction',
        ...(process.env.NODE_ENV === 'development' && { details: err.message })
      });
    }
  }
);

// ===================== GET /api/transactions =====================
router.get('/', csrfProtection, async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized - Please log in' });
    }

    // Fetch transactions with security: only user's transactions, sorted by date
    const transactions = await Transaction.find({ userId })
      .select('amount currency provider swiftCode beneficiaryAccount date')
      .sort({ date: -1 })
      .lean();

    res.json(transactions);

  } catch (err) {
    console.error('Transaction fetch error:', err);
    res.status(500).json({ 
      error: 'Server error fetching transactions',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

module.exports = router;