const express = require('express');
const Swipe = require('../models/Swipe');
const Match = require('../models/Match');
const Conversation = require('../models/Conversation');
const DatingProfile = require('../models/DatingProfile');
const { protect } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /dating/api/swipe/:targetId
 * Send a swipe (like, dislike, or superlike)
 */
router.post('/swipe/:targetId', protect, async (req, res) => {
  try {
    const { targetId } = req.params;
    const { action } = req.body; // 'like', 'dislike', or 'superlike'

    if (!['like', 'dislike', 'superlike'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    if (targetId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot swipe on yourself' });
    }

    // Check if target user exists and is active
    const targetProfile = await DatingProfile.findOne({ userId: targetId });
    if (!targetProfile || !targetProfile.isActive) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already swiped
    let swipe = await Swipe.findOne({
      from: req.user._id,
      to: targetId
    });

    let isNewMatch = false;
    let matchData = null;

    if (swipe) {
      // Update existing swipe
      swipe.action = action;
      swipe.createdAt = new Date();
    } else {
      // Create new swipe
      swipe = new Swipe({
        from: req.user._id,
        to: targetId,
        action
      });

      // Check if it's a match (mutual like)
      if (action === 'like' || action === 'superlike') {
        const reverseSwipe = await Swipe.findOne({
          from: targetId,
          to: req.user._id,
          action: { $in: ['like', 'superlike'] }
        });

        if (reverseSwipe) {
          swipe.isMatch = true;
          swipe.matchDate = new Date();

          // Create match record
          const existingMatch = await Match.findOne({
            users: { $all: [req.user._id, targetId] }
          });

          if (!existingMatch) {
            // Create conversation
            const conversation = new Conversation({
              participants: [req.user._id, targetId],
              type: 'dating'
            });
            await conversation.save();

            // Create match
            matchData = new Match({
              users: [req.user._id, targetId],
              conversationId: conversation._id,
              matchedAt: new Date(),
              isActive: true
            });
            await matchData.save();

            // Update profiles
            const userProfile = await DatingProfile.findOne({ userId: req.user._id });
            const targetUserProfile = await DatingProfile.findOne({ userId: targetId });

            if (userProfile) {
              userProfile.totalMatches = (userProfile.totalMatches || 0) + 1;
              await userProfile.save();
            }

            if (targetUserProfile) {
              targetUserProfile.totalMatches = (targetUserProfile.totalMatches || 0) + 1;
              await targetUserProfile.save();
            }

            isNewMatch = true;
          }
        }
      }
    }

    // Update swipe count
    const userProfile = await DatingProfile.findOne({ userId: req.user._id });
    if (userProfile) {
      userProfile.totalSwipes = (userProfile.totalSwipes || 0) + 1;
      await userProfile.save();
    }

    await swipe.save();

    res.json({
      message: isNewMatch ? 'Match created!' : 'Swipe recorded',
      swipe,
      isMatch: isNewMatch,
      match: matchData
    });
  } catch (error) {
    console.error('Swipe error:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /dating/api/swipes/received
 * Get all likes/superlikes received (who liked you)
 */
router.get('/swipes/received', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const likes = await Swipe.find({
      to: req.user._id,
      action: { $in: ['like', 'superlike'] },
      isMatch: false // Only unmatched likes
    })
      .populate('from', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Swipe.countDocuments({
      to: req.user._id,
      action: { $in: ['like', 'superlike'] },
      isMatch: false
    });

    // Get full profiles for liked users
    const likedUserIds = likes.map((like) => like.from);
    const profiles = await DatingProfile.find({ userId: { $in: likedUserIds } }).lean();

    const enrichedLikes = likes.map((like) => {
      const profile = profiles.find((p) => p.userId.toString() === like.from._id.toString());
      return {
        ...like.toObject(),
        profile
      };
    });

    res.json({
      message: 'Received likes retrieved',
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      likes: enrichedLikes
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /dating/api/matches
 * Get all active matches
 */
router.get('/matches', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const matches = await Match.find({
      users: req.user._id,
      isActive: true
    })
      .populate('users', 'name')
      .populate('conversationId')
      .sort({ matchedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Match.countDocuments({
      users: req.user._id,
      isActive: true
    });

    // Get dating profiles for matches
    const matchUserIds = matches.flatMap((match) =>
      match.users.map((user) => user._id).filter((id) => id.toString() !== req.user._id.toString())
    );

    const profiles = await DatingProfile.find({ userId: { $in: matchUserIds } }).lean();

    const enrichedMatches = matches.map((match) => {
      const otherUserId = match.users.find((user) => user._id.toString() !== req.user._id.toString());
      const profile = profiles.find((p) => p.userId.toString() === otherUserId._id.toString());

      return {
        _id: match._id,
        match: {
          ...match.toObject(),
          users: undefined
        },
        otherUser: otherUserId,
        profile,
        unreadCount: match.unreadByUser1 ? 1 : 0 // Simplified
      };
    });

    res.json({
      message: 'Matches retrieved',
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      matches: enrichedMatches
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /dating/api/matches/:matchId
 * Get specific match details
 */
router.get('/matches/:matchId', protect, async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId)
      .populate('users', 'name email')
      .populate('conversationId');

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    // Check if user is part of match
    if (!match.users.some((user) => user._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(match);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /dating/api/matches/:matchId/unmatch
 * Unmatch with a user
 */
router.post('/matches/:matchId/unmatch', protect, async (req, res) => {
  try {
    const { matchId } = req.params;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (!match.users.some((user) => user.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    match.isActive = false;
    match.unmatchedBy = req.user._id;
    match.unmatchedAt = new Date();

    await match.save();

    res.json({ message: 'Match removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /dating/api/matches/:matchId/block
 * Block a matched user
 */
router.post('/matches/:matchId/block', protect, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { reason } = req.body;

    const match = await Match.findById(matchId);

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    match.isActive = false;
    match.blockedBy = req.user._id;
    match.blockReason = reason || 'No reason provided';
    match.unmatchedAt = new Date();

    await match.save();

    // Disable the conversation
    if (match.conversationId) {
      await Conversation.findByIdAndUpdate(match.conversationId, { isActive: false });
    }

    // Also block in dating profile
    const profile = await DatingProfile.findOne({ userId: req.user._id });
    const otherUserId = match.users.find((user) => user.toString() !== req.user._id.toString());

    if (profile && !profile.blockedUsers.includes(otherUserId)) {
      profile.blockedUsers.push(otherUserId);
      await profile.save();
    }

    res.json({ message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /dating/api/swipe/undo
 * Undo last swipe
 */
router.post('/swipe/undo', protect, async (req, res) => {
  try {
    // Find the most recent swipe by this user
    const lastSwipe = await Swipe.findOne({ from: req.user._id })
      .sort({ createdAt: -1 });

    if (!lastSwipe) {
      return res.status(404).json({ message: 'No swipes to undo' });
    }

    // Delete the swipe
    await Swipe.deleteOne({ _id: lastSwipe._id });

    res.json({ message: 'Swipe undone', undoneSwipe: lastSwipe });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /dating/api/matches/stats
 * Get match statistics
 */
router.get('/stats', protect, async (req, res) => {
  try {
    const totalMatches = await Match.countDocuments({
      users: req.user._id,
      isActive: true
    });

    const totalLikes = await Swipe.countDocuments({
      to: req.user._id,
      action: { $in: ['like', 'superlike'] },
      isMatch: false
    });

    const totalSwipesSent = await Swipe.countDocuments({
      from: req.user._id
    });

    const profile = await DatingProfile.findOne({ userId: req.user._id });

    res.json({
      totalMatches,
      totalLikes,
      totalSwipesSent,
      totalPhotos: profile?.photos?.length || 0,
      verificationScore: profile?.verificationScore || 0,
      profileCompleteness: calculateProfileCompleteness(profile)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Helper function to calculate profile completeness
 */
const calculateProfileCompleteness = (profile) => {
  if (!profile) return 0;

  let completeness = 0;
  const maxPoints = 6;

  if (profile.bio && profile.bio.length > 20) completeness++;
  if (profile.photos && profile.photos.length > 0) completeness++;
  if (profile.interests && profile.interests.length > 0) completeness++;
  if (profile.location && profile.location.coordinates) completeness++;
  if (profile.isPhoneVerified) completeness++;
  if (profile.gender && profile.interestedIn) completeness++;

  return Math.round((completeness / maxPoints) * 100);
};

module.exports = router;
