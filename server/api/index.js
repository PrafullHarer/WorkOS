// Load .env only if it exists (local dev); Vercel injects env vars directly
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('../config/db');
const errorHandler = require('../middleware/errorHandler');
const authRoutes = require('../routes/authRoutes');
const taskRoutes = require('../routes/taskRoutes');
const categoryRoutes = require('../routes/categoryRoutes');
const adminRoutes = require('../routes/adminRoutes');
const { trackServerMetrics } = require('../utils/analyticsTracker');

const app = express();

// Log env availability on cold start (redacted for security)
console.log('[Boot] MONGODB_URI set:', !!process.env.MONGODB_URI);
console.log('[Boot] JWT_SECRET set:', !!process.env.JWT_SECRET);
console.log('[Boot] JWT_REFRESH_SECRET set:', !!process.env.JWT_REFRESH_SECRET);
console.log('[Boot] CLIENT_URL:', process.env.CLIENT_URL || '(not set)');
console.log('[Boot] NODE_ENV:', process.env.NODE_ENV || '(not set)');

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());
app.use(trackServerMetrics);

// Ensure DB is connected before handling any request (critical for serverless cold starts)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection middleware error:', err.message);
    res.status(503).json({ error: 'Database connection failed: ' + err.message });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

// Start server (only in non-serverless mode)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel serverless
module.exports = app;

