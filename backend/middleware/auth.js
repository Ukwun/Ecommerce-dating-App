const jwt = require('jsonwebtoken');
const User = require('../models/User');

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
    req.user = {
      ...decoded,
      id: decoded.id || decoded._id,
      _id: decoded._id || decoded.id,
    };
    const activeUser = await User.findOne({ _id: req.user.id, accountStatus: { $ne: 'deleted' } }).select('+authVersion');
    if (!activeUser) return res.status(401).json({ message: 'Account is unavailable' });
    if ((decoded.authVersion ?? 0) !== activeUser.authVersion) {
      return res.status(401).json({ message: 'Session has been revoked' });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { protect };
