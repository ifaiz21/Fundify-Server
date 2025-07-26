// controllers/contactController.js

const ContactUs = require('../models/Contactus'); 
const Notification = require('../models/Notification');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Email transporter setup
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Yeh ek function hai jo saara kaam karega
exports.submitContactForm = async (req, res) => {
    try {
        const { name, email, issue, subject, message } = req.body;

        // Validation
        if (!name || !email || !issue || !subject || !message) {
            return res.status(400).json({ message: 'All fields are required.' });
        }

        // 1. Contact request ko database mein save karein
        const newContactRequest = new ContactUs({ name, email, issue, subject, message, status: 'New' });
        await newContactRequest.save();

        // 2. User ko acknowledgment email bhejein
        const logoUrl = `${process.env.SERVER_URL || 'http://localhost:5000'}/Images/fundify-transparent-logo.png`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Fundify: We received your support request!',
            html: `
                <p>Hello <strong>${name}</strong>,</p>
                <p>We have successfully received your request regarding "${subject}".</p>
                <p>Our team will get back to you within 2-3 business days.</p>
                <br>
                <p>Thank you for contacting <strong>FUNDIFY</strong>!</p>
                <p>Regards,<br>Fundify Support Team</p>
                <br>
                <img src="${logoUrl}" alt="Fundify Logo" style="width: 100px; height: auto;">
            `
        });
        
        // 3. Fundify support team ko email bhejein
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Admin email
            subject: `New Support Request: ${subject} from ${name}`,
            html: `
                <p>New support request details:</p>
                <ul>
                    <li><strong>Name:</strong> ${name}</li>
                    <li><strong>Email:</strong> ${email}</li>
                    <li><strong>Issue Type:</strong> ${issue}</li>
                    <li><strong>Subject:</strong> ${subject}</li>
                    <li><strong>Message:</strong><br>${message}</li>
                </ul>
            `
        });

        // 4. Agar user logged-in hai to usay in-app notification bhejein
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(" ")[1];
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id;
                
                const newNotification = new Notification({
                    user: userId, 
                    message: "Your request has been received. Our team will respond within 2-3 days. Thanks!",
                });
                await newNotification.save();
            } catch (err) {
                console.log("Could not send in-app notification (User might be a guest or token is invalid):", err.message);
            }
        }

        // 5. Frontend ko success response bhejein
        res.status(201).json({ message: 'Support request submitted successfully!' });

    } catch (err) {
        console.error('Error in submitContactForm:', err);
        res.status(500).json({ message: 'Failed to submit support request.', error: err.message });
    }
};
