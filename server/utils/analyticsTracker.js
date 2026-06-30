const os = require('os');
const fs = require('fs').promises;
const mongoose = require('mongoose');
const User = require('../models/User');

let totalRequests = 0;
let dbRequestsCount = 0;
let totalBytesReceived = 0;
let totalBytesSent = 0;
const statusCodes = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
const requestHistory = [];

// Monitor mongoose queries
let connectionFailures = 0;
mongoose.connection.on('error', (err) => {
  connectionFailures++;
});

mongoose.set('debug', (collectionName, method, query, doc, options) => {
  dbRequestsCount++;
});

// Middleware to track traffic and network stats
const trackServerMetrics = (req, res, next) => {
  const start = Date.now();
  totalRequests++;

  // Request content-length estimation
  const contentLength = parseInt(req.headers['content-length'] || 0, 10);
  totalBytesReceived += contentLength;

  // Intercept response writer to count sent bytes
  const oldWrite = res.write;
  const oldEnd = res.end;
  let responseSize = 0;

  res.write = function (chunk, encoding, callback) {
    if (chunk) {
      responseSize += chunk.length || Buffer.byteLength(chunk, encoding);
    }
    return oldWrite.apply(res, arguments);
  };

  res.end = function (chunk, encoding, callback) {
    if (chunk) {
      responseSize += chunk.length || Buffer.byteLength(chunk, encoding);
    }
    totalBytesSent += responseSize;
    return oldEnd.apply(res, arguments);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusGroup = `${Math.floor(status / 100)}xx`;

    if (statusCodes[statusGroup] !== undefined) {
      statusCodes[statusGroup]++;
    } else {
      statusCodes[statusGroup] = 1;
    }

    // Keep only last 100 requests in rolling log
    requestHistory.push({
      timestamp: new Date().toISOString(),
      path: req.baseUrl + req.path,
      method: req.method,
      status,
      duration,
    });
    if (requestHistory.length > 100) {
      requestHistory.shift();
    }
  });

  next();
};

// Helper to calculate CPU usage over a short duration (100ms)
const getCPUUsage = async () => {
  const getCPUTimes = () => {
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    cpus.forEach(cpu => {
      user += cpu.times.user;
      nice += cpu.times.nice;
      sys += cpu.times.sys;
      idle += cpu.times.idle;
      irq += cpu.times.irq;
    });
    return { idle, total: user + nice + sys + idle + irq };
  };

  const t1 = getCPUTimes();
  await new Promise(resolve => setTimeout(resolve, 100));
  const t2 = getCPUTimes();

  const idleDiff = t2.idle - t1.idle;
  const totalDiff = t2.total - t1.total;
  return totalDiff > 0 ? (1 - idleDiff / totalDiff) * 100 : 0;
};

// Helper to check Disk Space Usage
const getDiskUsage = async () => {
  try {
    if (fs.statfs) {
      const stats = await fs.statfs(process.cwd());
      const total = stats.bsize * stats.blocks;
      const free = stats.bsize * stats.bfree;
      const used = total - free;
      return {
        total,
        used,
        free,
        percentage: total > 0 ? (used / total) * 100 : 0
      };
    }
  } catch {}
  return { total: 0, used: 0, free: 0, percentage: 0 };
};

// Main function to collect all analytics report
const getAnalyticsReport = async () => {
  const cpuPercent = await getCPUUsage();
  const disk = await getDiskUsage();

  // RAM Stats
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const processMem = process.memoryUsage();

  // DB Stats
  let dbStats = { dataSize: 0, storageSize: 0, objects: 0, collections: 0 };
  let activeConnections = 1;
  let maxConnections = 100;
  try {
    if (mongoose.connection.readyState === 1) {
      const stats = await mongoose.connection.db.stats();
      dbStats = {
        dataSize: stats.dataSize || 0,
        storageSize: stats.storageSize || 0,
        objects: stats.objects || 0,
        collections: stats.collections || 0,
      };

      const client = mongoose.connection.client;
      if (client && client.options) {
        maxConnections = client.options.maxPoolSize || 100;
      }
      
      const adminDb = mongoose.connection.db.admin();
      const serverStatus = await adminDb.serverStatus();
      if (serverStatus && serverStatus.connections) {
        activeConnections = serverStatus.connections.current || activeConnections;
        maxConnections = (serverStatus.connections.available + serverStatus.connections.current) || maxConnections;
      }
    }
  } catch (err) {
    // Fail silently (expected on basic Atlas tier without Admin privileges)
  }

  const readyStateMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };
  const dbConnectionStatus = readyStateMap[mongoose.connection.readyState] || 'Unknown';

  // Users count
  let userCount = 0;
  try {
    userCount = await User.countDocuments();
  } catch {}

  return {
    uptime: process.uptime(),
    db: {
      ...dbStats,
      totalUsers: userCount,
      requestsCount: dbRequestsCount,
      running: mongoose.connection.readyState === 1,
      connectionStatus: dbConnectionStatus,
      activeConnections,
      maxConnections,
      connectionFailures,
    },
    traffic: {
      totalRequests,
      statusCodes,
      requestHistory,
    },
    network: {
      bytesReceived: totalBytesReceived,
      bytesSent: totalBytesSent,
    },
    performance: {
      cpuPercentage: cpuPercent,
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        percentage: totalMem > 0 ? (usedMem / totalMem) * 100 : 0,
        process: {
          rss: processMem.rss,
          heapTotal: processMem.heapTotal,
          heapUsed: processMem.heapUsed,
        }
      },
      disk,
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      osUptime: os.uptime(),
    }
  };
};

module.exports = {
  trackServerMetrics,
  getAnalyticsReport,
};
