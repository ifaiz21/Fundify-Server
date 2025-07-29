// server/models/transactionModel.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    // Type of transaction (e.g., 'Withdrawal', 'Deposit', 'Refund', 'Fee')
    type: {
        type: String,
        required: true,
        enum: ['Withdrawal', 'Deposit', 'Refund', 'Fee']
    },
    // Amount of the transaction
    amount: {
        type: Number,
        required: true
    },
    // A brief description of the transaction
    description: {
        type: String,
        required: true
    },
    // Status of the transaction
    status: {
        type: String,
        required: true,
        enum: ['Complete', 'In-progress', 'Cancelled', 'Failed'],
        default: 'Complete'
    },
    // Optional: Link to a specific user
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Optional: Link to a specific campaign
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign'
    },
    // Unique ID for the transaction, can be from a payment gateway or generated
    transactionId: {
        type: String,
        unique: true,
        // You can add a function to auto-generate this if needed
    }
}, { timestamps: true }); // Automatically adds createdAt and updatedAt fields

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;