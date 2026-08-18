const mongoose = require('mongoose');

const sellerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  businessName: {
    type: String,
    required: true
  },
  businessDescription: String,
  businessCategory: {
    type: String,
    enum: ['electronics', 'fashion', 'home', 'beauty', 'books', 'sports', 'toys', 'groceries', 'other'],
    required: true
  },
  registrationNumber: String,
  registrationDocument: String, // URL to uploaded document
  
  // Verification Fields
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  verificationDate: Date,
  verificationNotesFromAdmin: String,
  rejectionReason: String,
  suspensionReason: String,
  suspensionUntil: Date,
  verificationDocuments: [{ type: String }], // URLs or document references
  
  // Identity Verification
  bvn: String, // Business Verification Number (for Nigeria)
  nin: String, // National ID Number
  idDocument: String, // URL to ID document
  idVerified: { type: Boolean, default: false },
  
  // Bank Details for Payouts
  bankName: String,
  accountNumber: String,
  accountName: String,
  bankCode: String,
  bankVerified: { type: Boolean, default: false },
  paystackRecipientCode: String,
  paystackRecipientAccountFingerprint: String,
  
  // Profile Stats
  totalSales: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  pendingEarnings: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0, min: 0, max: 5 },
  totalRatings: { type: Number, default: 0 },
  responseTime: { type: Number, default: 0 }, // in hours
  cancellationRate: { type: Number, default: 0 }, // percentage
  
  // Commission
  commissionRate: { type: Number, default: 5 }, // percentage taken by platform
  payoutReserveRate: { type: Number, default: 10, min: 0, max: 100 },
  
  // Contact Info
  contactEmail: String,
  contactPhone: String,
  businessWebsite: String,
  
  // Store Info
  storeImage: String,
  storeBanner: String,
  storeDescription: String,
  
  // Metrics
  lastPayout: Date,
  totalReturns: { type: Number, default: 0 },
  totalDisputes: { type: Number, default: 0 },
  
  // Dates
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Index for faster queries
sellerProfileSchema.index({ verificationStatus: 1 });
sellerProfileSchema.index({ businessCategory: 1 });

module.exports = mongoose.model('SellerProfile', sellerProfileSchema);
