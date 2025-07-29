// controllers/walletController.js
const Wallet = require('../models/walletModel');
const Transaction = require('../models/transactionModel'); // Aapko transaction model bhi banana parega

// Wallet ke stats fetch karne ke liye
exports.getWalletStats = async (req, res) => {
    try {
        const wallet = await Wallet.findOne({ name: 'platformWallet' });
        // Yahan aapko transactions bhi fetch karni hongi
        const transactions = await Transaction.find().sort({ createdAt: -1 }).limit(20);

        res.status(200).json({
            stats: wallet,
            transactions: transactions
        });
    } catch (error) {
        res.status(500).json({ message: "Wallet data fetch karne mein masla hua." });
    }
};

// Funds transfer karne ke liye
exports.transferFunds = async (req, res) => {
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Amount theek nahi hai." });
    }

    try {
        const wallet = await Wallet.findOne({ name: 'platformWallet' });

        if (wallet.availableFunds < amount) {
            return res.status(400).json({ message: "Wallet mein itne funds nahi hain." });
        }

        // Wallet se amount kam karein
        wallet.availableFunds -= amount;
        wallet.totalWithdrawals += amount;
        
        await wallet.save();

        // Nayi transaction record karein (aapko iske liye model banana hoga)
        // const newTransaction = new Transaction({ type: 'Withdrawal', amount, description, status: 'Complete' });
        // await newTransaction.save();
        
        // Frontend ko update karein
        req.io.emit('walletUpdated', wallet);

        res.status(200).json({ message: "Funds successfully transfer ho gaye.", wallet });

    } catch (error) {
        res.status(500).json({ message: "Funds transfer karne mein masla hua." });
    }
};