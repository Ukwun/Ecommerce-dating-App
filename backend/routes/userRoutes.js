const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const AdminUser = require('../models/AdminUser');
const SellerProfile = require('../models/SellerProfile');
const authMiddleware = require('../middleware/auth');
const sendResendEmail = require('../utils/resendEmail');
const { enqueueEmail } = require('../jobs/queue');
const Cart = require('../models/Cart');
const Conversation = require('../models/Conversation');
const DatingProfile = require('../models/DatingProfile');
const Message = require('../models/Message');
const Match = require('../models/Match');
const Swipe = require('../models/Swipe');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const PaymentMethod = require('../models/PaymentMethod');
const Product = require('../models/Product');
const Review = require('../models/Review');
const PushNotification = require('../models/PushNotification');
const ShippingAddress = require('../models/ShippingAddress');
const Subscription = require('../models/Subscription');
const SupportTicket = require('../models/SupportTicket');
const UserActivity = require('../models/UserActivity');
const UploadedAsset = require('../models/UploadedAsset');
const BiometricSession = require('../models/BiometricSession');
const Wishlist = require('../models/Wishlist');

const router = express.Router();
if (!authMiddleware || typeof authMiddleware.protect !== 'function') throw new Error('Authentication middleware is unavailable');
const authProtect = authMiddleware.protect;

const SUPER_ADMIN_EMAIL = (process.env.SUPER_ADMIN_EMAIL || 'Ayodeleogunyemi25@yahoo.co.uk').trim().toLowerCase();
const SUPER_ADMIN_PERMISSIONS = [
  'approve_sellers', 'reject_sellers', 'suspend_sellers', 'view_seller_details',
  'process_returns', 'approve_refunds', 'handle_disputes', 'respond_support_tickets',
  'view_analytics', 'view_reports', 'manage_users', 'manage_admins', 'manage_products',
  'manage_orders', 'manage_payments', 'manage_security', 'view_audit_logs', 'manage_promotions',
];

const ensureConfiguredSuperAdmin = async (user) => {
  if (user.email.toLowerCase() !== SUPER_ADMIN_EMAIL) return;
  await AdminUser.findOneAndUpdate(
    { userId: user._id },
    { $set: { role: 'super_admin', permissions: SUPER_ADMIN_PERMISSIONS, isActive: true, isSuspended: false, adminLevel: 3 } },
    { upsert: true, setDefaultsOnInsert: true }
  );
};

const generateToken = (id, email, authVersion = 0) => {
  return jwt.sign({ id, email, tokenType: 'access', authVersion }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (id, authVersion = 0) => jwt.sign(
  { id, tokenType: 'refresh', authVersion, nonce: crypto.randomUUID() },
  process.env.JWT_SECRET,
  { expiresIn: '30d' }
);

const serializeUser = async (user) => {
  const [admin, seller] = await Promise.all([
    AdminUser.findOne({ userId: user._id, isActive: true }).select('role permissions'),
    SellerProfile.findOne({ userId: user._id }).select('verificationStatus businessName'),
  ]);
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    emailVerified: Boolean(user.emailVerified),
    roles: {
      buyer: true,
      seller: seller ? { status: seller.verificationStatus, businessName: seller.businessName } : null,
      admin: admin ? { role: admin.role, permissions: admin.permissions } : null,
    },
  };
};

const finishSocialLogin = async (provider, identity) => {
  const providerPath = `authProviders.${provider}.id`;
  let user = await User.findOne({ [providerPath]: identity.id, accountStatus: { $ne: 'deleted' } });
  if (!user && identity.emailVerified && identity.email) {
    user = await User.findOne({ email: identity.email.toLowerCase(), accountStatus: { $ne: 'deleted' } });
  }
  if (!user) {
    user = await User.create({
      name: identity.name || identity.email.split('@')[0],
      email: identity.email.toLowerCase(),
      avatar: identity.avatar,
      password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
      emailVerified: Boolean(identity.emailVerified),
      authProviders: { [provider]: { id: identity.id } },
      lastLoginAt: new Date(),
    });
  } else {
    user.set(providerPath, identity.id);
    if (identity.emailVerified) user.emailVerified = true;
    if (!user.avatar && identity.avatar) user.avatar = identity.avatar;
    user.lastLoginAt = new Date();
    await user.save();
  }
  return user;
};

const deleteImageKitAssets = async (fileIds) => {
  if (!process.env.IMAGEKIT_PRIVATE_KEY || fileIds.length === 0) return;
  await Promise.allSettled(fileIds.map(async (fileId) => {
    const response = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.IMAGEKIT_PRIVATE_KEY}:`).toString('base64')}`,
      },
    });
    if (!response.ok && response.status !== 404) throw new Error(`ImageKit deletion failed with ${response.status}`);
  }));
};

