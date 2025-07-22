const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/auth');

// Logged-in user ke notifications get karein
router.get('/', authMiddleware(), notificationController.getNotifications);

// Logged-in user ke notifications ko read mark karein
router.post('/read', authMiddleware(), notificationController.markNotificationsAsRead);

module.exports = router;