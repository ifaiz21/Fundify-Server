// server/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
const path = require('path');
const fs = require('fs');
const http = require('http'); // <-- Step 1: HTTP module import karein
const { Server } = require("socket.io"); // <-- Step 1: Socket.IO Server import karein

// Import routes
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const campaignRoutes = require('./routes/campaigns');
const userRoutes = require('./routes/users');
const contactusRoutes = require('./routes/contactus');
const donationsRoutes = require('./routes/donations');
const campaignUpdatesRoutes = require('./routes/campaignUpdates');
const newsletterRoutes = require('./routes/newsletter');
const kycRoutes = require('./routes/kycRoutes');
const paymentRoute = require('./routes/paymentRoute');
const notificationRoutes = require('./routes/notificationRoutes');

const mongoURI = process.env.MONGO_URI;

dns.setDefaultResultOrder('ipv4first');

const app = express();
const PORT = process.env.PORT || 5000;

// --- CORS Configuration (Bohat Zaroori) ---
// Yahan apne frontend ka URL daalein. Agar Vercel/Netlify par hai to woh URL.
const corsOptions = {
    origin: ["http://localhost:3000", "https://fundify.up.railway.app/"], // <-- APNA FRONTEND URL YAHAN DAALEIN
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
};

// Middleware
app.use(cors(corsOptions)); // <-- Updated CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// --- Step 2: Express app se HTTP server banayein ---
const server = http.createServer(app);


// --- Step 3: Socket.IO ko HTTP server se jorein ---
const io = new Server(server, {
    cors: corsOptions // Wahi CORS options yahan bhi pass karein
});

// --- Step 4: 'io' object ko har request mein available karwayein ---
// Is se aapke controllers (e.g., donationController) `req.io` ke zariye events emit kar sakenge
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Socket.IO connection ka event listener
io.on('connection', (socket) => {
    console.log('✅ A user connected via Socket.IO:', socket.id);

    socket.on('disconnect', () => {
        console.log('❌ User disconnected:', socket.id);
    });
});


// Static file serving
const publicUploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(publicUploadsDir)) {
    fs.mkdirSync(publicUploadsDir, { recursive: true });
}
app.use('/uploads', express.static(publicUploadsDir));
app.use(express.static(path.join(__dirname, 'public')));


// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contactus', contactusRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/campaigns-updates', campaignUpdatesRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/kyc', kycRoutes);
app.use("/api/payment", paymentRoute);
app.use('/api/notifications', notificationRoutes);

// Test route
app.get("/", (req, res) => {
    res.status(200).json({ message: "Server is working" })
});

// KYC uploads directory
const kycUploadDir = path.join(__dirname, 'uploads', 'kyc');
if (!fs.existsSync(kycUploadDir)) {
    fs.mkdirSync(kycUploadDir, { recursive: true });
    console.log(`Created directory: ${kycUploadDir}`);
};

// Catch-all for undefined routes
app.use((req, res, next) => {
    res.status(404).json({ message: 'API Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something broke on the server!', error: err.message });
});


// Connect MongoDB and Start Server
console.log('Attempting to connect with URI:', mongoURI);
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log("MongoDB connected");
    // --- Step 5: `app.listen` ke bajaye `server.listen` istemal karein ---
    server.listen(PORT, () => console.log(`🚀 Server with Socket.IO running on port ${PORT}`));
})
.catch(err => console.error("MongoDB connection error:", err));
