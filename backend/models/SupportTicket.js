const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Ticket Details
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: [
      'order_issue',
      'payment_issue',
      'product_quality',
      'return_refund',
      'shipping_delivery',
      'seller_issue',
      'account_issue',
      'technical_issue',
      'dispute_resolution',
      'other'
    ],
    required: true
  },
  
  // Related Objects
  orderId: mongoose.Schema.Types.ObjectId, // optional - link to order
  productId: mongoose.Schema.Types.ObjectId, // optional - link to product
  
  // Priority & Status
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'waiting-customer', 'waiting-seller', 'resolved', 'closed'],
    default: 'open'
  },
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser'
  },
  assignedAt: Date,
  
  // Communication Thread
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderType: {
      type: String,
      enum: ['customer', 'admin', 'seller'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    attachments: [String], // URLs or file paths
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Resolution
  resolution: String,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser'
  },
  resolvedAt: Date,
  
  // Customer Satisfaction
  satisfactionRating: {
    type: Number,
    min: 1,
    max: 5
  },
  satisfactionFeedback: String,
  ratedAt: Date,
  
  // Escalation
  isEscalated: { type: Boolean, default: false },
  escalationReason: String,
  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser'
  },
  escalatedAt: Date,
  
  // Attachments
  attachments: [
    {
      fileName: String,
      fileUrl: String,
      uploadedAt: Date
    }
  ],
  
  // Metrics
  firstResponseTime: Number, // in minutes
  resolutionTime: Number, // in hours
  
  // Dates
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  closedAt: Date
}, { timestamps: true });

// Index for faster queries
supportTicketSchema.index({ userId: 1 });
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ priority: 1 });
supportTicketSchema.index({ assignedTo: 1 });
supportTicketSchema.index({ category: 1 });
supportTicketSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
