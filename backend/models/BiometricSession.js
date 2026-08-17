const mongoose = require('mongoose');

const biometricSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  provider: { type: String, enum: ['aws_rekognition'], required: true },
  providerSessionId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['created', 'passed', 'failed', 'expired'], default: 'created' },
  confidence: Number,
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

module.exports = mongoose.model('BiometricSession', biometricSessionSchema);
