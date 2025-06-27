// server/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true},
  email: { type: String, required: true, unique: true},
  password: { 
    type: String,
    required: function() {
      return this.registrationMethod === 'email' || (!this.googleId && !this.registrationMethod);
  },
  minlength: [6, 'Password must be at least 6 characters long'],
  select: false // Do not return password by default on queries
  },
  role: { type: String, default: 'user' },
  verified: { type: Boolean, default: false },
  verificationCode: { type: String },

  // --- New fields for Google Sign-in ---
  googleId: { type: String, unique: true, sparse: true },
  registrationMethod: { type: String, enum: ['email', 'google'], default: 'email' }, 

  contactNo: { type: String, default: '' },
  additionalEmails: [{ type: String }],
  createdCampaigns: { type: Number, default: 0 },
  backedCampaigns: { type: Number, default: 0 },

  accountType: { type: String, default: 'Choose' },
  accountNumber: { type: String, default: '' },
  cvc: { type: String, default: '' },
  expiryDate: { type: String, default: '' },

  profilePictureUrl: { type: String, default: '' },

  // Added new field for saved campaigns
  savedCampaigns: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  }],

   // --- New fields for KYC Verification Status ---
   kycSubmitted: { // Indicates if a KYC application has been submitted
    type: Boolean,
    default: false
  },
  kycVerified: { // Indicates if the user's KYC has been approved
    type: Boolean,
    default: false
  },
  // ADDED: Centralized kycStatus in User model for frontend to consume directly
  kycStatus: {
    type: String,
    enum: ['Not Submitted', 'Pending Review', 'Approved', 'Rejected'],
    default: 'Not Submitted'
  },

  // Added lastLogin and createdAt for better user tracking
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);