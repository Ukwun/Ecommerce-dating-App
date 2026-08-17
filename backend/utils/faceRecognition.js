const axios = require('axios');
const {
  RekognitionClient,
  CompareFacesCommand,
  CreateFaceLivenessSessionCommand,
  GetFaceLivenessSessionResultsCommand,
} = require('@aws-sdk/client-rekognition');

const configured = () => Boolean(
  process.env.AWS_REGION &&
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY
);

const client = () => {
  if (!configured()) {
    const error = new Error('AWS Rekognition is not configured');
    error.code = 'FACE_PROVIDER_UNAVAILABLE';
    throw error;
  }
  return new RekognitionClient({ region: process.env.AWS_REGION });
};

const downloadImage = async (url) => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000,
    maxContentLength: 8 * 1024 * 1024,
  });
  if (!String(response.headers['content-type'] || '').startsWith('image/')) {
    throw new Error('Biometric reference must be an image');
  }
  return Buffer.from(response.data);
};

const createLivenessSession = async (userId) => {
  const response = await client().send(new CreateFaceLivenessSessionCommand({
    ClientRequestToken: `${userId}-${Date.now()}`,
    Settings: { AuditImagesLimit: 0 },
  }));
  return response.SessionId;
};

const verifyLivenessSession = async (sessionId, enrolledImageUrl, livenessThreshold = 90, similarityThreshold = 90) => {
  const result = await client().send(new GetFaceLivenessSessionResultsCommand({ SessionId: sessionId }));
  if (result.Status !== 'SUCCEEDED' || Number(result.Confidence || 0) < livenessThreshold || !result.ReferenceImage?.Bytes) {
    return { verified: false, livenessConfidence: Number(result.Confidence || 0), similarity: 0 };
  }
  const enrolledBytes = await downloadImage(enrolledImageUrl);
  const comparison = await client().send(new CompareFacesCommand({
    SourceImage: { Bytes: enrolledBytes },
    TargetImage: { Bytes: result.ReferenceImage.Bytes },
    SimilarityThreshold: similarityThreshold,
    QualityFilter: 'HIGH',
  }));
  const similarity = Number(comparison.FaceMatches?.[0]?.Similarity || 0);
  return {
    verified: similarity >= similarityThreshold,
    livenessConfidence: Number(result.Confidence || 0),
    similarity,
  };
};

module.exports = { configured, createLivenessSession, verifyLivenessSession };
