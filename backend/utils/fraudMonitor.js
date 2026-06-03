const SecurityLog = require('../models/SecurityLog');
const MonitoringMetric = require('../models/MonitoringMetric');

const THRESHOLDS = {
  failedLogins15m: 5,
  failedPayments10m: 3,
  suspiciousActions30m: 8,
};

const countSince = async (query, minutes) => {
  const since = new Date(Date.now() - minutes * 60 * 1000);
  return SecurityLog.countDocuments({ ...query, createdAt: { $gte: since } });
};

const evaluateAbuseRisk = async ({ userId = null, ipAddress = null }) => {
  const userQuery = userId ? { userId } : {};
  const ipQuery = ipAddress ? { ipAddress } : {};

  const [failedLogins, failedPayments, suspiciousActions] = await Promise.all([
    countSince({ action: 'login_failed', status: 'failed', ...userQuery, ...ipQuery }, 15),
    countSince({ action: 'payment_verified', status: 'failed', ...userQuery, ...ipQuery }, 10),
    countSince({ action: 'unauthorized_access_attempt', ...userQuery, ...ipQuery }, 30),
  ]);

  let riskLevel = 'low';
  if (
    failedLogins >= THRESHOLDS.failedLogins15m ||
    failedPayments >= THRESHOLDS.failedPayments10m ||
    suspiciousActions >= THRESHOLDS.suspiciousActions30m
  ) {
    riskLevel = 'high';
  } else if (failedLogins >= 3 || failedPayments >= 2 || suspiciousActions >= 4) {
    riskLevel = 'medium';
  }

  if (riskLevel !== 'low') {
    await MonitoringMetric.create({
      source: 'fraud_monitor',
      metricType: 'risk_trigger',
      status: riskLevel === 'high' ? 'critical' : 'warning',
      value: 1,
      metadata: {
        userId: userId ? String(userId) : null,
        ipAddress,
        failedLogins,
        failedPayments,
        suspiciousActions,
        thresholds: THRESHOLDS,
      },
    }).catch(() => {});
  }

  return { riskLevel, failedLogins, failedPayments, suspiciousActions, thresholds: THRESHOLDS };
};

module.exports = {
  THRESHOLDS,
  evaluateAbuseRisk,
};
