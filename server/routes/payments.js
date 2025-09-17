// server/routes/payments.js
const express = require('express');
const router = express.Router();

// Placeholder for payment routes
router.get('/test', (req, res) => {
  res.json({ message: 'Payments route working' });
});

module.exports = router;