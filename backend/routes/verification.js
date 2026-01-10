const express = require('express');
const router = express.Router();
const DatingProfile = require('../models/DatingProfile');
const auth = require('../middleware/auth');
const { compareFaces } = require('../utils/faceRecognition');
const { sendEmail } = require('../utils/emailService');
const User = require('../models/User'); // Ensure you have this model

// POST /dating/api/verification/enable
// Enable 2FA and save the reference selfie
router.post('/verification/enable', auth, async (req, res) => {
  try {
    const { photoUrl } = req.body;
    
    const profile = await DatingProfile.findOneAndUpdate(
      { userId: req.user.id },
      { 
        verificationPhotoUrl: photoUrl,
        isTwoFactorEnabled: true 
      },
      { new: true }
    );
    res.json({ message: '2FA enabled', profile });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /dating/api/verification/disable
// Disable 2FA
router.post('/verification/disable', auth, async (req, res) => {
  try {
    const profile = await DatingProfile.findOneAndUpdate(
      { userId: req.user.id },
      { isTwoFactorEnabled: false },
      { new: true }
    );
    res.json({ message: '2FA disabled', profile });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /dating/api/verification/verify-login
// Compare live selfie with stored verification photo
router.post('/verification/verify-login', auth, async (req, res) => {
  try {
    const { livePhotoUrl } = req.body;
    
    const profile = await DatingProfile.findOne({ userId: req.user.id });
    
    if (!profile || !profile.isTwoFactorEnabled || !profile.verificationPhotoUrl) {
      return res.status(400).json({ message: '2FA not enabled or invalid profile' });
    }

    const isMatch = await compareFaces(profile.verificationPhotoUrl, livePhotoUrl);

    if (isMatch) {
      res.json({ message: 'Identity verified', verified: true });
    } else {
      res.status(401).json({ message: 'Face verification failed', verified: false });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error during verification' });
  }
});

// POST /dating/api/verification/forgot
// Initiate 2FA reset flow (e.g. send email)
router.post('/verification/forgot', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.email) {
      return res.status(400).json({ message: 'User email not found' });
    }

    // In a real app, generate a crypto token here
    const resetLink = `http://your-app-url/reset-2fa?userId=${req.user.id}`;
    
    await sendEmail(
      user.email,
      'Reset 2-Step Verification',
      `You requested to reset your 2-step verification. Click here: ${resetLink}`
    );
    
    res.json({ message: 'Reset link sent to your registered email address.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;