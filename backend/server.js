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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Initialize Socket Handler
require('./socket/socketHandler')(io);

// Register Routes
app.use('/auth/api', authRoutes);
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

app.get('/', (req, res) => {
  res.send('Facebook Marketplace + Dating API is running');
});

const PORT = process.env.PORT || 8082;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server active on port ${PORT}`);
});