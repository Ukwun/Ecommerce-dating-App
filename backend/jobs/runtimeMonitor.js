const { monitorEventLoopDelay } = require('perf_hooks');
const mongoose = require('mongoose');
const MonitoringMetric = require('../models/MonitoringMetric');

let timer;

const startRuntimeMonitoring = () => {
  if (timer) return;
  const intervalMs = Number(process.env.RUNTIME_MONITOR_INTERVAL_MS || 60000);
  const eventLoop = monitorEventLoopDelay({ resolution: 20 });
  eventLoop.enable();

  timer = setInterval(async () => {
    const eventLoopP99Ms = eventLoop.percentile(99) / 1e6;
    eventLoop.reset();
    const memoryPercent = (process.memoryUsage().rss / Number(process.env.INSTANCE_MEMORY_BYTES || 536870912)) * 100;
    const databaseReady = mongoose.connection.readyState === 1;
    const status = !databaseReady || eventLoopP99Ms > 250 || memoryPercent > 90
      ? 'critical'
      : eventLoopP99Ms > 100 || memoryPercent > 75 ? 'warning' : 'ok';

    await MonitoringMetric.create({
      source: 'runtime',
      metricType: 'service_capacity',
      status,
      value: Math.max(eventLoopP99Ms, memoryPercent),
      metadata: {
        databaseReady,
        eventLoopP99Ms: Number(eventLoopP99Ms.toFixed(2)),
        memoryPercent: Number(memoryPercent.toFixed(2)),
        pid: process.pid,
      },
    }).catch(error => console.error('Runtime monitoring write failed:', error.message));
  }, intervalMs);
  timer.unref();
};

module.exports = { startRuntimeMonitoring };
