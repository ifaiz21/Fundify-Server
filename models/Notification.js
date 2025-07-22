const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // Yeh notification kis user ke liye hai
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Notification ka message
    message: {
        type: String,
        required: true
    },
    // Kya user ne isse parh liya hai?
    isRead: {
        type: Boolean,
        default: false
    },
    // Optional link (e.g., campaign page ka link)
    link: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Index banayein taake user ki notifications tezi se fetch ho sakein
notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);