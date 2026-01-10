const Message = require('../models/Message');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join user room
    socket.on('join_user', ({ userId }) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { senderId, recipientId, content, productId, orderId } = data;

        // Save to database
        const message = new Message({
          sender: senderId,
          recipient: recipientId,
          content,
          productId: productId || null,
          orderId: orderId || null,
          read: false,
        });

        await message.save();

        // Emit to recipient
        io.to(`user_${recipientId}`).emit('new_message', {
          _id: message._id,
          sender: senderId,
          recipient: recipientId,
          content,
          read: false,
          createdAt: message.createdAt,
        });

        // Confirm to sender
        socket.emit('message_sent', { _id: message._id, success: true });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { error: error.message });
      }
    });

    // User typing
    socket.on('user_typing', ({ senderId, recipientId }) => {
      io.to(`user_${recipientId}`).emit('user_typing', { userId: senderId });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;
