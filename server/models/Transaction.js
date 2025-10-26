// server/models/Transaction.js - Updated with Employee Verification
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
  },
  
  //EMPLOYEE VERIFICATION
  status: {
    type: String,
    enum: ['pending', 'verified', 'submitted'],
    default: 'pending',
    index: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  submittedToSwift: {
    type: Boolean,
    default: false
  },
  submittedAt: {
    type: Date,
    default: null
  },
  employeeNotes: {
    type: String,
    maxlength: 500,
    default: ''
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ status: 1, date: -1 }); // For employee portal queries
transactionSchema.index({ verifiedBy: 1 }); // Track which employee verified

module.exports = mongoose.model('Transaction', transactionSchema);