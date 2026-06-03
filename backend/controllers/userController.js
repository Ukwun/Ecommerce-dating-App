const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const SecurityLog = require('../models/SecurityLog');
const { evaluateAbuseRisk } = require('../utils/fraudMonitor');

const getClientIp = (req) => req.ip || req.connection?.remoteAddress || 'Unknown';

// ✅ Register a new user - FIXED RESPONSE
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Generate token immediately
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'JWT_SECRET is not configured' });
    }

    const accessToken = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log security event
    await SecurityLog.create({
      userId: newUser._id,
      username: newUser.email,
      action: 'user_registered',
      description: 'user registered successfully',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      method: req.method,
      endpoint: req.path,
      status: 'success',
    }).catch(() => {});

    // Return proper response structure
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      accessToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar || null,
      },
    });
  } catch (error) {
    console.error('❌ Register Error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// ✅ Login user - FIXED RESPONSE
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check for existing user
    const user = await User.findOne({ email });
    if (!user) {
      await SecurityLog.create({
        username: email,
        action: 'login_failed',
        description: 'user not found during login',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
        method: req.method,
        endpoint: req.path,
        status: 'failed',
      }).catch(() => {});
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Compare passwords safely
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await SecurityLog.create({
        userId: user._id,
        username: user.email,
        action: 'login_failed',
        description: 'password mismatch',
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || 'Unknown',
        method: req.method,
        endpoint: req.path,
        status: 'failed',
      }).catch(() => {});

      const risk = await evaluateAbuseRisk({ userId: user._id, ipAddress: getClientIp(req) });
      if (risk.riskLevel === 'high') {
        await SecurityLog.create({
          userId: user._id,
          username: user.email,
          action: 'suspicious_activity_detected',
          description: 'high risk login threshold reached',
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'] || 'Unknown',
          method: req.method,
          endpoint: req.path,
          status: 'blocked',
          riskLevel: 'high',
        }).catch(() => {});
        return res.status(429).json({ error: 'Too many suspicious attempts, try again later' });
      }

      return res.status(400).json({ error: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'JWT_SECRET is not configured' });
    }

    // Generate token
    const accessToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    await SecurityLog.create({
      userId: user._id,
      username: user.email,
      action: 'login_success',
      description: 'user login success',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      method: req.method,
      endpoint: req.path,
      status: 'success',
    }).catch(() => {});

    // Return proper response structure
    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
      },
    });
  } catch (error) {
    console.error('❌ Login Error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// ✅ Google OAuth
const googleAuth = async (req, res) => {
  try {
    const { idToken, accessToken } = req.body;

    if (!idToken && !accessToken) {
      return res.status(400).json({ error: 'idToken or accessToken required' });
    }

    // In production: verify token with Google
    // For now: create or find user (simplified)
    const payload = { email: req.body.email, name: req.body.name };

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = new User({
        email: payload.email,
        name: payload.name,
        password: crypto.randomBytes(16).toString('hex'),
        isGoogleAuth: true,
      });
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      accessToken: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'Google authentication failed' });
  }
};

// ✅ Facebook OAuth
const facebookAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'accessToken required' });
    }

    // In production: verify token with Facebook
    const payload = { email: req.body.email, name: req.body.name };

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = new User({
        email: payload.email,
        name: payload.name,
        password: crypto.randomBytes(16).toString('hex'),
        isFacebookAuth: true,
      });
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      accessToken: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
      },
    });
  } catch (error) {
    console.error('Facebook auth error:', error);
    res.status(500).json({ error: 'Facebook authentication failed' });
  }
};

// ✅ Apple OAuth
const appleAuth = async (req, res) => {
  try {
    const { identityToken } = req.body;

    if (!identityToken) {
      return res.status(400).json({ error: 'identityToken required' });
    }

    const payload = { email: req.body.email, name: req.body.name };

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = new User({
        email: payload.email,
        name: payload.name,
        password: crypto.randomBytes(16).toString('hex'),
        isAppleAuth: true,
      });
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      accessToken: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
      },
    });
  } catch (error) {
    console.error('Apple auth error:', error);
    res.status(500).json({ error: 'Apple authentication failed' });
  }
};

// ✅ Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = crypto.randomBytes(20).toString('hex');

    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    const resetUrl = `marketplace://reset-password/${resetToken}`;

    const message = `You have requested a password reset. Please use this link to reset your password: ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        message,
      });

      res.status(200).json({ success: true, message: 'Email sent' });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      return res.status(500).json({ error: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ Reset Password
const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Please provide a new password' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(201).json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleAuth,
  facebookAuth,
  appleAuth,
  forgotPassword,
  resetPassword,
};
