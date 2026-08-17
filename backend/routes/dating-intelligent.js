/**
 * INTELLIGENT DATING & MATCHING SYSTEM
 * Real-time matching algorithm like Tinder/Bumble
 * Considers preferences, location, interests, behavior patterns, and compatibility
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DatingProfile = require('../models/DatingProfile');
const DatingSwipe = require('../models/DatingSwipe');
const DatingMatch = require('../models/DatingMatch');
const DatingMessage = require('../models/DatingMessage');
const { protect } = require('../middleware/auth');
const calculateCompatibility = require('../utils/compatibilityScore');

// ===== USER DATING PROFILE =====

// Get or create dating profile
router.get('/profile', protect, async (req, res) => {
  try {
    let profile = await DatingProfile.findOne({ userId: req.user.id }).populate('userId', 'name avatar email');

    if (!profile) {
      profile = await DatingProfile.create({
        userId: req.user.id,
        preferences: {
          ageRange: { min: 18, max: 50 },
          distance: 50,
          interests: [],
          lookingFor: 'relationship'
        },
        viewedProfiles: []
      });
      await profile.populate('userId', 'name avatar email');
    }

    res.json({ success: true, profile });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update dating profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { bio, interests, lookingFor, images, ageRange, distance } = req.body;

    const profile = await DatingProfile.findOneAndUpdate(
      { userId: req.user.id },
      {
        bio,
        interests,
        preferences: {
          lookingFor,
          ageRange,
          distance,
          interests
        },
        images: images || []
      },
      { new: true, upsert: true }
    );

    res.json({ success: true, profile, message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== INTELLIGENT MATCHING =====

/**
 * Get matched users based on:
 * - Location proximity
 * - Age compatibility
 * - Shared interests
 * - Behavior similarity
 * - User preferences
 * - Previous swipes (avoid showing again)
 */
