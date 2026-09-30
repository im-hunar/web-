const express = require('express');
const router = express.Router();
const privacyController = require('../controllers/privacy.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { denyCaregiverAction } = require('../middleware/caregiverAuth.middleware');

// Patient Caregiver Delegation & Privacy Controls
router.get('/caregivers', authenticateToken, privacyController.getCaregivers);
router.post(
  '/caregivers/invite',
  authenticateToken,
  denyCaregiverAction('grant permissions to others'),
  privacyController.inviteCaregiver
);
router.put(
  '/caregivers/:caregiverId/permissions',
  authenticateToken,
  denyCaregiverAction('grant permissions to others'),
  privacyController.updatePermissions
);
router.post(
  '/caregivers/:caregiverId/revoke',
  authenticateToken,
  denyCaregiverAction('grant permissions to others'),
  privacyController.revokeAccess
);
router.delete(
  '/caregivers/:caregiverId',
  authenticateToken,
  denyCaregiverAction('grant permissions to others'),
  privacyController.revokeAccess
);
router.get('/audit-logs', authenticateToken, privacyController.getAuditLogs);

// Caregiver Access Routes
router.get('/my-patients', authenticateToken, privacyController.getMyPatients);
router.get('/patient/:patientId/summary', authenticateToken, privacyController.getCaregiverPatientSummary);

module.exports = router;