const deleteCloudinaryAssets = async (publicIds) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret || publicIds.length === 0) return;

  await Promise.allSettled(publicIds.map(async (publicId) => {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHash('sha1')
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex');
    const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: apiKey, signature });
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!response.ok) throw new Error(`Cloudinary deletion failed with ${response.status}`);
  }));
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "A valid email is required" });
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters and include a letter and number" });
    }
    
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name.trim(), email: normalizedEmail, password: hashedPassword, emailVerified: false });
    await ensureConfiguredSuperAdmin(user);
    const accessToken = generateToken(user._id, user.email);
    const refreshToken = generateRefreshToken(user._id);

    return res.status(201).json({ success: true, accessToken, refreshToken, user: await serializeUser(user) });
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

    const user = await User.findOne({ email: email.trim().toLowerCase(), accountStatus: { $ne: 'deleted' } }).select('+password +authVersion');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }

    const accessToken = generateToken(user._id, user.email, user.authVersion);
    await ensureConfiguredSuperAdmin(user);
    user.lastLoginAt = new Date();
    await user.save();
    const refreshToken = generateRefreshToken(user._id, user.authVersion);
    
    // CRITICAL: Return success: true and all tokens to prevent frontend crash
    return res.status(200).json({ 
      success: true, 
      accessToken, 
      refreshToken, 
      user: await serializeUser(user)
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    return res.status(500).json({ success: false, error: "Server error during login" });
  }
});

// ✅ Google Login
// Return the authenticated account so a mobile session can restore identity
// without repeating the sign-in flow.
router.get('/profile', authProtect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.accountStatus === 'deleted') return res.status(404).json({ success: false, error: 'User not found' });
    return res.json({ success: true, user: await serializeUser(user) });
  } catch (_error) {
    return res.status(500).json({ success: false, error: 'Unable to load profile' });
  }
});

router.post('/google-login', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const idToken = req.body?.idToken || req.body?.token;

  try {
    if (!idToken) return res.status(400).json({ success: false, error: 'Google ID token is required' });
    if (!process.env.GOOGLE_CLIENT_ID && !process.env.GOOGLE_ANDROID_CLIENT_ID && !process.env.GOOGLE_IOS_CLIENT_ID) {
      return res.status(503).json({ success: false, error: 'Google authentication is not configured' });
    }

    const { data: googleUser } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
      params: { id_token: idToken },
      timeout: 10000,
    });
    const allowedAudiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean);
    if (!googleUser?.sub || !googleUser.email || !allowedAudiences.includes(googleUser.aud)) {
      return res.status(401).json({ success: false, error: 'Invalid Google identity token' });
    }

    const user = await finishSocialLogin('google', {
      id: googleUser.sub,
      email: googleUser.email,
      emailVerified: googleUser.email_verified === 'true' || googleUser.email_verified === true,
      name: googleUser.name,
      avatar: googleUser.picture,
    });
    await ensureConfiguredSuperAdmin(user);
    const accessToken = generateToken(user._id, user.email, user.authVersion);
    const refreshToken = generateRefreshToken(user._id, user.authVersion);
    return res.status(200).json({ success: true, accessToken, refreshToken, user: await serializeUser(user) });
  } catch (error) {
    console.error('Google Auth Error:', error.message);
    return res.status(401).json({ success: false, error: 'Google authentication failed' });
  }
});

// Facebook login is handled by the verified social-auth route mounted before this router.
router.post('/facebook-login', async (req, res) => {
  return res.status(503).json({ success: false, error: 'Facebook authentication is not configured' });
});

