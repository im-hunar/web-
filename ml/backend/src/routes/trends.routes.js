const express = require('express');
const router = express.Router();
const historyController = require('../controllers/history.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Protected route for patient health trends
router.get('/', authenticateToken, historyController.getTrends);

module.exports = router;
