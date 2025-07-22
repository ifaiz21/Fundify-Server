const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending'
    },
    frequency: {
        type: String,
        required: true,
        enum: ['one-time', 'monthly']
    },
    donationType: {
        type: String,
        required: true,
        // The value 'Other' has been added to this list
        enum: ['General Donation', 'Project Specific', 'Emergency Relief', 'Education Purpose', 'Flood Relief', 'Other']
    },
    honorOf: {
        type: String,
        trim: true
    },
    transactionId: {
        type: String, // To store transaction IDs from payment gateways
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Donation', donationSchema);