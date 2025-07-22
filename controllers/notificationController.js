const Notification = require('../models/Notification');

// User ke saare notifications fetch karein
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ userId: req.user.id })
            .sort({ createdAt: -1 }); // Sabse nayi notification sabse upar

        const unreadCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });

        res.status(200).json({
            success: true,
            notifications,
            unreadCount
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch notifications", error: error.message });
    }
};

// User ke saare unread notifications ko 'read' mark karein
exports.markNotificationsAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user.id, isRead: false },
            { $set: { isRead: true } }
        );
        res.status(200).json({ success: true, message: "Notifications marked as read." });
    } catch (error) {
        res.status(500).json({ message: "Failed to update notifications", error: error.message });
    }
};