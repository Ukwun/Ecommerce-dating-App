const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // don't count successful requests
  message: 'Too many login attempts, please try again after 15 minutes'
});

// Password reset rate limiter
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 requests per hour
  message: 'Too many password reset requests, please try again later'
});

// Create product rate limiter
const createProductLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each user to 10 product creations per hour
  keyGenerator: (req) => req.user?.id || req.ip, // rate limit by user ID if authenticated
  message: 'Too many products created, please try again later'
});

// Payment rate limiter
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // limit each user to 3 payment attempts per minute
  keyGenerator: (req) => req.user?.id || req.ip,
  message: 'Too many payment attempts, please try again later'
});

// Support ticket rate limiter
const supportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each user to 5 tickets per hour
  keyGenerator: (req) => req.user?.id || req.ip,
  message: 'Too many support tickets, please try again later'
});

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  createProductLimiter,
  paymentLimiter,
  supportLimiter
};
