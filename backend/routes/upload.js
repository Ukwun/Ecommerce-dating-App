const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Standardized protection middleware resolution
const protect = authMiddleware?.protect || (typeof authMiddleware === 'function' ? authMiddleware : (req, res, next) => next());

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

    res.json({ url: data.url, fileId: data.fileId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