router.get('/matched-users', protect, async (req, res) => {
  try {
    const myProfile = await DatingProfile.findOne({ userId: req.user.id });
    if (!myProfile) {
      return res.status(400).json({ success: false, error: 'Complete your dating profile first' });
    }

    const { limit = 10 } = req.query;

    // Get users I've already swiped on
    const mySwipes = await DatingSwipe.find({ swipedBy: req.user.id }).select('swipedOn');
    const swipedUserIds = mySwipes.map(s => s.swipedOn.toString());

    // Base query: exclude self and already swiped users
    const query = {
      _id: { $nin: [req.user.id, ...swipedUserIds] },
      accountType: 'user'
    };

    // Optional: Apply location filter if location data available
    if (myProfile.preferences.distance && req.user.location?.coordinates) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: req.user.location.coordinates
          },
          $maxDistance: myProfile.preferences.distance * 1000 // Convert km to meters
        }
      };
    }

    // Get potential matches
    let potentialMatches = await User.find(query).limit(limit * 2).select('name avatar email');

    // Calculate compatibility score for each user
    const matchesWithScores = await Promise.all(
      potentialMatches.map(async (user) => {
        const theirProfile = await DatingProfile.findOne({ userId: user._id });
        const compatibilityScore = calculateCompatibility(myProfile, theirProfile, user);
        return { user, compatibilityScore, profile: theirProfile };
      })
    );

    // Sort by compatibility score and limit results
    const sortedMatches = matchesWithScores
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
      .slice(0, limit);

    res.json({
      success: true,
      matches: sortedMatches.map(m => ({
        ...m.user.toObject(),
        compatibilityScore: m.compatibilityScore,
        profile: m.profile
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== SWIPING SYSTEM =====

// Swipe on a user (like, skip, or pass)
router.post('/swipe', protect, async (req, res) => {
  try {
    const { targetUserId, action } = req.body;

    if (!['like', 'skip', 'pass'].includes(action)) {
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }

    // Record the swipe
    const swipe = await DatingSwipe.create({
      swipedBy: req.user.id,
      swipedOn: targetUserId,
      action,
      timestamp: new Date()
    });

    // Check for mutual like (match)
    if (action === 'like') {
      const mutualSwipe = await DatingSwipe.findOne({
        swipedBy: targetUserId,
        swipedOn: req.user.id,
        action: 'like'
      });

      if (mutualSwipe) {
        // Create a match!
        const match = await DatingMatch.create({
          user1: req.user.id,
          user2: targetUserId,
          matchedAt: new Date(),
          status: 'active'
        });

        return res.json({
          success: true,
          action,
          matched: true,
          match,
          message: "It's a match! 🎉"
        });
      }
    }

    res.json({ success: true, action, matched: false });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get swipe stats
router.get('/swipe-stats', protect, async (req, res) => {
  try {
    const totalSwiped = await DatingSwipe.countDocuments({ swipedBy: req.user.id });
    const totalLikes = await DatingSwipe.countDocuments({ swipedBy: req.user.id, action: 'like' });
    const totalMatches = await DatingMatch.countDocuments({
      $or: [{ user1: req.user.id }, { user2: req.user.id }]
    });
    const receivedLikes = await DatingSwipe.countDocuments({ swipedOn: req.user.id, action: 'like' });

    res.json({
      success: true,
      stats: {
        totalSwiped,
        totalLikes,
        likePercentage: totalSwiped ? Math.round((totalLikes / totalSwiped) * 100) : 0,
        totalMatches,
        receivedLikes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== MATCHES & CONVERSATIONS =====

// Get all matches
router.get('/matches', protect, async (req, res) => {
  try {
    const matches = await DatingMatch.find({
      $or: [{ user1: req.user.id }, { user2: req.user.id }],
      status: 'active'
    })
      .populate('user1', 'name avatar')
      .populate('user2', 'name avatar')
      .sort({ matchedAt: -1 });

    // Get last message for each match
    const matchesWithMessages = await Promise.all(
      matches.map(async (match) => {
        const lastMessage = await DatingMessage.findOne({
          $or: [
            { from: req.user.id, to: match.user1._id },
            { from: req.user.id, to: match.user2._id },
            { from: match.user1._id, to: req.user.id },
            { from: match.user2._id, to: req.user.id }
          ]
        }).sort({ timestamp: -1 });

        const otherUser = match.user1._id.toString() === req.user.id ? match.user2 : match.user1;

        return {
          match,
          otherUser,
          lastMessage
        };
      })
    );

    res.json({ success: true, matches: matchesWithMessages });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send message
router.post('/messages', protect, async (req, res) => {
  try {
    const { to, message } = req.body;

    // Verify match exists
    const match = await DatingMatch.findOne({
      $or: [
        { user1: req.user.id, user2: to },
        { user1: to, user2: req.user.id }
      ]
    });

    if (!match) {
      return res.status(400).json({ success: false, error: 'No match found' });
    }

    const msg = await DatingMessage.create({
      from: req.user.id,
      to,
      message,
      timestamp: new Date(),
      read: false
    });

    // Notify recipient (via push notification)
    // TODO: Implement push notification

    res.status(201).json({ success: true, message: msg });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get conversation with a user
router.get('/conversations/:userId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const messages = await DatingMessage.find({
      $or: [
        { from: req.user.id, to: req.params.userId },
        { from: req.params.userId, to: req.user.id }
      ]
    })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .reverse();

    // Mark messages as read
    await DatingMessage.updateMany(
      { from: req.params.userId, to: req.user.id, read: false },
      { read: true }
    );

    res.json({
      success: true,
      messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Unmatch (block/end relationship)
router.post('/matches/:matchId/unmatch', protect, async (req, res) => {
  try {
    const match = await DatingMatch.findById(req.params.matchId);

    if (!match) {
      return res.status(404).json({ success: false, error: 'Match not found' });
    }

    if (match.user1.toString() !== req.user.id && match.user2.toString() !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    match.status = 'ended';
    await match.save();

    res.json({ success: true, message: 'Match ended' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Block user
router.post('/block/:userId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.blockedUsers) user.blockedUsers = [];
    if (!user.blockedUsers.includes(req.params.userId)) {
      user.blockedUsers.push(req.params.userId);
      await user.save();
    }

    // End any active matches with this user
    await DatingMatch.updateMany(
      {
        $or: [
          { user1: req.user.id, user2: req.params.userId },
          { user1: req.params.userId, user2: req.user.id }
        ]
      },
      { status: 'blocked' }
    );

    res.json({ success: true, message: 'User blocked' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== PROFILE INTERACTIONS =====

// View profile (for analytics)
router.post('/view-profile/:userId', protect, async (req, res) => {
  try {
    const profile = await DatingProfile.findOne({ userId: req.params.userId });

    if (!profile.viewedProfiles) profile.viewedProfiles = [];
    profile.viewedProfiles.push({
      viewedBy: req.user.id,
      viewedAt: new Date()
    });

    await profile.save();

    res.json({ success: true, message: 'Profile viewed' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
