const express = require('express');
const router = express.Router();
const PushNotification = require('../models/PushNotification');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /marketplace/api/notifications/send
 * @desc    Send notification to user(s)
 * @access  Private (Admin or internal service)
 */
router.post('/send', protect, async (req, res) => {
  try {
    const { userId, title, body, notificationType, relatedId, data } = req.body;

    // Validate
    if (!userId || !title || !body || !notificationType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const validTypes = [
      'new_product',
      'price_drop',
      'back_in_stock',
      'order_status',
      'message',
      'rating_received',
      'seller_promo',
      'personalized_recommendation',
      'loyalty_reward',
      'system'
    ];

    if (!validTypes.includes(notificationType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid notificationType. Must be one of: ${validTypes.join(', ')}`
      });
    }

    // Create notification
    const notification = await PushNotification.create({
      userId,
      title,
      body,
      notificationType,
      relatedId: relatedId || null,
      data: data || {},
      isSent: true,
      sentAt: new Date()
    });

    res.status(201).json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /marketplace/api/notifications
 * @desc    Get user's notifications (with optional filtering)
 * @access  Private
 */
router.get('/', protect, async (req, res) => {
  try {
    const { isRead, type, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = { userId: req.user.id };

    if (isRead === 'true' || isRead === 'false') {
      query.isRead = JSON.parse(isRead);
    }

    if (type) {
      query.notificationType = type;
    }

    // Get notifications sorted by newest first
    const notifications = await PushNotification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count
    const total = await PushNotification.countDocuments(query);

    // Get unread count
    const unreadCount = await PushNotification.countDocuments({
      userId: req.user.id,
      isRead: false
    });

    res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / limit),
      unreadCount,
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /marketplace/api/notifications/unread
 * @desc    Get count of unread notifications
 * @access  Private
 */
router.get('/unread', protect, async (req, res) => {
  try {
    const unreadCount = await PushNotification.countDocuments({
      userId: req.user.id,
      isRead: false
    });

    res.json({
      success: true,
      unreadCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   GET /marketplace/api/notifications/:id
 * @desc    Get single notification
 * @access  Private
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const notification = await PushNotification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Verify ownership
    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this notification'
      });
    }

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PUT /marketplace/api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await PushNotification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Verify ownership
    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification'
      });
    }

    // Mark as read
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.json({
      success: true,
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   PUT /marketplace/api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', protect, async (req, res) => {
  try {
    const result = await PushNotification.updateMany(
      {
        userId: req.user.id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   DELETE /marketplace/api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await PushNotification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Verify ownership
    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification'
      });
    }

    await PushNotification.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * @route   DELETE /marketplace/api/notifications
 * @desc    Delete all old notifications (older than 30 days)
 * @access  Private (Admin/System)
 */
router.delete('/', protect, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await PushNotification.deleteMany({
      createdAt: { $lt: thirtyDaysAgo }
    });

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} old notifications`,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
