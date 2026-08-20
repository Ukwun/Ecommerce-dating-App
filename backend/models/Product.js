const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please enter product name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please enter product description']
  },
  price: {
    type: Number,
    required: [true, 'Please enter product price']
  },
  oldPrice: {
    type: Number
  },
  category: {
    type: String,
    required: [true, 'Please enter product category']
  },
  stock: {
    type: Number,
    required: [true, 'Please enter product stock'],
    default: 1
  },
  reservedStock: { type: Number, default: 0, min: 0 },
  inStock: {
    type: Boolean,
    default: true
  },
  purchases: {
    type: Number,
    default: 0
  },
  sizes: [{
    type: String
  }],
  colors: [{
    type: String
  }],
  images: [{
    url: {
      type: String,
      required: true
    },
    fileId: {
      type: String,
      required: true
    }
  }],
  ratings: {
    type: Number,
    default: 0
  },
  numOfReviews: {
    type: Number,
    default: 0
  },
  moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  moderationReason: String,
  moderatedAt: Date,
  moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

productSchema.index({ createdAt: -1 });
productSchema.index({ seller: 1, createdAt: -1 });
productSchema.index({ category: 1, createdAt: -1 });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
