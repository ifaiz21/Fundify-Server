// controllers/contactController.js

const ContactUs = require('../models/Contactus'); 
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');

exports.submitContactForm = async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        const newSubmission = new ContactUs({ name, email, message });
        await newSubmission.save();

        // --- NOTIFICATION LOGIC START ---
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(" ")[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id; 
                
                const newNotification = new Notification({
                    user: userId, 
                    message: "Your request has been recieved. Our team will respond you in 2-3 days. Thanks!",
                });
                await newNotification.save();

            } catch (err) {
                console.log("Could not send notification (Invalid Token):", err.message);
            }
        }

        res.status(201).json({ message: 'Your message has been sent successfully!' });

    } catch (err) {
        console.error('Contact form submission error:', err);
        res.status(500).json({ message: 'Server error, message can not be submit.', error: err.message });
    }
};
