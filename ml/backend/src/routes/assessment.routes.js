const express = require('express');
const router = express.Router();
const assessmentController = require('../controllers/assessment.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// Protected route: requiring valid JWT cookie/header
router.post('/', authenticateToken, assessmentController.submitAssessment);

module.exports = router;
