module.exports = (io) => {
  const onlineUsers = new Map(); // userId -> socketId

  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    // User comes online
    socket.on('user:online', (userId) => {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      io.emit('user:status', { userId, status: 'online' });
      console.log(`User ${userId} is online`);
    });

    // Join conversation room (for real-time chat)
    socket.on('conversation:join', (conversationId) => {
      socket.join(conversationId);
      console.log(`Socket ${socket.id} joined room ${conversationId}`);
    });

    // Typing indicators
    socket.on('user:typing', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('user:typing', { conversationId, userId });
    });

    socket.on('user:stop-typing', ({ conversationId, userId }) => {
      socket.to(conversationId).emit('user:stop-typing', { conversationId, userId });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('user:status', { userId: socket.userId, status: 'offline' });
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  // Helper to get socketId by userId (useful for notifications)
  io.getSocketId = (userId) => {
    return onlineUsers.get(userId);
  };
};