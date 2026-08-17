const jwt = require('jsonwebtoken');
const SupportTicket = require('../models/SupportTicket');
const AdminUser = require('../models/AdminUser');
const User = require('../models/User');

module.exports = (io) => {
  const supportIo = io.of('/support');

  supportIo.use(async (socket, next) => {
    try {
      if (!socket.handshake.auth?.token) return next(new Error('Authentication error'));
      if (!process.env.JWT_SECRET) return next(new Error('Server authentication is not configured'));
      const decoded = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
      if (decoded.tokenType !== 'access') return next(new Error('Authentication error'));
      const user = await User.findOne({ _id: decoded.id, accountStatus: { $ne: 'deleted' } }).select('+authVersion');
      if (!user || (decoded.authVersion ?? 0) !== user.authVersion) return next(new Error('Authentication error'));
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  supportIo.on('connection', (socket) => {
    console.log('User connected to support chat:', socket.user.id);

    socket.on('join_room', async (ticketId, acknowledge) => {
      try {
        const [ticket, admin] = await Promise.all([
          SupportTicket.findById(ticketId).select('userId assignedTo'),
          AdminUser.findOne({ userId: socket.user.id, isActive: true }).select('_id'),
        ]);
        const ownsTicket = ticket?.userId?.toString() === String(socket.user.id);
        const assignedAdmin = admin && ticket?.assignedTo?.toString() === admin._id.toString();
        if (!ticket || (!ownsTicket && !assignedAdmin)) {
          if (typeof acknowledge === 'function') acknowledge({ ok: false, error: 'Not authorized' });
          return;
        }
        socket.join(String(ticket._id));
        if (typeof acknowledge === 'function') acknowledge({ ok: true });
      } catch {
        if (typeof acknowledge === 'function') acknowledge({ ok: false, error: 'Invalid ticket' });
      }
    });

    socket.on('send_message', (data) => {
      const { ticketId, orderId, text, id } = data;
      const roomId = ticketId || orderId;
      
      if (!roomId || !socket.rooms.has(String(roomId)) || !text || typeof text !== 'string' || text.length > 5000) return;
      supportIo.to(String(roomId)).emit('receive_message', {
        id: id || Date.now().toString(),
        text,
        sender: 'user',
        timestamp: new Date().toISOString()
      });

    });
  });
};
