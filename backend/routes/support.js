const express = require('express');
const SupportTicket = require('../models/SupportTicket');
const { protect } = require('../middleware/admin');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Generate unique ticket number
const generateTicketNumber = () => {
  return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};

// ============================================================================
// CUSTOMER SUPPORT TICKETS
// ============================================================================

// ✅ Create support ticket
router.post('/tickets', protect, async (req, res) => {
  try {
    const { subject, description, category, orderId, productId, priority } = req.body;

    // Validate required fields
    if (!subject || !description || !category) {
      return res.status(400).json({ error: 'Subject, description, and category are required' });
    }

    // Create ticket
    const ticket = new SupportTicket({
      ticketNumber: generateTicketNumber(),
      userId: req.user.id,
      subject,
      description,
      category,
      orderId: orderId || null,
      productId: productId || null,
      priority: priority || 'medium',
      status: 'open',
      messages: [
        {
          sender: req.user.id,
          senderType: 'customer',
          message: description
        }
      ]
    });

    await ticket.save();

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get all my tickets
router.get('/tickets', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = { userId: req.user.id };
    if (status) query.status = status;

    const tickets = await SupportTicket.find(query)
      .populate('assignedTo', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ priority: -1, createdAt: -1 });

    const total = await SupportTicket.countDocuments(query);

    res.status(200).json({
      success: true,
      count: tickets.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: tickets
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get ticket details
router.get('/tickets/:ticketId', protect, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId)
      .populate('userId', 'name email avatar')
      .populate('assignedTo', 'name email')
      .populate('messages.sender', 'name email avatar');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check authorization
    if (ticket.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Add message to ticket
router.post('/tickets/:ticketId/messages', protect, async (req, res) => {
  try {
    const { message, attachments } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check authorization
    if (ticket.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Can only add message if ticket is not closed
    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'Cannot reply to closed ticket' });
    }

    // Add message
    ticket.messages.push({
      sender: req.user.id,
      senderType: 'customer',
      message,
      attachments: attachments || []
    });

    // Reset waiting-customer status if it was set
    if (ticket.status === 'waiting-customer') {
      ticket.status = 'in-progress';
    }

    await ticket.save();

    // Populate to return complete message
    await ticket.populate('messages.sender', 'name email avatar');

    res.status(200).json({
      success: true,
      message: 'Message added',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Close ticket
router.put('/tickets/:ticketId/close', protect, async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check authorization
    if (ticket.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    ticket.status = 'closed';
    ticket.closedAt = new Date();
    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket closed',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Rate support response
router.post('/tickets/:ticketId/rate', protect, async (req, res) => {
  try {
    const { rating, feedback } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check authorization
    if (ticket.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    ticket.satisfactionRating = rating;
    ticket.satisfactionFeedback = feedback || '';
    ticket.ratedAt = new Date();
    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Thank you for your feedback',
      data: ticket
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// TICKET STATISTICS (For customer dashboard)
// ============================================================================

// ✅ Get my support ticket statistics
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const totalTickets = await SupportTicket.countDocuments({ userId });
    const openTickets = await SupportTicket.countDocuments({ userId, status: 'open' });
    const inProgressTickets = await SupportTicket.countDocuments({
      userId,
      status: { $in: ['in-progress', 'waiting-customer', 'waiting-seller'] }
    });
    const resolvedTickets = await SupportTicket.countDocuments({ userId, status: 'resolved' });
    const closedTickets = await SupportTicket.countDocuments({ userId, status: 'closed' });

    // Calculate average resolution time
    const resolvedTicketData = await SupportTicket.find({
      userId,
      status: { $in: ['resolved', 'closed'] },
      resolvedAt: { $exists: true }
    });

    let avgResolutionTime = 0;
    if (resolvedTicketData.length > 0) {
      const totalTime = resolvedTicketData.reduce((sum, ticket) => {
        return sum + (ticket.resolvedAt - new Date(ticket.createdAt));
      }, 0);
      avgResolutionTime = totalTime / resolvedTicketData.length / (1000 * 60 * 60); // in hours
    }

    res.status(200).json({
      success: true,
      data: {
        totalTickets,
        openTickets,
        inProgressTickets,
        resolvedTickets,
        closedTickets,
        avgResolutionTimeHours: Math.round(avgResolutionTime * 10) / 10
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
