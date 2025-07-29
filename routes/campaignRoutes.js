const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
//const { protect, admin } = require('../middleware/authMiddleware'); // <-- YEH LINE ADD KAREIN

// Create a new campaign
router.post('/', campaignController.createCampaign);

// Get a campaign by ID
router.get('/:id', campaignController.getCampaignById);

// Update campaign (general fields)
router.put('/:id', campaignController.updateCampaign);

// Update only story
router.put('/:id/story', campaignController.updateCampaignStory);

// Delete a campaign
router.delete('/:id', campaignController.deleteCampaign);

// Submit a campaign
router.put('/:id/submit', campaignController.submitCampaign);

//router.put('/:id/activate', protect, admin, campaignController.activateCampaign);

module.exports = router;
