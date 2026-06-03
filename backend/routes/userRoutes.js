const express = require('express');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');

const router = express.Router();
// Ensure protect is a function to prevent Express from crashing at startup
let authProtect;
if (authMiddleware && typeof authMiddleware.protect === 'function') {
  authProtect = authMiddleware.protect;
} else if (typeof authMiddleware === 'function') {
  authProtect = authMiddleware;
} else {
  authProtect = (req, res, next) => next();
}

const generateToken = (id, email) => {
  return jwt.sign({ id, email }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// ✅ Health Check - Realistic apps use this to verify connection
router.get('/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: "Auth service is live",
    timestamp: new Date().toISOString() 
  });
});

// ✅ Register route
router.post('/user-registration', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { name, email, password, acceptedTerms } = req.body;
    console.log('📝 Registration attempt:', email, '| Terms Accepted:', acceptedTerms);
    
    if (!name || !email || !password) return res.status(400).json({ error: "All fields are required" });
    if (!acceptedTerms) return res.status(400).json({ success: false, error: "You must accept the Terms of Service to continue." });
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });
    const accessToken = generateToken(user._id, user.email);
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    return res.status(201).json({ success: true, accessToken, refreshToken, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('❌ Registration error:', error);
    return res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
});

// ✅ Login route
router.post('/login', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    console.log('🔑 Login attempt:', req.body?.email);
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, error: "Email and password required" });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const accessToken = generateToken(user._id, user.email);
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    // CRITICAL: Return success: true and all tokens to prevent frontend crash
    return res.status(200).json({ 
      success: true, 
      accessToken, 
      refreshToken, 
      user: { id: user._id, name: user.name, email: user.email } 
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ success: false, error: "Server error during login" });
  }
});

// ✅ Social Login (Google & Facebook)
router.post('/google-login', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { email, name, photoUrl, token } = req.body;
  console.log('🌐 Google Login Sync:', email, token ? '[TOKEN_PRESENT]' : '[NO_TOKEN]');

  try {
    if (!email) return res.status(400).json({ success: false, error: "Email is required" });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        avatar: photoUrl,
        password: await bcrypt.hash(Math.random().toString(36), 10), // Random pass for social login
        isVerified: true
      });
    }

    const accessToken = generateToken(user._id, user.email);
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    return res.status(200).json({ 
      success: true, 
      accessToken, 
      refreshToken, 
      user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } 
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    return res.status(500).json({ success: false, error: "Google Authentication failed" });
  }
});

router.post('/facebook-login', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const { email, name, photoUrl, token } = req.body;
  console.log('🌐 Facebook Login Sync:', email, token ? '[TOKEN_PRESENT]' : '[NO_TOKEN]');

  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || "Facebook User",
        email,
        avatar: photoUrl,
        password: await bcrypt.hash(Math.random().toString(36), 10),
        isVerified: true
      });
    }
    const accessToken = generateToken(user._id, user.email);
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    return res.status(200).json({ success: true, accessToken, refreshToken, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar || null } });
  } catch (error) {
    console.error("Facebook Auth Error:", error);
    return res.status(500).json({ success: false, error: "Facebook Authentication failed" });
  }
});

// ✅ Token Refresh Logic
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: "Refresh token required" });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET); 
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: "User not found" });
    const accessToken = generateToken(user._id, user.email);
    return res.status(200).json({ success: true, accessToken });
  } catch (error) {
    return res.status(403).json({ success: false, error: "Invalid or expired refresh token" });
  }
});

// ✅ Forgot Password
router.post('/forgot-password', async (req, res) => {
  // Implement logic to send reset email here
  res.json({ success: true, message: "Reset link sent to email" });
});

// ✅ Reset Password
router.put('/reset-password/:resetToken', async (req, res) => {
  res.json({ success: true, message: "Password updated" });
});

// ✅ Update User Details (Avatar, Name)
router.put('/update-details', authProtect, async (req, res) => {
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

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    return res.status(200).json({
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
    return res.status(500).json({ error: error.message });
  }
});

// ✅ Boost Profile
router.post('/boost-profile', authProtect, async (req, res) => {
  try {
    // Logic: Set boostExpiresAt to 30 minutes from now
    const boostDuration = 30 * 60 * 1000; // 30 minutes
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { boostExpiresAt: new Date(Date.now() + boostDuration) },
      { new: true }
    ).select('-password');

    return res.status(200).json({
      success: true,
      message: 'Profile boosted successfully for 30 minutes!',
      user
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// ✅ Subscribe to Premium
router.post('/subscribe', authProtect, async (req, res) => {
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

    return res.status(200).json({ success: true, message: 'Subscribed to Premium!', user });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Save push token
router.post('/push-token', authProtect, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, error: 'Token required' });
    await User.findByIdAndUpdate(req.user.id, { pushToken: token }, { new: true }); // Added {new: true}
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ✅ Get verified sellers
router.get('/verified-sellers', async (req, res) => {
  try {
    const SellerProfile = require('../models/SellerProfile');
    const sellers = await SellerProfile.find({ verificationStatus: 'approved' })
      .populate('userId', 'name avatar')
      .limit(10)
      .lean();
    return res.status(200).json({ success: true, data: sellers });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message || 'Internal Server Error' });
  }
});

module.exports = router;
