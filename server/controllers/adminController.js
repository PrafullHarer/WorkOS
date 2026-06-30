const { getAnalyticsReport } = require('../utils/analyticsTracker');

const getSystemStats = async (req, res, next) => {
  try {
    const stats = await getAnalyticsReport();
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

const verifyCredentials = (req, res) => {
  res.json({ status: 'ok', message: 'Credentials verified.' });
};

module.exports = {
  getSystemStats,
  verifyCredentials,
};
