const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { handleUpload } = require('../middleware/upload.middleware');
const { denyCaregiverAction } = require('../middleware/caregiverAuth.middleware');

// Protected Medical Report Endpoints (Require valid authentication)
router.get('/', authenticateToken, reportController.getReports);
router.get('/ai-summary', authenticateToken, reportController.getAiMedicalSummary);
router.get('/:id', authenticateToken, reportController.getReportById);
router.get('/:id/view', authenticateToken, reportController.viewReport);
router.get('/:id/download', authenticateToken, reportController.downloadReport);

// Secure Upload (MIME validation, extension check, 10MB limit, random UUID filenames)
router.post(
  '/upload',
  authenticateToken,
  denyCaregiverAction('upload or modify medical records'),
  handleUpload,
  reportController.uploadReport
);

// Delete Report (Only patient/doctor, caregiver prohibited)
router.delete(
  '/:id',
  authenticateToken,
  denyCaregiverAction('modify or delete medical records'),
  reportController.deleteReport
);

module.exports = router;
