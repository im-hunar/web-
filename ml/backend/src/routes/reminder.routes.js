const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminder.controller');
const { authenticateToken } = require('../middleware/auth.middleware');
const { denyCaregiverAction } = require('../middleware/caregiverAuth.middleware');

router.get('/', authenticateToken, reminderController.getReminders);
router.post(
  '/',
  authenticateToken,
  denyCaregiverAction('modify medical records or create reminders'),
  reminderController.createReminder
);

module.exports = router;
