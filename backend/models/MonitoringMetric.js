const mongoose = require('mongoose');
const { sendAlert } = require('../utils/alerting');

const monitoringMetricSchema = new mongoose.Schema({
  source: {
    type: String,
    required: true,
    index: true,
  },
  metricType: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['ok', 'warning', 'critical'],
    default: 'ok',
    index: true,
  },
  value: {
    type: Number,
    default: 0,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

monitoringMetricSchema.index({ source: 1, metricType: 1, createdAt: -1 });
monitoringMetricSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

monitoringMetricSchema.post('save', function onSave(doc) {
  if (doc.status !== 'critical' && doc.status !== 'warning') return;

  sendAlert({
    level: doc.status,
    title: `[${doc.status.toUpperCase()}] ${doc.source}:${doc.metricType}`,
    message: `Monitoring metric triggered (${doc.source}/${doc.metricType})`,
    metadata: {
      value: doc.value,
      createdAt: doc.createdAt,
      details: doc.metadata,
    },
  });
});

module.exports = mongoose.model('MonitoringMetric', monitoringMetricSchema);
