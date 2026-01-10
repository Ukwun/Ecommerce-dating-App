import mongoose from 'mongoose';

const { Schema } = mongoose;

const SwipeSchema = new Schema(
  {
    from: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    to: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Swipe action: like, dislike, or superlike
    action: {
      type: String,
      enum: ['like', 'dislike', 'superlike'],
      required: true
    },

    // If both users like each other, it's a match
    isMatch: {
      type: Boolean,
      default: false,
      index: true
    },
    matchDate: Date,

    // Track when the swipe was made
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

// Unique constraint: one swipe per user pair (can be updated)
SwipeSchema.index({ from: 1, to: 1 }, { unique: true });

// For quick lookup of likes received
SwipeSchema.index({ to: 1, action: 1, isMatch: 1 });

// For tracking user activity
SwipeSchema.index({ from: 1, createdAt: -1 });

export default mongoose.model('Swipe', SwipeSchema);
