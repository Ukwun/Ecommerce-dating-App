const express = require('express');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminUser = require('../models/AdminUser');
const SellerProfile = require('../models/SellerProfile');
const { protect } = require('../middleware/auth');

const router = express.Router();

const accessTokenFor = (user) => jwt.sign(
  { id: user._id, email: user.email, tokenType: 'access', authVersion: user.authVersion || 0 },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

const refreshTokenFor = (user) => jwt.sign(
  { id: user._id, tokenType: 'refresh', authVersion: user.authVersion || 0, nonce: crypto.randomUUID() },
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

const finishLogin = async (provider, identity) => {
  const providerPath = `authProviders.${provider}.id`;
  let user = await User.findOne({ [providerPath]: identity.id });
  if (!user && identity.emailVerified) user = await User.findOne({ email: identity.email.toLowerCase() });
  if (!user) {
    user = await User.create({
      name: identity.name || identity.email.split('@')[0],
      email: identity.email.toLowerCase(),
      avatar: identity.avatar,
      password: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
      emailVerified: true,
      authProviders: { [provider]: { id: identity.id } },
      lastLoginAt: new Date(),
    });
  } else {
    user.set(providerPath, identity.id);
    user.emailVerified = true;
    if (!user.avatar && identity.avatar) user.avatar = identity.avatar;
    user.lastLoginAt = new Date();
    await user.save();
  }
  return {
    success: true,
    accessToken: accessTokenFor(user),
    refreshToken: refreshTokenFor(user),
    user: await serializeUser(user),
  };
};

router.get('/auth-capabilities', (_req, res) => {
  res.json({
    success: true,
    providers: {
      google: Boolean(process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ANDROID_CLIENT_ID || process.env.GOOGLE_IOS_CLIENT_ID),
      facebook: Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET),
      apple: Boolean(process.env.APPLE_CLIENT_ID),
    },
    passwordRecovery: true,
  });
});

router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ success: true, user: await serializeUser(user) });
});

router.post('/google-login', async (req, res) => {
  try {
    if (!req.body.idToken) return res.status(400).json({ error: 'Google ID token is required' });
    const { data } = await axios.get('https://oauth2.googleapis.com/tokeninfo', { params: { id_token: req.body.idToken }, timeout: 10000 });
    const audiences = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID, process.env.GOOGLE_ANDROID_CLIENT_ID].filter(Boolean);
    if (!audiences.includes(data.aud) || data.email_verified !== 'true') return res.status(401).json({ error: 'Google identity could not be verified' });
    res.json(await finishLogin('google', { id: data.sub, email: data.email, emailVerified: true, name: data.name, avatar: data.picture }));
  } catch (error) {
    console.error('Google authentication failed:', error.message);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

router.post('/facebook-login', async (req, res) => {
  try {
    const token = req.body.accessToken;
    if (!token || !process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) return res.status(503).json({ error: 'Facebook authentication is not configured' });
    const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
    const { data: debug } = await axios.get('https://graph.facebook.com/debug_token', { params: { input_token: token, access_token: appToken }, timeout: 10000 });
    if (!debug?.data?.is_valid || String(debug.data.app_id) !== String(process.env.FACEBOOK_APP_ID)) return res.status(401).json({ error: 'Invalid Facebook token' });
    const { data } = await axios.get('https://graph.facebook.com/me', { params: { fields: 'id,name,email,picture.type(large)', access_token: token }, timeout: 10000 });
    if (!data.email) return res.status(422).json({ error: 'Your Facebook account must provide an email address' });
    res.json(await finishLogin('facebook', { id: data.id, email: data.email, emailVerified: true, name: data.name, avatar: data.picture?.data?.url }));
  } catch (error) {
    console.error('Facebook authentication failed:', error.message);
    res.status(401).json({ error: 'Facebook authentication failed' });
  }
});

router.post('/apple-login', async (req, res) => {
  try {
    if (!req.body.identityToken || !process.env.APPLE_CLIENT_ID) return res.status(503).json({ error: 'Apple authentication is not configured' });
    const header = jwt.decode(req.body.identityToken, { complete: true })?.header;
    const { data } = await axios.get('https://appleid.apple.com/auth/keys', { timeout: 10000 });
    const jwk = data.keys.find((key) => key.kid === header?.kid);
    if (!jwk) return res.status(401).json({ error: 'Apple signing key not found' });
    const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const claims = jwt.verify(req.body.identityToken, key, { algorithms: ['RS256'], issuer: 'https://appleid.apple.com', audience: process.env.APPLE_CLIENT_ID });
    const email = claims.email || req.body.email;
    if (!email || claims.email_verified === 'false') return res.status(422).json({ error: 'Apple did not provide a verified email' });
    res.json(await finishLogin('apple', { id: claims.sub, email, emailVerified: true, name: req.body.name }));
  } catch (error) {
    console.error('Apple authentication failed:', error.message);
    res.status(401).json({ error: 'Apple authentication failed' });
  }
});

module.exports = router;
