const express = require('express');
const router = express.Router();
const historyController = require('../controllers/history.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Protected routes for patient history
router.get('/', authenticateToken, historyController.getHistory);
router.get('/:id', authenticateToken, historyController.getHistoryById);

module.exports = router;
