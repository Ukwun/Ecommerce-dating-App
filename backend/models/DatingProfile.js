const mongoose = require('mongoose');

const datingProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  name: String,
  age: { type: Number, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  interestedIn: [{ type: String, enum: ['male', 'female', 'other'] }],
  lookingFor: { type: String, enum: ['relationship', 'casual', 'marriage', 'friendship'] },
  bio: { type: String, maxLength: 500 },
  interests: [String],
  photos: [{
    url: String,
    isProfilePhoto: Boolean,
    cloudinaryId: String
  }],
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
    city: String,
    updatedAt: Date
  },
  verificationScore: { type: Number, default: 0 },
  lastActive: Date,
  isSearchable: { type: Boolean, default: true },
  pushToken: String,
  isTwoFactorEnabled: { type: Boolean, default: false },
  verificationPhotoUrl: String
}, { timestamps: true });

// Index for geospatial queries
datingProfileSchema.index({ location: '2dsphere' });
// Index for filtering
datingProfileSchema.index({ age: 1, gender: 1 });

module.exports = mongoose.model('DatingProfile', datingProfileSchema);