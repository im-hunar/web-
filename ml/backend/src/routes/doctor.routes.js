const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctor.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { authorizeRoles } = require('../middleware/role.middleware');
const { verifyDoctorPatientAuth } = require('../middleware/doctorAuth.middleware');
const { ROLES } = require('../models/user.model');

// Permission management (Patients can grant doctor permissions)
router.post('/permissions', authenticateToken, doctorController.setPermission);

// Doctor Dashboard Routes (Protected by auth, DOCTOR/ADMIN role, and explicit DoctorPatientPermission verification)
router.get(
  '/patients',
  authenticateToken,
  authorizeRoles(ROLES.DOCTOR, ROLES.ADMIN),
  doctorController.getAuthorizedPatients
);

router.get(
  '/patients/:patientId/summary',
  authenticateToken,
  authorizeRoles(ROLES.DOCTOR, ROLES.ADMIN),
  verifyDoctorPatientAuth, // Strict backend authorization check!
  doctorController.getPatientSummary
);

router.get(
  '/patients/:patientId/consultations',
  authenticateToken,
  authorizeRoles(ROLES.DOCTOR, ROLES.ADMIN),
  verifyDoctorPatientAuth, // Strict backend authorization check!
  doctorController.getConsultations
);

router.post(
  '/patients/:patientId/consultations',
  authenticateToken,
  authorizeRoles(ROLES.DOCTOR, ROLES.ADMIN),
  verifyDoctorPatientAuth, // Strict backend authorization check!
  doctorController.createConsultation
);

module.exports = router;
