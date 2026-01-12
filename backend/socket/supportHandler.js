const jwt = require('jsonwebtoken');

module.exports = (io) => {
  const supportIo = io.of('/support');

  supportIo.use((socket, next) => {
    if (socket.handshake.auth && socket.handshake.auth.token) {
      jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET || 'supersecretkey', (err, decoded) => {
        if (err) return next(new Error('Authentication error'));
        socket.user = decoded;
        next();
      });
    } else {
      next(new Error('Authentication error'));
    }
  });

  supportIo.on('connection', (socket) => {
    console.log('User connected to support chat:', socket.user.id);

    socket.on('join_room', (orderId) => {
      socket.join(orderId);
      console.log(`User ${socket.user.id} joined support room: ${orderId}`);
    });

    socket.on('send_message', (data) => {
      const { orderId, text, id } = data;
      
      // Broadcast to everyone in the room (including sender to confirm receipt)
      supportIo.to(orderId).emit('receive_message', {
        id: id || Date.now().toString(),
        text,
        sender: 'user',
        timestamp: new Date().toISOString()
      });

      // Simulate automated support response
      setTimeout(() => {
        supportIo.to(orderId).emit('receive_message', {
          id: Date.now().toString(),
          text: "Thanks for reaching out. A support agent will review your order shortly.",
          sender: 'support',
          timestamp: new Date().toISOString()
        });
      }, 2000);
    });
  });
};