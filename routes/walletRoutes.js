// routes/admin.js
const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { protect, admin } = require('../middleware/authMiddleware'); // Authentication ke liye

// Wallet ka data get karne ke liye
router.get('/wallet', protect, admin, walletController.getWalletStats);

// Funds transfer karne ke liye
router.post('/wallet/transfer', protect, admin, walletController.transferFunds);

module.exports = router;