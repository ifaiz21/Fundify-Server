const express = require('express');
const router = express.Router();

// --- DEBUGGING STEP 1 ---
// Import the whole object first to inspect it
const paymentController = require('../controllers/paymentController');
console.log('Imported from paymentController:', paymentController); 
// This should log: { processPayment: [Function: processPayment] }
// If it logs an empty object {}, you have a circular dependency.

const { processPayment } = paymentController;
const { isAuthenticatedUser } = require('../middleware/auth');

// --- DEBUGGING STEP 2 ---
// Check the function itself
console.log('Is processPayment a function?', typeof processPayment);
// This should log: 'function'
// If it logs 'undefined', the import failed.

// If processPayment is not a function, the next line will crash the server
if (typeof processPayment !== 'function') {
  throw new Error("FATAL: processPayment is not a function! Check for circular dependencies or file path errors.");
}

router.route('/payment/process').post(isAuthenticatedUser, processPayment);

module.exports = router;