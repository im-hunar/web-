const { ReminderModel } = require('../models/reminder.model');
const { CaregiverPermissionModel } = require('../models/caregiverPermission.model');
const { ROLES } = require('../models/user.model');

const getReminders = async (req, res, next) => {
  try {
    let patientId = req.user.id;

    if (req.user.role === ROLES.CAREGIVER) {
      patientId = req.query.patientId;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request: patientId query parameter is required for caregiver' });
      }

      const hasPerm = await CaregiverPermissionModel.hasPermission(req.user.id, patientId, 'reminders');
      if (!hasPerm) {
        return res.status(403).json({
          error: 'Forbidden: Access denied. Patient has not granted Reminders permission to caregiver'
        });
      }
    } else if (req.user.role === ROLES.PATIENT) {
      if (req.query.patientId && req.query.patientId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: You cannot access another patient\'s reminders' });
      }
      patientId = req.user.id;
    } else if (req.user.role === ROLES.DOCTOR || req.user.role === ROLES.ADMIN) {
      patientId = req.query.patientId || req.user.id;
    }

    const reminders = await ReminderModel.findByPatientId(patientId);

    res.status(200).json({
      message: 'Reminders retrieved successfully',
      reminders
    });
  } catch (error) {
    next(error);
  }
};

const createReminder = async (req, res, next) => {
  try {
    // Caregiver cannot modify patient medical records / reminders
    if (req.user.role === ROLES.CAREGIVER) {
      return res.status(403).json({
        error: 'Forbidden: Caregivers cannot modify medical records or create reminders'
      });
    }

    const { title, dueDate, type, priority, notes } = req.body;
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Validation Error: Reminder title is required' });
    }

    const patientId = req.user.role === ROLES.PATIENT ? req.user.id : (req.body.patientId || req.user.id);

    const reminder = await ReminderModel.create({
      patientId,
      title: title.trim(),
      dueDate,
      type,
      priority,
      notes
    });

    res.status(201).json({
      message: 'Reminder created successfully',
      reminder
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReminders,
  createReminder
};
