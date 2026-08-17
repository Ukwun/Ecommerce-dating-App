const jwt = require('jsonwebtoken');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      if (!process.env.JWT_SECRET) return next(new Error('Server authentication is not configured'));
      const decoded = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
      if (decoded.tokenType !== 'access') return next(new Error('Authentication error'));
      const user = await User.findOne({ _id: decoded.id, accountStatus: { $ne: 'deleted' } }).select('+authVersion');
      if (!user || (decoded.authVersion ?? 0) !== user.authVersion) return next(new Error('Authentication error'));
      socket.userId = String(decoded.id);
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user_${socket.userId}`);
    console.log('🔌 New client connected:', socket.id);

    // User comes online
    socket.on('user:online', () => {
      io.emit('user:status', { userId: socket.userId, status: 'online' });
    });

    // Join conversation room (for real-time chat)
    socket.on('conversation:join', async (conversationId, acknowledge) => {
      try {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
          isActive: { $ne: false },
        }).select('_id');
        if (!conversation) {
          if (typeof acknowledge === 'function') acknowledge({ ok: false, error: 'Not authorized' });
          return;
        }
        socket.join(String(conversation._id));
        if (typeof acknowledge === 'function') acknowledge({ ok: true });
      } catch {
        if (typeof acknowledge === 'function') acknowledge({ ok: false, error: 'Invalid conversation' });
      }
    });

    // Typing indicators
    socket.on('user:typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user:typing', { conversationId, userId: socket.userId });
    });

    socket.on('user:stop-typing', ({ conversationId }) => {
      socket.to(conversationId).emit('user:stop-typing', { conversationId, userId: socket.userId });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      if (socket.userId) {
        const remainingSockets = await io.in(`user_${socket.userId}`).fetchSockets();
        if (remainingSockets.length === 0) {
          io.emit('user:status', { userId: socket.userId, status: 'offline' });
        }
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  // Helper to get socketId by userId (useful for notifications)
  io.getSocketIds = async (userId) => (await io.in(`user_${userId}`).fetchSockets()).map(socket => socket.id);
};
