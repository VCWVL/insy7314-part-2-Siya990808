// server/routes/employeeTransactions.js
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const csrf = require('csurf');

// CSRF protection - match server.js and employeeAuth.js configuration
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: false, // Set to false for development (HTTP)
    sameSite: 'lax'
  }
});

// Middleware to check if user is an authenticated employee
const requireEmployee = (req, res, next) => {
  if (!req.session.employee) {
    return res.status(401).json({ error: 'Unauthorized - Employee access required' });
  }
  next();
};

// ====== GET ALL PENDING TRANSACTIONS ===== (NO CSRF - GET request)
router.get('/', requireEmployee, async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build query filter
    const filter = {};
    if (status && ['pending', 'verified', 'submitted'].includes(status)) {
      filter.status = status;
    }

    // Fetch transactions with customer details
    const transactions = await Transaction.find(filter)
      .populate('userId', 'fullName username accountNumber')
      .populate('verifiedBy', 'fullName employeeId')
      .sort({ date: -1 })
      .lean();

    console.log(`Employee ${req.session.employee.username} fetched ${transactions.length} transactions`);

    res.json(transactions);
  } catch (err) {
    console.error('Employee transaction fetch error:', err);
    res.status(500).json({
      error: 'Server error fetching transactions',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// =========== GET SINGLE TRANSACTION DETAILS ========== (NO CSRF - GET request)
router.get('/:id', requireEmployee, async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('userId', 'fullName username accountNumber idNumber')
      .populate('verifiedBy', 'fullName employeeId')
      .lean();

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (err) {
    console.error('Transaction detail fetch error:', err);
    res.status(500).json({ error: 'Server error fetching transaction details' });
  }
});

// ========= VERIFY TRANSACTION ========== (WITH CSRF - PATCH request)
router.patch('/:id/verify', requireEmployee, csrfProtection, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    console.log(` Employee ${req.session.employee.username} verifying transaction ${id}`);

    // Find transaction
    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Check if already verified
    if (transaction.status !== 'pending') {
      return res.status(400).json({ 
        error: `Transaction is already ${transaction.status}` 
      });
    }

    // Update transaction to verified
    transaction.status = 'verified';
    transaction.verifiedBy = req.session.employee._id;
    transaction.verifiedAt = new Date();
    
    if (notes) {
      transaction.employeeNotes = notes.trim().substring(0, 500);
    }

    await transaction.save();

    console.log(`✅ Transaction ${id} verified by employee ${req.session.employee.username}`);

    // Populate employee details for response
    await transaction.populate('verifiedBy', 'fullName employeeId');

    res.json({
      message: 'Transaction verified successfully',
      transaction
    });

  } catch (err) {
    console.error('Transaction verification error:', err);
    res.status(500).json({
      error: 'Server error verifying transaction',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// ======== SUBMIT TO SWIFT (Single Transaction) ======== (WITH CSRF - PATCH request)
router.patch('/:id/submit', requireEmployee, csrfProtection, async (req, res) => {
  try {
    const { id } = req.params;

    console.log(` Employee ${req.session.employee.username} submitting transaction ${id} to SWIFT`);

    // Find transaction
    const transaction = await Transaction.findById(id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Must be verified before submitting
    if (transaction.status !== 'verified') {
      return res.status(400).json({ 
        error: 'Transaction must be verified before submitting to SWIFT' 
      });
    }

    // Check if already submitted
    if (transaction.submittedToSwift) {
      return res.status(400).json({ 
        error: 'Transaction already submitted to SWIFT' 
      });
    }

    // Update transaction to submitted
    transaction.status = 'submitted';
    transaction.submittedToSwift = true;
    transaction.submittedAt = new Date();

    await transaction.save();

    console.log(`✅ Transaction ${id} submitted to SWIFT by employee ${req.session.employee.username}`);

    res.json({
      message: 'Transaction submitted to SWIFT successfully',
      transaction
    });

  } catch (err) {
    console.error('SWIFT submission error:', err);
    res.status(500).json({
      error: 'Server error submitting to SWIFT',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// ========== BULK SUBMIT TO SWIFT ========= (WITH CSRF - POST request)
router.post('/submit-bulk', requireEmployee, csrfProtection, async (req, res) => {
  try {
    const { transactionIds } = req.body;

    console.log(` Employee ${req.session.employee.username} bulk submitting ${transactionIds?.length} transactions`);

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ error: 'Transaction IDs array is required' });
    }

    // Find all verified transactions
    const transactions = await Transaction.find({
      _id: { $in: transactionIds },
      status: 'verified'
    });

    if (transactions.length === 0) {
      return res.status(400).json({ 
        error: 'No verified transactions found to submit' 
      });
    }

    // Update all to submitted
    const updatePromises = transactions.map(tx => {
      tx.status = 'submitted';
      tx.submittedToSwift = true;
      tx.submittedAt = new Date();
      return tx.save();
    });

    await Promise.all(updatePromises);

    console.log(`✅ ${transactions.length} transactions submitted to SWIFT by employee ${req.session.employee.username}`);

    res.json({
      message: `${transactions.length} transactions submitted to SWIFT successfully`,
      submittedCount: transactions.length
    });

  } catch (err) {
    console.error('Bulk SWIFT submission error:', err);
    res.status(500).json({
      error: 'Server error during bulk submission',
      ...(process.env.NODE_ENV === 'development' && { details: err.message })
    });
  }
});

// =========== GET STATISTICS =========== (NO CSRF - GET request)
router.get('/stats/summary', requireEmployee, async (req, res) => {
  try {
    const stats = await Transaction.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const summary = {
      pending: 0,
      verified: 0,
      submitted: 0,
      totalAmount: 0
    };

    stats.forEach(stat => {
      summary[stat._id] = stat.count;
      summary.totalAmount += stat.totalAmount;
    });

    res.json(summary);
  } catch (err) {
    console.error('Stats fetch error:', err);
    res.status(500).json({ error: 'Server error fetching statistics' });
  }
});

module.exports = router;