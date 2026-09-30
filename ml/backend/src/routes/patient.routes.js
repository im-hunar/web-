const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { checkPatientDataOwnership } = require('../middleware/ownership.middleware');
const { ROLES } = require('../models/user.model');

// Protected route: requiring auth, allowed roles (PATIENT, DOCTOR, CAREGIVER, ADMIN), and ownership check
router.get(
  '/:patientId/data',
  authenticateToken,
  authorizeRoles(ROLES.PATIENT, ROLES.DOCTOR, ROLES.CAREGIVER, ROLES.ADMIN),
  checkPatientDataOwnership,
  patientController.getPatientData
);

module.exports = router;
