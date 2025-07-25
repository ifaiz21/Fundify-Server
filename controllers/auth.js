const User = require('../models/User');
const jwt = 'jsonwebtoken';
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ... (aapka registerUser aur baaki functions)

exports.loginUser = async (req, res) => {
    // ... (aapka login function)
};

// --- YEH FUNCTION REPLACE KAREIN ---
exports.googleLogin = async (req, res) => {
    const { token } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const { name, email, picture } = ticket.getPayload();

        let user = await User.findOne({ email });

        // Agar user mojood nahin hai, to naya user banayein
        if (!user) {
            user = await User.create({
                name,
                email,
                password: 'google_user_password_placeholder', // Ek placeholder password
                profilePictureUrl: picture, // Google se aane wali picture save karein
                isGoogleUser: true,
            });
        }

        // Token banayein
        const payload = { id: user._id, role: user.role };
        const jwtToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({
            message: 'Login successful',
            token: jwtToken,
            role: user.role,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                profilePictureUrl: user.profilePictureUrl, // Profile picture URL response mein bhejein
                kycStatus: user.kycStatus
            }
        });

    } catch (error) {
        console.error("Google token verification failed:", error);
        return res.status(401).json({ message: "Invalid Google token." });
    }
};