// ✅ Token Refresh Logic
router.post('/refresh-token', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: "Refresh token required" });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    if (decoded.tokenType !== 'refresh') {
      return res.status(403).json({ success: false, error: "Invalid token type" });
    }
    const user = await User.findById(decoded.id).select('+authVersion');
    if (!user) return res.status(401).json({ error: "User not found" });
    if ((decoded.authVersion ?? 0) !== user.authVersion) return res.status(403).json({ error: "Session has been revoked" });
    const accessToken = generateToken(user._id, user.email, user.authVersion);
    return res.status(200).json({ success: true, accessToken, refreshToken: generateRefreshToken(user._id, user.authVersion) });
  } catch (error) {
    return res.status(403).json({ success: false, error: "Invalid or expired refresh token" });
  }
});

router.patch('/preferences', authProtect, async (req, res) => {
  const allowed = {
    currency: ['NGN', 'USD', 'EUR', 'GBP'],
    language: ['en', 'fr'],
    deliveryOption: ['home', 'station'],
  };
  const updates = {};
  for (const [key, values] of Object.entries(allowed)) {
    if (req.body[key] !== undefined) {
      if (!values.includes(req.body[key])) return res.status(400).json({ success: false, error: `Unsupported ${key}` });
      updates[`preferences.${key}`] = req.body[key];
    }
  }
  const user = await User.findByIdAndUpdate(req.user.id, { $set: updates }, { new: true, runValidators: true }).select('preferences');
  if (!user) return res.status(404).json({ success: false, error: 'User not found' });
  return res.json({ success: true, preferences: user.preferences });
});

// ✅ Forgot Password
router.post('/forgot-password', async (req, res) => {
  const genericResponse = { success: true, message: 'If an active account exists, a reset link has been sent.' };
  try {
    const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return res.status(200).json(genericResponse);

    const user = await User.findOne({ email: normalizedEmail, accountStatus: { $ne: 'deleted' } });
    if (!user) return res.status(200).json(genericResponse);

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    const deepLink = `marketplace://reset-password/${rawToken}`;
    const webBase = process.env.PASSWORD_RESET_BASE_URL?.replace(/\/$/, '');
    const resetLink = webBase ? `${webBase}/reset-password/${rawToken}` : deepLink;
    try {
      const emailPayload = {
        to: user.email,
        subject: 'Reset your BizMingle password',
        text: `Use this link within 15 minutes to reset your password: ${resetLink}`,
        html: `<p>We received a request to reset your BizMingle password.</p><p><a href="${resetLink}">Reset password</a></p><p>This link expires in 15 minutes and can only be used once. If you did not request it, you can ignore this email.</p>`,
        idempotencyKey: `password-reset-${user._id}-${user.resetPasswordExpire.getTime()}`,
      };
      const queued = await enqueueEmail(emailPayload);
      if (!queued) await sendResendEmail(emailPayload);
    } catch (emailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      console.error('Password reset email failed:', emailError.code || emailError.message);
    }
    return res.status(200).json(genericResponse);
  } catch (error) {
    console.error('Password reset request failed:', error.message);
    return res.status(200).json(genericResponse);
  }
});

// ✅ Reset Password
router.put('/reset-password/:resetToken', async (req, res) => {
  try {
    const password = String(req.body?.password || '');
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters and include a letter and number' });
    }
    const tokenHash = crypto.createHash('sha256').update(String(req.params.resetToken)).digest('hex');
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.findOneAndUpdate(
      {
        resetPasswordToken: tokenHash,
        resetPasswordExpire: { $gt: new Date() },
        accountStatus: { $ne: 'deleted' },
      },
      {
        $set: { password: passwordHash },
        $inc: { authVersion: 1 },
        $unset: { resetPasswordToken: 1, resetPasswordExpire: 1 },
      },
      { new: true }
    );
    if (!user) return res.status(400).json({ success: false, error: 'This reset link is invalid or has expired' });
    return res.status(200).json({ success: true, message: 'Password updated. Sign in with your new password.' });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Unable to reset password' });
  }
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
    const currentUser = await User.findById(req.user.id).select('isPremium subscriptionExpiresAt');
    if (!currentUser?.isPremium || !currentUser.subscriptionExpiresAt || currentUser.subscriptionExpiresAt <= new Date()) {
      return res.status(403).json({ error: 'An active premium subscription is required to boost your profile' });
    }
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
  return res.status(409).json({ success: false, error: 'A subscription must be activated through the verified payment flow.' });
});

