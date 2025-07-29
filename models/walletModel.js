// models/walletModel.js
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    // Ek unique identifier taake hum isay aasani se dhoond sakein
    name: {
        type: String,
        default: 'platformWallet',
        unique: true
    },
    totalBalance: {
        type: Number,
        default: 0
    },
    availableFunds: {
        type: Number,
        default: 0
    },
    totalWithdrawals: {
        type: Number,
        default: 0
    },
    pendingPayouts: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;