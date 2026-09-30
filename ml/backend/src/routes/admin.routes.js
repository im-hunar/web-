const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { ROLES } = require('../models/user.model');

// ADMIN role only route
router.get(
  '/dashboard',
  authenticateToken,
  authorizeRoles(ROLES.ADMIN),
  adminController.getAdminDashboard
);

module.exports = router;
