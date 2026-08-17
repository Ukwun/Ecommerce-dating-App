const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const SellerProfile = require('../models/SellerProfile');
const SecurityLog = require('../models/SecurityLog');
const User = require('../models/User');
const { evaluateAbuseRisk } = require('../utils/fraudMonitor');

// Protect route - requires authentication
const protect = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: 'JWT_SECRET is not configured' });
    }

    const token = req.headers.authorization?.split(' ')[1]; // Bearer token

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.tokenType !== 'access') {
      return res.status(401).json({ message: 'Invalid token type' });
    }
    const user = await User.findOne({ _id: decoded.id, accountStatus: { $ne: 'deleted' } }).select('+authVersion');
    if (!user || (decoded.authVersion ?? 0) !== user.authVersion) {
      return res.status(401).json({ message: 'Account or session is unavailable' });
    }
    req.user = decoded;
    
    // Log access
    logSecurityAction(req, 'api_request', 'success');
    
    next();
  } catch (error) {
    logSecurityAction(req, 'unauthorized_access_attempt', 'failed', error.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Admin only middleware
const admin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const adminUser = await AdminUser.findOne({ userId: req.user.id });

    if (!adminUser || !adminUser.isActive) {
      logSecurityAction(req, 'unauthorized_access_attempt', 'blocked', 'Non-admin access attempt');
      return res.status(403).json({ message: 'Admin access required' });
    }

    req.admin = adminUser;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error verifying admin status', error: error.message });
  }
};

// Admin with specific permission
const adminWithPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      const adminUser = await AdminUser.findOne({ userId: req.user.id });

      if (!adminUser || !adminUser.isActive) {
        logSecurityAction(req, 'unauthorized_access_attempt', 'blocked', `Missing permission: ${permission}`);
        return res.status(403).json({ message: 'Admin access required' });
      }

      if (!adminUser.permissions.includes(permission)) {
        logSecurityAction(req, 'unauthorized_access_attempt', 'blocked', `Missing permission: ${permission}`);
        return res.status(403).json({ message: `Permission required: ${permission}` });
      }

      req.admin = adminUser;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Error verifying permissions', error: error.message });
    }
  };
};

// Seller only middleware
const seller = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const sellerProfile = await SellerProfile.findOne({ userId: req.user.id });

    if (!sellerProfile) {
      return res.status(403).json({ message: 'Seller profile not found. Please apply as a seller first.' });
    }

    if (sellerProfile.verificationStatus === 'pending') {
      return res.status(403).json({ message: 'Your seller application is pending approval' });
    }

    if (sellerProfile.verificationStatus === 'rejected') {
      return res.status(403).json({ message: 'Your seller application was rejected' });
    }

    if (sellerProfile.verificationStatus === 'suspended') {
      return res.status(403).json({ message: `Your seller account is suspended: ${sellerProfile.suspensionReason}` });
    }

    if (sellerProfile.verificationStatus !== 'approved') {
      return res.status(403).json({ message: 'Seller account is not active' });
    }

    req.seller = sellerProfile;
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error verifying seller status', error: error.message });
  }
};

// Log security action
const logSecurityAction = async (req, action, status = 'success', errorMessage = null) => {
  try {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

    const riskEvaluation = await evaluateAbuseRisk({
      userId: req.user?.id,
      ipAddress,
    });

    const log = new SecurityLog({
      userId: req.user?.id,
      username: req.user?.email,
      action,
      description: `${action} - ${req.method} ${req.path}`,
      ipAddress,
      userAgent,
      method: req.method,
      endpoint: req.path,
      status,
      errorMessage,
      riskLevel: riskEvaluation.riskLevel,
      sessionId: req.sessionID,
      metadata: {
        body: req.body?.password ? { ...req.body, password: '***' } : req.body,
        query: req.query,
        riskSignals: {
          failedLogins: riskEvaluation.failedLogins,
          failedPayments: riskEvaluation.failedPayments,
          suspiciousActions: riskEvaluation.suspiciousActions,
        }
      }
    });

    await log.save();
  } catch (err) {
    // Don't fail the request if logging fails
    console.error('Security logging error:', err);
  }
};

module.exports = {
  protect,
  admin,
  adminWithPermission,
  seller,
  logSecurityAction
};
