const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0.01
  },
  currency: { 
    type: String, 
    required: true,
    uppercase: true,
    match: [/^[A-Z]{3}$/, 'Invalid currency code']
  },
  provider: { 
    type: String, 
    required: true,
    enum: ['StandardBank', 'FNB', 'ABSA', 'Nedbank', 'Capitec']
  },
  swiftCode: { 
    type: String, 
    required: true,
    uppercase: true,
    match: [/^[A-Z0-9]{8,11}$/, 'Invalid SWIFT code format']
  },
  beneficiaryAccount: { 
    type: String, 
    required: true,
    trim: true
  },
  date: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index for better query performance
transactionSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);