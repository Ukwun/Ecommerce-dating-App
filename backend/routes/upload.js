const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Standardized protection middleware resolution
const protect = authMiddleware?.protect || (typeof authMiddleware === 'function' ? authMiddleware : (req, res, next) => next());
const UploadedAsset = require('../models/UploadedAsset');
const { enqueueImageModeration } = require('../jobs/queue');

// Proxy ImageKit upload — keeps private key off the client
router.post('/imagekit', protect, async (req, res) => {
  try {
    const { base64, fileName, folder } = req.body;
    
    // Implementation for real-time functional uploads
    if (!base64 || !fileName) {
      return res.status(400).json({ error: 'base64 and fileName required' });
    }

    const FormData = require('form-data');
    const fetch = require('node-fetch');

    const formData = new FormData();
    formData.append('file', base64);
    formData.append('fileName', fileName);
    formData.append('folder', folder || '/uploads');

    const response = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ':').toString('base64')}`,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(400).json({ error: data.message || 'ImageKit upload failed' });
    }

    const asset = await UploadedAsset.create({ owner: req.user.id, fileId: data.fileId, url: data.url });
    const queued = await enqueueImageModeration({ assetId: asset._id.toString(), imageUrl: data.url }, `image-${data.fileId.replace(/[^a-zA-Z0-9_-]/g, '')}`);
    if (!queued) {
      asset.moderationStatus = 'failed';
      asset.failureReason = 'Moderation queue unavailable';
      await asset.save();
      return res.status(503).json({ error: 'Upload stored but safety review is unavailable; try again later' });
    }
    res.status(202).json({ url: data.url, fileId: data.fileId, moderationStatus: asset.moderationStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/imagekit/:fileId/status', protect, async (req, res) => {
  const asset = await UploadedAsset.findOne({ fileId: req.params.fileId, owner: req.user.id }).select('fileId url moderationStatus moderationLabels failureReason');
  if (!asset) return res.status(404).json({ error: 'Upload not found' });
  res.json({ success: true, data: asset });
});

module.exports = router;
