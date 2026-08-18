const mongoose = require('mongoose');

const uploadedAssetSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  fileId: { type: String, required: true, unique: true },
  url: { type: String, required: true },
  moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'failed'], default: 'pending', index: true },
  moderationLabels: [{ name: String, confidence: Number }],
  failureReason: String,
}, { timestamps: true });

module.exports = mongoose.model('UploadedAsset', uploadedAssetSchema);
