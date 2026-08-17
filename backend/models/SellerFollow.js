const mongoose = require('mongoose');

const sellerFollowSchema = new mongoose.Schema({
  follower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'SellerProfile', required: true, index: true },
}, { timestamps: true });

sellerFollowSchema.index({ follower: 1, seller: 1 }, { unique: true });
module.exports = mongoose.model('SellerFollow', sellerFollowSchema);
