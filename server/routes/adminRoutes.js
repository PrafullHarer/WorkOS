const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { getSystemStats, verifyCredentials } = require('../controllers/adminController');

// All routes require admin credentials
router.use(adminAuth);

router.post('/verify', verifyCredentials);
router.get('/stats', getSystemStats);

module.exports = router;