router.delete('/account', authProtect, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    if (req.body?.confirmation !== 'DELETE') {
      return res.status(400).json({ success: false, error: 'Type DELETE to confirm account deletion' });
    }
    const accountId = req.user.id;
    const ownedAssets = await UploadedAsset.find({ owner: accountId }).select('fileId').lean();
    const datingProfile = await DatingProfile.findOne({ userId: accountId }).select('photos.cloudinaryId').lean();
    const cloudinaryIds = (datingProfile?.photos || []).map((photo) => photo.cloudinaryId).filter(Boolean);
    await session.withTransaction(async () => {
      const user = await User.findById(accountId).select('+authVersion').session(session);
      if (!user || user.accountStatus === 'deleted') {
        const error = new Error('Account not found');
        error.statusCode = 404;
        throw error;
      }

      const deletedEmail = `deleted-${user._id}@deleted.invalid`;
      const deletedPassword = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), 12);
      const deletedAt = new Date();

      await User.updateOne({ _id: accountId }, {
        $set: {
          name: 'Deleted user',
          email: deletedEmail,
          password: deletedPassword,
          avatar: undefined,
          pushToken: undefined,
          location: undefined,
          authProviders: {},
          resetPasswordToken: undefined,
          resetPasswordExpire: undefined,
          accountStatus: 'deleted',
          deletedAt,
        },
        $inc: { authVersion: 1 },
      }, { session });

      await Promise.all([
        SellerProfile.deleteMany({ userId: accountId }, { session }),
        AdminUser.deleteMany({ userId: accountId }, { session }),
        Cart.deleteMany({ user: accountId }, { session }),
        Wishlist.deleteMany({ user: accountId }, { session }),
        ShippingAddress.deleteMany({ userId: accountId }, { session }),
        PaymentMethod.deleteMany({ user: accountId }, { session }),
        Subscription.deleteMany({ user: accountId }, { session }),
        PushNotification.deleteMany({ userId: accountId }, { session }),
        DatingProfile.deleteMany({ userId: accountId }, { session }),
        DatingProfile.updateMany({ blockedUsers: accountId }, { $pull: { blockedUsers: accountId } }, { session }),
        Match.deleteMany({ users: accountId }, { session }),
        Swipe.deleteMany({ $or: [{ from: accountId }, { to: accountId }] }, { session }),
        Message.deleteMany({ $or: [{ sender: accountId }, { recipient: accountId }] }, { session }),
        Conversation.deleteMany({ participants: accountId }, { session }),
        Review.deleteMany({ user: accountId }, { session }),
        SupportTicket.deleteMany({ userId: accountId }, { session }),
        UserActivity.deleteMany({ userId: accountId }, { session }),
        UploadedAsset.deleteMany({ owner: accountId }, { session }),
        BiometricSession.deleteMany({ user: accountId }, { session }),
        Product.updateMany({ seller: accountId }, { $set: { inStock: false, stock: 0, images: [] } }, { session }),
        Order.updateMany({ user: accountId }, { $set: { shippingAddress: { name: 'Deleted user', addressLine1: '', city: '', state: '', postalCode: '', country: '' } } }, { session }),
        Payment.updateMany({ user: accountId }, { $unset: { 'paystack.authorizationUrl': '', 'paystack.authorizationCode': '', 'paystack.email': '' } }, { session }),
      ]);
    });
    await deleteImageKitAssets(ownedAssets.map((asset) => asset.fileId));
    await deleteCloudinaryAssets(cloudinaryIds);
    return res.status(200).json({ success: true, message: 'Account deleted' });
  } catch (error) {
    if (error.statusCode === 404) return res.status(404).json({ success: false, error: error.message });
    console.error('Account deletion failed:', error.message);
    return res.status(500).json({ success: false, error: 'Unable to delete account' });
  } finally {
    await session.endSession();
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
