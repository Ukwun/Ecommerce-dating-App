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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', productSchema);