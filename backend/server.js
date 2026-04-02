const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Import Routes
const authRoutes = require('./routes/userRoutes');
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

// NEW: Seller Ratings & Notifications (Phase 3 Enhancements)
const sellerRatingRoutes = require('./routes/seller-ratings');
const notificationRoutes = require('./routes/notifications');

// Import Rate Limiters
const { generalLimiter, authLimiter, createProductLimiter, paymentLimiter, supportLimiter } = require('./middleware/rateLimiter');

const app = express();
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Backend server is running and accessible',
    timestamp: new Date().toISOString()
  });
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Initialize Socket Handler
require('./socket/socketHandler')(io);
require('./socket/supportHandler')(io);

// Register Routes
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

// NEW: Seller Ratings & Notifications (Phase 3 Enhancements)
app.use('/marketplace/api', sellerRatingRoutes);
app.use('/marketplace/api/notifications', notificationRoutes);

app.get('/', (req, res) => {
  res.send('Facebook Marketplace + Dating API is running');
});

const PORT = process.env.PORT || 8082;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT} (listening on all interfaces)`);
  console.log(`🚀 Backend accessible at: http://192.168.70.160:${PORT}`);
  console.log(`🔌 WebSocket server active on port ${PORT}`);
});