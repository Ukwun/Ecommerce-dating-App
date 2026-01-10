const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const DatingProfile = require('../models/DatingProfile');
const auth = require('../middleware/auth');
const { Expo } = require('expo-server-sdk');

const expo = new Expo();

// GET /dating/api/chat/:conversationId
// Fetch message history
router.get('/chat/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      id => id.toString() === req.user.id
    );

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({ messages: conversation.messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /dating/api/notifications/register
// Register push token for the user
router.post('/notifications/register', auth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token required' });

    await DatingProfile.findOneAndUpdate(
      { userId: req.user.id },
      { pushToken: token }
    );

    res.json({ message: 'Push token registered' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /dating/api/chat/send/:conversationId
// Send a message and emit socket event
router.post('/chat/send/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { content, imageUrl } = req.body;
    const senderId = req.user.id;

    if (!content && !imageUrl) {
      return res.status(400).json({ message: 'Message must contain text or image' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    if (conversation.isActive === false) {
      return res.status(403).json({ message: 'This conversation is closed' });
    }

    // Create new message object
    const newMessage = {
      senderId,
      content: content || (imageUrl ? 'Sent an image' : ''),
      imageUrl,
      messageType: imageUrl ? 'image' : 'text',
      timestamp: new Date(),
      isRead: false
    };

    // Update conversation
    conversation.messages.push(newMessage);
    conversation.lastMessage = imageUrl ? '📷 Image' : content;
    conversation.lastMessageAt = newMessage.timestamp;
    conversation.lastMessageSenderId = senderId;
    
    await conversation.save();

    // --- SOCKET.IO EMISSION ---
    const io = req.app.get('io');
    if (io) {
      // Emit to the specific room (conversationId)
      io.to(conversationId).emit('message:received', {
        conversationId,
        ...newMessage
      });
    }

    // --- PUSH NOTIFICATION ---
    try {
      const recipientId = conversation.participants.find(p => p.toString() !== senderId);
      if (recipientId) {
        const recipientProfile = await DatingProfile.findOne({ userId: recipientId });
        if (recipientProfile && recipientProfile.pushToken && Expo.isExpoPushToken(recipientProfile.pushToken)) {
          await expo.sendPushNotificationsAsync([{
            to: recipientProfile.pushToken,
            sound: 'chat_sound.wav', // For iOS
            title: 'New Message',
            body: content || (imageUrl ? 'Sent an image' : 'New message'),
            data: { conversationId, url: `/dating-chat/${conversationId}` },
            channelId: 'chat_messages', // For Android
            threadId: conversationId, // Group notifications by conversation
          }]);
        }
      }
    } catch (pushErr) {
      console.error('Push notification error:', pushErr);
    }

    res.status(201).json({ message: 'Message sent', messageData: newMessage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;