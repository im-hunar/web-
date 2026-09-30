const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alert.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Protected routes for alerts and monitoring threshold configuration
router.get('/', authenticateToken, alertController.getAlerts);
router.patch('/:id/read', authenticateToken, alertController.markAsRead);
router.get('/config', authenticateToken, alertController.getConfig);
router.put('/config', authenticateToken, alertController.updateConfig);

module.exports = router;
