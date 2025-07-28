// server/controllers/donationController.js
const Donation = require('../models/Donation');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Notification = require('../models/Notification');
const mongoose = require('mongoose');

// --- THIS FUNCTION HAS BEEN REPLACED ---
// Create a new donation and update the campaign atomically after successful payment
exports.createDonation = async (req, res) => {
    // Transaction session shuru karein taake data aadhay adhoore save na ho
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { amount, frequency, donationType, campaignId, paymentInfo } = req.body;
        const userId = req.user.id;

        // Step 1: Campaign find karein taake humein owner ki ID mil sake notification ke liye
        const campaign = await Campaign.findById(campaignId).session(session);
        if (!campaign) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Campaign not found" });
        }

        // Step 2: Nayi donation ka record banayein
        const newDonation = new Donation({
            userId,
            campaignId,
            amount: Number(amount),
            frequency,
            donationType,
            status: 'completed',
            transactionId: paymentInfo.id, // Assuming paymentInfo contains the ID
        });
        await newDonation.save({ session });

        // Step 3: Campaign ko atomically update karein (Yeh naya aur sahi tareeka hai)
        // Note: Yahan 'raisedAmount' istemal kiya gaya hai. Agar aapke schema mein 'raised' hai to usay istemal karein.
        await Campaign.findByIdAndUpdate(
            campaignId,
            { 
                $inc: { 
                    raisedAmount: newDonation.amount, 
                    totalBackers: 1 
                } 
            },
            { session } // Transaction session pass karein
        );

        // Step 4: User ka 'totalDonated' update karein
        await User.findByIdAndUpdate(
            userId,
            { $inc: { totalDonated: newDonation.amount } },
            { session }
        );

        // Step 5: Campaign ke owner ko notification bhejein
        if (campaign.creator.toString() !== userId.toString()) {
            await new Notification({
                userId: campaign.creator, // Campaign owner ki ID
                message: `You received a new donation of PKR ${newDonation.amount.toLocaleString()} on your campaign '${campaign.title}'.`,
                link: `/ProjectView?id=${campaign._id}`
            }).save({ session });
        }

        // Agar sab theek hai to transaction ko commit karein
        await session.commitTransaction();
        session.endSession();

        res.status(201).json({ 
            success: true, 
            message: "Donation recorded and campaign updated successfully",
            donation: newDonation 
        });

    } catch (error) {
        // Agar koi bhi error aye to saari changes ko undo (abort) kar dein
        await session.abortTransaction();
        session.endSession();
        console.error("Donation transaction error:", error);
        res.status(500).json({ message: "Server error during donation process.", error: error.message });
    }
};

// --- ALL OTHER FUNCTIONS REMAIN THE SAME ---

// Get donation by ID (optional, for history or verification)
exports.getDonationById = async (req, res) => {
    try {
        const donation = await Donation.findById(req.params.id);
        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }
        if (req.user && donation.userId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access forbidden' });
        }
        res.status(200).json(donation);
    } catch (err) {
        console.error('Get donation by ID error:', err);
        res.status(500).json({ message: 'Failed to retrieve donation', error: err.message });
    }
};

// Update donation status (This function is no longer used by the new Stripe flow but is kept for other potential uses)
exports.updateDonationStatus = async (req, res) => {
    try {
        const { status, transactionId } = req.body;
        const donation = await Donation.findById(req.params.id);

        if (!donation) {
            return res.status(404).json({ message: 'Donation not found' });
        }

        if (status && !['pending', 'completed', 'failed', 'refunded'].includes(status)) {
            return res.status(400).json({ message: 'Invalid donation status.' });
        }

        const oldStatus = donation.status;
        donation.status = status || donation.status;
        if (transactionId) {
            donation.transactionId = transactionId;
        }
        donation.updatedAt = Date.now();
        await donation.save();

        if (donation.status === 'completed' && oldStatus !== 'completed') {
            if (donation.campaignId) {
                const campaign = await Campaign.findById(donation.campaignId);
                if (campaign) {
                    campaign.raised = (campaign.raised || 0) + donation.amount;
                    campaign.totalBackers = (campaign.totalBackers || 0) + 1;
                    await campaign.save();
                    console.log(`Campaign ${campaign.title} raised amount updated by ${donation.amount} and totalBackers incremented to ${campaign.totalBackers}`);
                }
            }
            await User.findByIdAndUpdate(
                donation.userId,
                { $inc: { backedCampaigns: 1, totalDonated: donation.amount } },
                { new: true }
            );
        }

        res.status(200).json({ message: 'Donation status updated successfully', donation });
    } catch (err) {
        console.error('Update donation status error:', err);
        res.status(500).json({ message: 'Failed to update donation status', error: err.message });
    }
};

// Get all donations (admin only, or for a specific user)
exports.getAllDonations = async (req, res) => {
    try {
        let query = {};
        if (req.user && req.user.role !== 'admin') {
            query.userId = req.user.id;
        }
        const donations = await Donation.find(query).populate('userId', 'name email').populate('campaignId', 'title');
        res.status(200).json(donations);
    } catch (err) {
        console.error('Get all donations error:', err);
        res.status(500).json({ message: 'Failed to retrieve donations', error: err.message });
    }
};

// NEW: Get recent donations for a specific campaign
exports.getRecentDonationsForCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const limit = parseInt(req.query.limit) || 3;

        const donations = await Donation.find({ campaignId, status: 'completed' })
            .populate('userId', 'name')
            .sort({ createdAt: -1 })
            .limit(limit);

        const totalBackers = await Donation.distinct('userId', { campaignId, status: 'completed' }).countDocuments();

        const transformedDonations = donations.map(d => ({
            name: d.honorOf || (d.userId ? d.userId.name : 'Anonymous'),
            amount: d.amount,
        }));

        res.status(200).json({
            recentDonors: transformedDonations,
            totalBackers: totalBackers,
        });

    } catch (err) {
        console.error('Get recent donations for campaign error:', err);
        res.status(500).json({ message: 'Failed to retrieve recent donations', error: err.message });
    }
};
// Get all donations for the currently authenticated user
exports.getMyDonations = async (req, res) => {
    try {
        const userId = req.user.id; // User ID auth middleware se aayegi

        const donations = await Donation.find({ userId: userId })
            .populate({
                path: 'campaignId',
                select: 'title mediaUrls' // Campaign se sirf title aur mediaUrls lein
            })
            .sort({ createdAt: -1 }); // Sabse nayi donation sabse upar

        res.status(200).json({
            success: true,
            donations,
        });
    } catch (error) {
        console.error("Error fetching user's donations:", error);
        res.status(500).json({ message: "Failed to retrieve your donations.", error: error.message });
    }
};