const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/userRoutes');
const socialAuthRoutes = require('./routes/socialAuth');
const datingRoutes = require('./routes/dating');
const discoveryRoutes = require('./routes/discovery');
const swipeRoutes = require('./routes/swipe');
const conversationRoutes = require('./routes/conversation');
const verificationRoutes = require('./routes/verification');
const shippingRoutes = require('./routes/shipping');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const paymentsRoutes = require('./routes/payments');
const cartRoutes = require('./routes/cart');
const messagesRoutes = require('./routes/messages');
const wishlistRoutes = require('./routes/wishlist');
const walletRoutes = require('./routes/wallet');
const marketplaceRoutes = require('./routes/marketplace');

// NEW: Enterprise Features
const adminRoutes = require('./routes/admin');
const sellerRoutes = require('./routes/seller');
const returnsRoutes = require('./routes/returns');
const supportRoutes = require('./routes/support');
const monitoringRoutes = require('./routes/monitoring');

// NEW: Seller Ratings & Notifications (Phase 3 Enhancements)
const sellerRatingRoutes = require('./routes/seller-ratings');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');

// Import Rate Limiters
const { generalLimiter, authLimiter, createProductLimiter, paymentLimiter, supportLimiter } = require('./middleware/rateLimiter');
const { startAnalyticsAggregationJob } = require('./jobs/analyticsAggregationJob');
const { attachRedisAdapter } = require('./config/redis');
const { scheduleAnalyticsAggregation } = require('./jobs/queue');
const { startRuntimeMonitoring } = require('./jobs/runtimeMonitor');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// WebSocket Setup
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from mobile app
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Make io accessible in routes
app.set('io', io);

// Enhanced CORS configuration
const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: false,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({
  verify: (req, _res, buffer) => {
    req.rawBody = buffer;
  }
}));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  res.status(databaseReady ? 200 : 503).json({
    status: databaseReady ? 'ok' : 'degraded',
    database: databaseReady ? 'connected' : 'unavailable',
    timestamp: new Date().toISOString()
  });
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
  maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 30),
  minPoolSize: Number(process.env.MONGO_MIN_POOL_SIZE || 2),
  maxConnecting: Number(process.env.MONGO_MAX_CONNECTING || 4),
  serverSelectionTimeoutMS: 10000,
  maxIdleTimeMS: 60000,
})
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Initialize Socket Handler
require('./socket/socketHandler')(io);
require('./socket/supportHandler')(io);

// Register Routes
app.use('/auth/api', authLimiter, socialAuthRoutes);
app.use('/auth/api', authLimiter, authRoutes);
app.use('/dating/api', datingRoutes);
app.use('/dating/api', discoveryRoutes);
app.use('/dating/api', swipeRoutes);
app.use('/dating/api', conversationRoutes);
app.use('/dating/api', verificationRoutes);
app.use('/shipping/api', shippingRoutes);
app.use('/marketplace/api', productsRoutes);
app.use('/marketplace/api', ordersRoutes);
app.use('/marketplace/api', paymentsRoutes);
app.use('/marketplace/api', cartRoutes);
app.use('/marketplace/api', messagesRoutes);
app.use('/marketplace/api', wishlistRoutes);
app.use('/marketplace/api/wallet', walletRoutes);
app.use('/marketplace/api', marketplaceRoutes);

// NEW: Enterprise Feature Routes
app.use('/admin/api', adminRoutes);
app.use('/seller/api', sellerRoutes);
app.use('/marketplace/api/returns', returnsRoutes);
app.use('/support/api', supportLimiter, supportRoutes);
app.use('/monitoring/api', monitoringRoutes);

// NEW: Seller Ratings & Notifications (Phase 3 Enhancements)
app.use('/marketplace/api', sellerRatingRoutes);
app.use('/marketplace/api/notifications', notificationRoutes);
app.use('/marketplace/api/upload', uploadRoutes);
app.use('/upload/api', uploadRoutes);

app.get('/', (req, res) => {
  res.send('Facebook Marketplace + Dating API is running');
});

