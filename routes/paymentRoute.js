const express = require('express');
const router = express.Router();

const { processPayment } = require('../controllers/paymentController');

// 1. Import your 'authMiddleware' function instead of 'isAuthenticatedUser'
const authMiddleware = require('../middleware/auth');

// 2. Call authMiddleware() to generate the middleware for the route.
//    This middleware will check for a valid token for any logged-in user.
router.route('/payment/process').post(authMiddleware(), processPayment);

module.exports = router;