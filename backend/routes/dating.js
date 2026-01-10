import express from 'express';
import DatingProfile from '../models/DatingProfile.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /dating/api/profile
 * Create a new dating profile
 */
router.post('/profile', authMiddleware, async (req, res) => {
  try {
    const { bio, gender, interests, interestedIn, lookingFor, ageRange } = req.body;

    // Check if profile already exists
    const existingProfile = await DatingProfile.findOne({ userId: req.user._id });
    if (existingProfile) {
      return res.status(400).json({ message: 'Dating profile already exists' });
    }

    // Validate required fields
    if (!gender || !interestedIn || interestedIn.length === 0) {
      return res.status(400).json({ 
        message: 'Gender and interests are required' 
      });
    }

    const newProfile = new DatingProfile({
      userId: req.user._id,
      bio: bio || '',
      gender,
      interests: interests || [],
      interestedIn,
      lookingFor: lookingFor || 'dating',
      ageRange: ageRange || { min: 18, max: 80 },
      isPhoneVerified: false,
      isEmailVerified: true, // Already verified during signup
      verificationScore: 30 // Basic score
    });

    await newProfile.save();

    res.status(201).json({
      message: 'Dating profile created successfully',
      profile: newProfile
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /dating/api/profile
 * Get own dating profile
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const profile = await DatingProfile.findOne({ userId: req.user._id }).populate(
      'userId',
      'name email phone'
    );

    if (!profile) {
      return res.status(404).json({ message: 'Dating profile not found' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /dating/api/profile
 * Update own dating profile
 */
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { bio, interests, interestedIn, lookingFor, ageRange, location } = req.body;

    const profile = await DatingProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Dating profile not found' });
    }

    // Update fields
    if (bio !== undefined) profile.bio = bio;
    if (interests !== undefined) profile.interests = interests;
    if (interestedIn !== undefined) profile.interestedIn = interestedIn;
    if (lookingFor !== undefined) profile.lookingFor = lookingFor;
    if (ageRange !== undefined) profile.ageRange = ageRange;
    
    // Update location if provided
    if (location) {
      profile.location = {
        ...profile.location,
        ...location,
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
        updatedAt: new Date()
      };
    }

    await profile.save();

    res.json({
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * GET /dating/api/profile/:userId
 * Get another user's dating profile (public view)
 */
router.get('/profile/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    // Check if user is blocked
    const requesterProfile = await DatingProfile.findOne({ userId: req.user._id });
    if (requesterProfile && requesterProfile.blockedUsers.includes(userId)) {
      return res.status(403).json({ message: 'User not found' });
    }

    const profile = await DatingProfile.findOne({ userId }).populate(
      'userId',
      'name'
    );

    if (!profile || !profile.isActive) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Return public profile (filter sensitive data)
    const publicProfile = {
      _id: profile._id,
      userId: profile.userId,
      bio: profile.bio,
      gender: profile.gender,
      interests: profile.interests,
      photos: profile.photos,
      profilePhotoUrl: profile.profilePhotoUrl,
      verificationScore: profile.verificationScore,
      location: profile.showDistance ? profile.location : null,
      totalMatches: profile.totalMatches
    };

    res.json(publicProfile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /dating/api/profile/photo/upload
 * Upload a dating profile photo
 */
router.post('/profile/photo/upload', authMiddleware, async (req, res) => {
  try {
    const { photoUrl, cloudinaryId, isProfilePhoto } = req.body;

    if (!photoUrl) {
      return res.status(400).json({ message: 'Photo URL is required' });
    }

    const profile = await DatingProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Dating profile not found' });
    }

    // Limit to 9 photos
    if (profile.photos.length >= 9) {
      return res.status(400).json({ message: 'Maximum 9 photos allowed' });
    }

    const newPhoto = {
      url: photoUrl,
      cloudinaryId: cloudinaryId || null,
      uploadedAt: new Date(),
      isVerified: false,
      order: profile.photos.length,
      isProfilePhoto: isProfilePhoto || false
    };

    profile.photos.push(newPhoto);

    // Set as profile photo if first photo or explicitly marked
    if (isProfilePhoto || profile.photos.length === 1) {
      profile.profilePhotoUrl = photoUrl;
      profile.photos[profile.photos.length - 1].isProfilePhoto = true;
    }

    // Increase verification score
    profile.verificationScore = Math.min(100, profile.verificationScore + 10);

    await profile.save();

    res.json({
      message: 'Photo uploaded successfully',
      photo: newPhoto,
      profile
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * DELETE /dating/api/profile/photo/:photoId
 * Delete a photo from dating profile
 */
router.delete('/profile/photo/:photoIndex', authMiddleware, async (req, res) => {
  try {
    const { photoIndex } = req.params;

    const profile = await DatingProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Dating profile not found' });
    }

    if (photoIndex < 0 || photoIndex >= profile.photos.length) {
      return res.status(400).json({ message: 'Invalid photo index' });
    }

    const deletedPhoto = profile.photos[photoIndex];

    // Remove photo
    profile.photos.splice(photoIndex, 1);

    // Reorder remaining photos
    profile.photos.forEach((photo, idx) => {
      photo.order = idx;
    });

    // Update profile photo if deleted photo was the profile photo
    if (deletedPhoto.isProfilePhoto) {
      if (profile.photos.length > 0) {
        profile.profilePhotoUrl = profile.photos[0].url;
        profile.photos[0].isProfilePhoto = true;
      } else {
        profile.profilePhotoUrl = null;
      }
    }

    await profile.save();

    res.json({
      message: 'Photo deleted successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * PUT /dating/api/profile/photo/reorder
 * Reorder photos in dating profile
 */
router.put('/profile/photo/reorder', authMiddleware, async (req, res) => {
  try {
    const { photoOrder } = req.body; // Array of photo IDs in new order

    if (!photoOrder || !Array.isArray(photoOrder)) {
      return res.status(400).json({ message: 'Photo order array is required' });
    }

    const profile = await DatingProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Dating profile not found' });
    }

    // Reorder photos
    const reorderedPhotos = [];
    photoOrder.forEach((photoIdx, newOrder) => {
      if (profile.photos[photoIdx]) {
        const photo = { ...profile.photos[photoIdx].toObject() };
        photo.order = newOrder;
        reorderedPhotos.push(photo);
      }
    });

    profile.photos = reorderedPhotos;
    await profile.save();

    res.json({
      message: 'Photos reordered successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /dating/api/profile/location
 * Update user location
 */
router.post('/profile/location', authMiddleware, async (req, res) => {
  try {
    const { latitude, longitude, address, city, state, country, zipCode } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const profile = await DatingProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Dating profile not found' });
    }

    profile.location = {
      type: 'Point',
      coordinates: [longitude, latitude],
      address: address || null,
      city: city || null,
      state: state || null,
      country: country || null,
      zipCode: zipCode || null,
      updatedAt: new Date()
    };

    await profile.save();

    res.json({
      message: 'Location updated successfully',
      profile
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /dating/api/profile/block/:userId
 * Block a user
 */
router.post('/profile/block/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await DatingProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Dating profile not found' });
    }

    if (profile.blockedUsers.includes(userId)) {
      return res.status(400).json({ message: 'User already blocked' });
    }

    profile.blockedUsers.push(userId);
    await profile.save();

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /dating/api/profile/unblock/:userId
 * Unblock a user
 */
router.post('/profile/unblock/:userId', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;

    const profile = await DatingProfile.findOne({ userId: req.user._id });

    if (!profile) {
      return res.status(404).json({ message: 'Dating profile not found' });
    }

    profile.blockedUsers = profile.blockedUsers.filter(
      (id) => id.toString() !== userId
    );
    await profile.save();

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
