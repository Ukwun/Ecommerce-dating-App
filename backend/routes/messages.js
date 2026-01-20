const express = require('express');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ✅ Send message
router.post('/messages', protect, async (req, res) => {
  try {
    const { recipientId, content, productId, orderId } = req.body;

    if (!recipientId || !content) {
      return res.status(400).json({ error: 'Recipient and content required' });
    }

    if (recipientId === req.user.id) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    const message = new Message({
      sender: req.user.id,
      recipient: recipientId,
      content,
      productId,
      orderId,
      type: 'text'
    });

    await message.save();
    await message.populate('sender', 'name avatar');
    await message.populate('recipient', 'name avatar');

    // Emit via Socket.io if available
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${recipientId}`).emit('new_message', {
        message,
        from: req.user.id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent',
      data: message
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get conversation with user
router.get('/messages/:userId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { userId } = req.params;

    const skip = (page - 1) * limit;

    const messages = await Message.find({
      $or: [
        { sender: req.user.id, recipient: userId },
        { sender: userId, recipient: req.user.id }
      ]
    })
      .populate('sender', 'name avatar')
      .populate('recipient', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Mark as read
    await Message.updateMany(
      {
        recipient: req.user.id,
        sender: userId,
        read: false
      },
      { read: true, readAt: Date.now() }
    );

    res.json({
      success: true,
      data: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get all conversations (chat list)
router.get('/conversations', protect, async (req, res) => {
  try {
    // Get all unique users who have chatted with this user
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: require('mongoose').Types.ObjectId(req.user.id) },
            { recipient: require('mongoose').Types.ObjectId(req.user.id) }
          ]
        }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', require('mongoose').Types.ObjectId(req.user.id)] },
              '$recipient',
              '$sender'
            ]
          },
          lastMessage: { $last: '$content' },
          lastMessageTime: { $last: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$recipient', require('mongoose').Types.ObjectId(req.user.id)] },
                    { $eq: ['$read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { lastMessageTime: -1 } }
    ]);

    // Populate user details
    for (let conv of conversations) {
      const user = await User.findById(conv._id).select('name avatar');
      conv.user = user;
    }

    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Mark message as read
router.put('/messages/:messageId/read', protect, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.messageId,
      {
        read: true,
        readAt: Date.now()
      },
      { new: true }
    );

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Delete message
router.delete('/messages/:messageId', protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await Message.findByIdAndDelete(req.params.messageId);

    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
