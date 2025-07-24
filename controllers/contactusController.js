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
        const token = req.headers.authorization?.split(" ")[1];
        if (token) {
            try {
                // Token se user ID nikalein
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id;
                
                await new Notification({
                    userId: userId,
                    message: "Your contact request has been received. We will respond within 1-2 working days.",
                }).save();

            } catch (err) {
                console.log("Could not send notification to user: Invalid token or user not logged in.");
            }
        }
        // --- NOTIFICATION LOGIC END ---

        res.status(201).json({ message: 'Your message has been received successfully!' });

    } catch (err) {
        console.error('Contact form submission error:', err);
        res.status(500).json({ message: 'Failed to submit message', error: err.message });
    }
};
