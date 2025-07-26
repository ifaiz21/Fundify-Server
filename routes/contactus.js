// routes/contactus.js

const express = require('express');
const router = express.Router();

const { submitContactForm } = require('../controllers/contactusController');

router.route('/').post(submitContactForm);

module.exports = router;