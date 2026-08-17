const express = require('express');
const router = express.Router();
const DatingProfile = require('../models/DatingProfile');
const { protect } = require('../middleware/auth');
const { configured, createLivenessSession, verifyLivenessSession } = require('../utils/faceRecognition');
const BiometricSession = require('../models/BiometricSession');
const { sendEmail } = require('../utils/emailService');
const User = require('../models/User'); // Ensure you have this model

// POST /dating/api/verification/enable
// Enable 2FA and save the reference selfie
router.post('/verification/enable', protect, async (req, res) => {
  try {
    if (!configured()) {
      return res.status(503).json({ message: 'Biometric verification is temporarily unavailable' });
    }
    const { photoUrl, consent, policyVersion } = req.body;
    if (consent !== true || !policyVersion) {
      return res.status(422).json({ message: 'Explicit biometric consent is required' });
    }
    
    const profile = await DatingProfile.findOneAndUpdate(
      { userId: req.user.id },
      { 
        verificationPhotoUrl: photoUrl,
        isTwoFactorEnabled: true,
        biometricProvider: 'aws_rekognition',
        biometricConsent: { grantedAt: new Date(), policyVersion, revokedAt: null }
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
router.post('/verification/disable', protect, async (req, res) => {
  try {
    const profile = await DatingProfile.findOneAndUpdate(
      { userId: req.user.id },
      { isTwoFactorEnabled: false, 'biometricConsent.revokedAt': new Date(), verificationPhotoUrl: null },
      { new: true }
    );
    res.json({ message: '2FA disabled', profile });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /dating/api/verification/verify-login
// Compare live selfie with stored verification photo
router.post('/verification/verify-login', protect, async (req, res) => {
  res.status(410).json({ message: 'Still-image verification was retired. Use the liveness session flow.' });
});

router.post('/verification/liveness/session', protect, async (req, res) => {
  try {
    if (!configured()) return res.status(503).json({ message: 'Biometric verification is temporarily unavailable' });
    const profile = await DatingProfile.findOne({ userId: req.user.id });
    if (!profile?.isTwoFactorEnabled || !profile.verificationPhotoUrl || profile.biometricConsent?.revokedAt) {
      return res.status(422).json({ message: 'Biometric enrollment and consent are required first' });
    }
    const sessionId = await createLivenessSession(req.user.id);
    await BiometricSession.create({
      user: req.user.id,
      provider: 'aws_rekognition',
      providerSessionId: sessionId,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    res.status(201).json({ success: true, sessionId, region: process.env.AWS_REGION });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/verification/liveness/result', protect, async (req, res) => {
  try {
    const session = await BiometricSession.findOne({
      providerSessionId: req.body.sessionId,
      user: req.user.id,
      status: 'created',
      expiresAt: { $gt: new Date() },
    });
    if (!session) return res.status(404).json({ message: 'Liveness session was not found or expired' });
    const profile = await DatingProfile.findOne({ userId: req.user.id });
    const result = await verifyLivenessSession(session.providerSessionId, profile.verificationPhotoUrl);
    session.status = result.verified ? 'passed' : 'failed';
    session.confidence = result.livenessConfidence;
    if (result.verified) {
      profile.biometricVerifiedAt = new Date();
      profile.verificationScore = Math.max(profile.verificationScore || 0, 90);
      await profile.save();
    }
    await session.save();
    res.status(result.verified ? 200 : 401).json({ success: result.verified, ...result });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /dating/api/verification/forgot
// Initiate 2FA reset flow (e.g. send email)
router.post('/verification/forgot', protect, async (req, res) => {
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