// Privacy Policy page (required for Play Store)
app.get('/privacy', (req, res) => {
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy - Marketplace App</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#111;line-height:1.7}h1{color:#FF8C00}h2{margin-top:32px;color:#374151}a{color:#FF8C00}</style></head><body><h1>Privacy Policy</h1><p><strong>Last updated:</strong> ${new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}</p><p>Marketplace App ("we", "us", or "our") is committed to protecting your personal information. This policy explains what data we collect, how we use it, and your rights.</p><h2>Information We Collect</h2><ul><li>Account information (name, email, password hash)</li><li>Profile photos and dating profile data (only with your consent)</li><li>Device push notification token (for order updates and messages)</li><li>Location data (only when you add a delivery address or enable dating discovery)</li><li>Purchase history and wishlist</li></ul><h2>How We Use Your Information</h2><ul><li>To process orders, payments, and deliveries</li><li>To match you with compatible people on our dating feature</li><li>To send order status push notifications</li><li>To personalise product recommendations</li><li>To prevent fraud and maintain security</li></ul><h2>Data Sharing</h2><p>We do not sell your personal data. We share data only with: Paystack (payment processing), ImageKit (image storage), and MongoDB Atlas (database hosting) — all under strict data processing agreements.</p><h2>Your Rights</h2><p>You may request deletion of your account and all associated data by emailing <a href="mailto:support@marketplace.app">support@marketplace.app</a>.</p><h2>Contact</h2><p>Questions? Email us at <a href="mailto:support@marketplace.app">support@marketplace.app</a></p></body></html>`);
});

const PORT = process.env.PORT || 8082;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} (listening on all interfaces)`);
  console.log(`🚀 Backend accessible at: http://192.168.70.160:${PORT}`);
  console.log(`🔌 WebSocket server active on port ${PORT}`);
  scheduleAnalyticsAggregation().then(scheduled => {
    if (!scheduled) startAnalyticsAggregationJob();
  }).catch(error => {
    console.error('Analytics queue scheduling failed:', error.message);
    if (process.env.REQUIRE_REDIS !== 'true') startAnalyticsAggregationJob();
  });
  startRuntimeMonitoring();
});

app.get('/terms', (_req, res) => {
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Terms of Service - BizMingle</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#111;line-height:1.7}h1{color:#FF8C00}h2{margin-top:32px;color:#374151}</style></head><body><h1>BizMingle Terms of Service</h1><p><strong>Last updated:</strong> August 18, 2026</p><h2>Marketplace</h2><p>Users must provide accurate listings, lawful goods, honest pricing, and fulfil confirmed orders. Fraud, counterfeit goods, harassment, and deceptive activity are prohibited.</p><h2>Payments and disputes</h2><p>Payments are processed by our payment provider. Refunds and returns follow the status and evidence shown in the app. Chargebacks or abuse may result in account restriction.</p><h2>Seller responsibilities</h2><p>Sellers remain responsible for listing accuracy, stock, delivery, customer support, and applicable taxes and laws. Seller access requires approval and may be suspended for policy violations.</p><h2>Dating and safety</h2><p>Dating features are for adults aged 18 or older. Users must respect consent and may report or block unsafe behavior. BizMingle does not guarantee compatibility or identity beyond the verification explicitly shown.</p><h2>Contact</h2><p>Questions may be sent to <a href="mailto:support@marketplace.app">support@marketplace.app</a>.</p></body></html>`);
});

app.get('/account-deletion', (_req, res) => {
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Delete your BizMingle account</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#111;line-height:1.7}h1{color:#FF8C00}h2{margin-top:32px;color:#374151}</style></head><body><h1>Delete your BizMingle account</h1><p>In the BizMingle app, sign in and open <strong>Profile → Settings → Delete Account</strong>. Confirm the warning to permanently delete the account.</p><h2>What is deleted</h2><p>Your profile, credentials, addresses, payment-method metadata, wishlists, dating data, conversations, support records, and seller data are removed or anonymized as applicable.</p><h2>What may be retained</h2><p>Transaction and fraud-prevention records may be retained only where required for legal, tax, dispute, or security obligations.</p><p>If you cannot access the app, email <a href="mailto:support@marketplace.app">support@marketplace.app</a> from your registered email address.</p></body></html>`);
});

app.get('/child-safety', (_req, res) => {
  res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Child Safety Standards - BizMingle</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px 24px;color:#111;line-height:1.7}h1{color:#FF8C00}h2{margin-top:32px;color:#374151}</style></head><body><h1>BizMingle Child Safety Standards</h1><p>BizMingle has zero tolerance for child sexual abuse and exploitation (CSAE), grooming, trafficking, or child sexual abuse material (CSAM). Dating access is restricted to adults aged 18 or older.</p><h2>Reporting</h2><p>Users can report a person from the Options menu in dating chat and can block that person immediately. Urgent safety concerns are prioritized for review.</p><h2>Enforcement</h2><p>We remove prohibited content, restrict offending accounts, preserve evidence when legally required, and report confirmed CSAM to the appropriate regional authority in accordance with applicable law.</p><h2>Child safety contact</h2><p>Google Play and safety authorities may contact <a href="mailto:support@marketplace.app">support@marketplace.app</a>.</p></body></html>`);
});

attachRedisAdapter(io).catch(error => {
  console.error('Redis adapter startup failed:', error.message);
  if (process.env.REQUIRE_REDIS === 'true') process.exit(1);
});
