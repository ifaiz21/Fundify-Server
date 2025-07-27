// server/controllers/kycController.js
const KYCApplication = require('../models/KYCApplication'); // Model ka naam theek karein
const User = require('../models/User');
const Notification = require('../models/Notification');

// Helper function to send errors
const sendErrorResponse = (res, statusCode, message, errorDetails) => {
    console.error(message, errorDetails);
    res.status(statusCode).json({ message, error: errorDetails ? errorDetails.message : 'Unknown error' });
};

// Function to get all KYC applications (for admin)
const getKYCApplications = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return sendErrorResponse(res, 403, 'Access forbidden: Only administrators can view KYC applications.');
        }
        const { status } = req.query;
        let query = {};
        if (status) {
            query.status = status;
        }
        const kycApplications = await KYCApplication.find(query)
            .select('+documentImages +livenessImage')
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        const total = await KYCApplication.countDocuments();
        const approved = await KYCApplication.countDocuments({ status: 'Approved' });
        const rejected = await KYCApplication.countDocuments({ status: 'Rejected' });
        const pending = await KYCApplication.countDocuments({ status: 'Pending Review' });

        res.status(200).json({
            kycApplications,
            stats: { total, approved, rejected, pending }
        });
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to retrieve KYC applications.', error);
    }
};

// Function to approve a KYC application
const approveKYCApplication = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return sendErrorResponse(res, 403, 'Access forbidden: Only administrators can approve KYC applications.');
        }
        const { userId } = req.params;
        const kycApplication = await KYCApplication.findOneAndUpdate(
            { userId: userId, status: 'Pending Review' },
            { $set: { status: 'Approved', adminComments: '' } },
            { new: true }
        );
        if (!kycApplication) {
            return sendErrorResponse(res, 404, 'Pending KYC application not found for this user, or already processed.');
        }
        await User.findByIdAndUpdate(userId, { kycVerified: true, kycSubmitted: true, kycStatus: 'Approved' });
        await new Notification({
            userId: userId,
            message: "Congratulations! Your KYC application has been approved.",
            link: '/user-profile' // Link to profile page
        }).save();
        res.status(200).json({ message: 'KYC application approved successfully.', kycApplication });
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to approve KYC application.', error);
    }
};

// Function to reject a KYC application
const rejectKYCApplication = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return sendErrorResponse(res, 403, 'Access forbidden: Only administrators can reject KYC applications.');
        }
        const { userId } = req.params;
        const { adminComments } = req.body;
        if (!adminComments || adminComments.trim() === '') {
            return sendErrorResponse(res, 400, 'Admin comments are required when rejecting a KYC application.');
        }
        const kycApplication = await KYCApplication.findOneAndUpdate(
            { userId: userId, status: 'Pending Review' },
            { $set: { status: 'Rejected', adminComments: adminComments.trim() } },
            { new: true }
        );
        if (!kycApplication) {
            return sendErrorResponse(res, 404, 'Pending KYC application not found for this user, or already processed.');
        }
        await User.findByIdAndUpdate(userId, { kycVerified: false, kycSubmitted: true, kycStatus: 'Rejected' });
        await new Notification({
            userId: userId,
            message: `Your KYC application was rejected. Reason: ${adminComments.trim()}`,
            link: '/kyc-form' // Link back to KYC form
        }).save();
        res.status(200).json({ message: 'KYC application rejected successfully.', kycApplication });
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to reject KYC application.', error);
    }
};

// --- THEEK KIYA HUA SUBMIT FUNCTION ---
const submitKYCApplication = async (req, res) => {
    try {
        // --- DEBUGGING KE LIYE NAYI LINES ---
        console.log('--- New KYC Submission ---');
        console.log('Request Body (Text Data):', req.body);
        console.log('Uploaded Files (from Multer):', req.files);
        console.log('Authenticated User:', req.user);
        // --- END DEBUGGING LINES ---

        const { fullName, dateOfBirth, address, documentNumber, documentType, email, phoneNumber } = req.body;
        
        // req.files se files hasil karein
        const kycDocuments = req.files['kycDocuments'];
        const livenessImage = req.files['livenessImage'] ? req.files['livenessImage'][0] : null;

        // Validation
        if (!fullName || !documentNumber || !kycDocuments || kycDocuments.length < 2 || !livenessImage) {
            console.error('Validation Failed:', { fullName, documentNumber, kycDocuments, livenessImage });
            return res.status(400).json({ message: 'Please provide all required information and documents.' });
        }

        const existingKyc = await KYCApplication.findOne({ userId: req.user.id });
        if (existingKyc) {
            if (existingKyc.status === 'Pending Review' || existingKyc.status === 'Approved') {
                return res.status(400).json({ message: 'You already have an active or approved KYC request.' });
            }
            // Agar rejected hai to update karein (yeh logic pehle se theek hai)
            // ...
        }

        // Files ke paths nikal kar save karein
        const documentPaths = kycDocuments.map(file => file.path);
        const livenessImagePath = livenessImage.path;

        console.log('Paths to be saved:', { documentPaths, livenessImagePath }); // Check karein ke paths sahi hain

        const newKyc = new KYCApplication({
            userId: req.user.id,
            fullName,
            dateOfBirth,
            address,
            documentType,
            documentNumber,
            email,
            phoneNumber,
            documentImages: documentPaths, // Yahan save karein
            livenessImage: livenessImagePath, // Yahan save karein
            status: 'Pending Review',
        });
        await newKyc.save();

        await User.findByIdAndUpdate(req.user.id, { kycStatus: 'Pending Review' });
        res.status(201).json({ message: 'KYC application submitted successfully. It is now under review.' });

    } catch (error) {
        sendErrorResponse(res, 500, 'Server error during KYC submission.', error);
    }
};



// Function to get authenticated user's own KYC application details
const getMyKYCApplication = async (req, res) => {
    try {
        const userId = req.user.id;
        const kycApplication = await KYCApplication.findOne({ userId: userId });
        if (!kycApplication) {
            return res.status(200).json({ message: 'No KYC application submitted yet.', kycApplication: null });
        }
        res.status(200).json({ message: 'KYC application found.', kycApplication });
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to retrieve user\'s KYC application.', error);
    }
};

// Function to delete a KYC application
const deleteKYCApplication = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return sendErrorResponse(res, 403, 'Access forbidden: Only administrators can delete KYC applications.');
        }
        const { userId } = req.params;
        const kycApplication = await KYCApplication.findOneAndDelete({ userId: userId });
        if (!kycApplication) {
            return sendErrorResponse(res, 404, 'KYC application not found for this user.');
        }
        await User.findByIdAndUpdate(userId, {
            kycSubmitted: false,
            kycVerified: false,
            kycStatus: 'Not Submitted'
        });
        res.status(200).json({ message: 'KYC application deleted successfully and user KYC status reset.' });
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to delete KYC application.', error);
    }
};

module.exports = {
    getKYCApplications,
    approveKYCApplication,
    rejectKYCApplication,
    submitKYCApplication,
    getMyKYCApplication,
    deleteKYCApplication
};
