const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { loginRateLimiter } = require('../middleware/rateLimit.middleware');
const { validateRegister, validateLogin } = require('../middleware/validation.middleware');

// Public routes
router.post('/register', validateRegister, authController.register);
router.post('/login', loginRateLimiter, validateLogin, authController.login);
router.post('/logout', authController.logout);
router.post('/demo-switch', authController.demoSwitch);

// Protected routes
router.get('/me', authenticateToken, authController.getMe);

module.exports = router;
