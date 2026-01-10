import mongoose from 'mongoose';

const { Schema } = mongoose;

const MatchSchema = new Schema(
  {
    // Always exactly 2 users in a match
    users: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }
    ],

    // When did they match
    matchedAt: {
      type: Date,
      default: Date.now,
      index: true
    },

    // Reference to the conversation thread
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation'
    },

    // Match status
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    // Unmatching
    unmatchedBy: Schema.Types.ObjectId, // Which user unmatched
    unmatchedAt: Date,

    // Blocking
    blockedBy: Schema.Types.ObjectId,
    blockReason: String,

    // Last communication
    lastMessageAt: Date,
    lastMessageContent: String,
    lastMessageFrom: Schema.Types.ObjectId,
    messageCount: {
      type: Number,
      default: 0
    },

    // Unread indicator
    unreadByUser1: {
      type: Boolean,
      default: false
    },
    unreadByUser2: {
      type: Boolean,
      default: false
    },

    // Additional metadata
    isFavorite: {
      type: Boolean,
      default: false
    },
    muteNotifications: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Index for quick lookup of user's matches
MatchSchema.index({ users: 1, isActive: 1 });
MatchSchema.index({ matchedAt: -1 });
MatchSchema.index({ conversationId: 1 });

export default mongoose.model('Match', MatchSchema);
