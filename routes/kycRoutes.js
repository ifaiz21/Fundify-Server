// server/routes/kycRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/auth');

const {
    getKYCApplications,
    approveKYCApplication,
    rejectKYCApplication,
    submitKYCApplication,
    getMyKYCApplication,
    deleteKYCApplication // <-- NEW: Import the delete function
} = require('../controllers/kycController');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Yaqeeni banayein ke 'uploads/kyc' ka folder mojood hai
        cb(null, 'uploads/kyc/');
    },
    filename: function (req, file, cb) {
        // File ka unique naam banayein
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // req.user.id authMiddleware se aana chahiye
        const userId = req.user ? req.user.id : 'guest'; 
        cb(null, userId + '-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Error: File upload only supports JPEG, PNG, or PDF.'));
};
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

// Routes for Admin KYC verification
// GET all KYC applications (for admin dashboard)
router.route('/').get(authMiddleware(['admin']), getKYCApplications);

// Approve a specific KYC application by userId
router.route('/:userId/approve').put(authMiddleware(['admin']), approveKYCApplication);

// Reject a specific KYC application by userId
router.route('/:userId/reject').put(authMiddleware(['admin']), rejectKYCApplication);

// NEW: Delete a specific KYC application by userId
router.route('/admin/delete/:userId').delete(authMiddleware(['admin']), deleteKYCApplication); // ADDED: Admin delete route

// Route for user to submit KYC application
router.route('/submit').post(
    authMiddleware(), // Pehle user ko authenticate karein
    upload.fields([     // Phir files ko handle karein
        { name: 'kycDocuments', maxCount: 2 },
        { name: 'livenessImage', maxCount: 1 }
    ]),
    submitKYCApplication // Aakhir mein controller ko call karein
);
// NEW ROUTE: Get authenticated user's own KYC application details
router.route('/my-application').get(authMiddleware(), getMyKYCApplication); // Protect this route for authenticated users

module.exports = router;