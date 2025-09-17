// server/routes/users.js
const express = require('express');
const router = express.Router();

// Placeholder for user routes
router.get('/test', (req, res) => {
  res.json({ message: 'Users route working' });
});

module.exports = router;