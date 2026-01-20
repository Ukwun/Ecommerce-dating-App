const express = require('express');
const controllers = require('../controllers/userController.js');
const { registerUser, loginUser, forgotPassword, resetPassword } = controllers;
const User = require('../models/User');
const { protect } = require('../middleware/auth');

console.log('✅ Loaded controllers:', Object.keys(controllers));
console.log('✅ resetPassword type:', typeof resetPassword);

const router = express.Router();

// ✅ Register route
router.post('/user-registration', registerUser);

// ✅ Login route
router.post('/login', loginUser);

// ✅ Forgot Password
router.post('/forgot-password', forgotPassword);

// ✅ Reset Password
router.put('/reset-password/:resetToken', resetPassword);

// ✅ Update User Details (Avatar, Name)
router.put('/update-details', protect, async (req, res) => {
  try {
    const { name, avatar } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Boost Profile
router.post('/boost-profile', protect, async (req, res) => {
  try {
    // Logic: Set boostExpiresAt to 30 minutes from now
    const boostDuration = 30 * 60 * 1000; // 30 minutes
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { boostExpiresAt: new Date(Date.now() + boostDuration) },
      { new: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile boosted successfully for 30 minutes!',
      user
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Subscribe to Premium
router.post('/subscribe', protect, async (req, res) => {
  try {
    // Logic: Set isPremium to true and set expiry date based on plan
    // For demo purposes, we'll just set it to true for 30 days
    const subscriptionDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        isPremium: true,
        subscriptionExpiresAt: new Date(Date.now() + subscriptionDuration)
      },
      { new: true }
    ).select('-password');

    res.json({ success: true, message: 'Subscribed to Premium!', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
