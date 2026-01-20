const express = require('express');
const router = express.Router();
const DatingProfile = require('../models/DatingProfile');
const { calculateScore } = require('../utils/matchingAlgorithm');
const { protect } = require('../middleware/auth');

/**
 * Calculate distance between two coordinates in kilometers
 */
function calculateDistance(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET /dating/api/discover - Real-time location-based discovery
router.get('/discover', protect, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      maxDistance = 50, 
      ageMin = 18, 
      ageMax = 100,
      latitude,
      longitude
    } = req.query;
    
    const userId = req.user.id;

    // 1. Get current user's profile
    let userProfile = await DatingProfile.findOne({ userId });
    if (!userProfile) {
      return res.status(404).json({ message: 'Please create a dating profile first' });
    }

    // 2. Update user location if provided from client
    if (latitude && longitude) {
      userProfile.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
      await userProfile.save();
    }

    // 3. Build Query
    const query = {
      userId: { $ne: userId }, // Exclude self
      isSearchable: true,
      age: { $gte: parseInt(ageMin), $lte: parseInt(ageMax) }
    };

    // Filter by gender preferences
    if (userProfile.interestedIn && userProfile.interestedIn.length > 0) {
      query.gender = { $in: userProfile.interestedIn };
    }

    // 4. Fetch all candidates (we'll filter by distance manually for better control)
    const candidates = await DatingProfile.find(query)
      .populate('userId', 'name avatar boostExpiresAt')
      .select('+location')
      .limit(500); // Fetch more to ensure variety

    // 5. Filter by distance and calculate compatibility
    const validCandidates = candidates
      .filter(candidate => {
        if (!candidate.location || !candidate.location.coordinates) {
          return false; // Skip profiles without location
        }
        
        // Calculate distance to candidate
        const distance = calculateDistance(
          userProfile.location.coordinates,
          candidate.location.coordinates
        );
        
        return distance <= parseInt(maxDistance);
      })
      .map(candidate => {
        const distance = calculateDistance(
          userProfile.location.coordinates,
          candidate.location.coordinates
        );
        
        const { score } = calculateScore(userProfile, candidate);
        
        // Check if profile is boosted
        const isBoosted = candidate.userId && candidate.userId.boostExpiresAt && new Date(candidate.userId.boostExpiresAt) > new Date();

        return {
          ...candidate.toObject(),
          compatibilityScore: Math.round(score),
          distance: distance * 1000, // Convert to meters for consistency
          isBoosted
        };
      });

    // 6. Sort by boosted status then compatibility score (highest first)
    validCandidates.sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      return b.compatibilityScore - a.compatibilityScore;
    });

    // 7. Paginate
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedResults = validCandidates.slice(startIndex, endIndex);

    res.json({
      success: true,
      profiles: paginatedResults,
      total: validCandidates.length,
      userLocation: userProfile.location.coordinates,
      stats: {
        totalCandidates: candidates.length,
        nearbyMatches: validCandidates.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(validCandidates.length / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Discovery Error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching profiles',
      error: err.message 
    });
  }
});

// POST /dating/api/discover/refresh - Refresh discovery list with current location
router.post('/discover/refresh', protect, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user.id;

    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'Location coordinates required' });
    }

    // Update user's location
    const userProfile = await DatingProfile.findOneAndUpdate(
      { userId },
      {
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        }
      },
      { new: true }
    );

    if (!userProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json({
      success: true,
      message: 'Location updated successfully',
      userLocation: userProfile.location.coordinates
    });
  } catch (err) {
    console.error('Location update error:', err);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update location'
    });
  }
});

module.exports = router;
