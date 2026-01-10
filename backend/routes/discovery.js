const express = require('express');
const router = express.Router();
const DatingProfile = require('../models/DatingProfile');
const { calculateScore } = require('../utils/matchingAlgorithm');
// Assuming you have an auth middleware, if not, you'll need to create one
const auth = require('../middleware/auth'); 

// GET /dating/api/discover
router.get('/discover', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      maxDistance = 50, 
      ageMin = 18, 
      ageMax = 100 
    } = req.query;
    
    const userId = req.user.id;

    // 1. Get current user's profile
    const userProfile = await DatingProfile.findOne({ userId });
    if (!userProfile) {
      return res.status(404).json({ message: 'Please create a dating profile first' });
    }

    // 2. Build Query
    const query = {
      userId: { $ne: userId }, // Exclude self
      isSearchable: true,
      age: { $gte: parseInt(ageMin), $lte: parseInt(ageMax) },
      gender: { $in: userProfile.interestedIn }
    };

    // Add Geospatial Filter if location exists
    if (userProfile.location && userProfile.location.coordinates) {
      query.location = {
        $near: {
          $geometry: userProfile.location,
          $maxDistance: parseInt(maxDistance) * 1000 // km to meters
        }
      };
    }

    // 3. Fetch Candidates
    // We fetch a larger batch (e.g., 100) to sort them by compatibility in memory
    // since compatibility score is calculated dynamically and not stored in DB.
    const candidates = await DatingProfile.find(query)
      .populate('userId', 'name avatar')
      .limit(100);

    // 4. Calculate Scores & Sort
    const scoredCandidates = candidates.map(candidate => {
      const { score, distance } = calculateScore(userProfile, candidate);
      return {
        ...candidate.toObject(),
        compatibilityScore: score,
        distance: distance
      };
    });

    // Sort by score descending (highest match first)
    scoredCandidates.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // 5. Paginate
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = scoredCandidates.slice(startIndex, endIndex);

    res.json({
      profiles: paginatedResults,
      total: scoredCandidates.length
    });
  } catch (err) {
    console.error('Discovery Error:', err);
    res.status(500).json({ message: 'Server error fetching profiles' });
  }
});

module.exports = router;