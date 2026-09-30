const { AlertModel } = require('../models/alert.model');
const { CaregiverPermissionModel } = require('../models/caregiverPermission.model');
const { ROLES } = require('../models/user.model');

const getAlerts = async (req, res, next) => {
  try {
    const { level, read, sort = 'newest' } = req.query;

    let alerts = [];
    if (req.user.role === ROLES.PATIENT) {
      if (req.query.patientId && req.query.patientId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: You cannot access another patient\'s alerts' });
      }
      alerts = await AlertModel.findByPatientId(req.user.id, { level, read, sort });
    } else if (req.user.role === ROLES.CAREGIVER) {
      const patientId = req.query.patientId;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request: patientId parameter is required for caregiver access' });
      }

      const hasPerm = await CaregiverPermissionModel.hasPermission(req.user.id, patientId, 'alerts');
      if (!hasPerm) {
        return res.status(403).json({
          error: 'Forbidden: Access denied. Patient has not granted alerts permission to caregiver'
        });
      }

      alerts = await AlertModel.findByPatientId(patientId, { level, read, sort });
    } else if (req.user.role === ROLES.DOCTOR || req.user.role === ROLES.ADMIN) {
      // Authorized doctors/admins view patient alerts
      alerts = await AlertModel.findForDoctor([], { level, read, sort });
    } else {
      return res.status(403).json({ error: 'Forbidden: Role unauthorized to view health alerts' });
    }

    const unreadCount = alerts.filter(a => !a.read).length;

    res.status(200).json({
      message: 'Alerts retrieved successfully',
      unreadCount,
      alerts
    });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    // Caregiver cannot modify medical records or alerts
    if (req.user.role === ROLES.CAREGIVER) {
      return res.status(403).json({
        error: 'Forbidden: Caregivers cannot modify medical alerts or records'
      });
    }

    const { id } = req.params;
    const alert = await AlertModel.findById(id);

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    // Ownership & RBAC check
    if (req.user.role === ROLES.PATIENT && alert.patientId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You cannot access another patient\'s alerts' });
    }

    const updatedAlert = await AlertModel.markAsRead(id, req.user.id);

    res.status(200).json({
      message: 'Alert marked as read',
      alert: updatedAlert
    });
  } catch (error) {
    next(error);
  }
};

const getConfig = async (req, res, next) => {
  try {
    const patientId = req.query.patientId || req.user.id;

    if (req.user.role === ROLES.PATIENT && patientId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Cannot access another patient\'s threshold settings' });
    }

    if (req.user.role === ROLES.CAREGIVER) {
      const hasPerm = await CaregiverPermissionModel.hasPermission(req.user.id, patientId, 'alerts');
      if (!hasPerm) {
        return res.status(403).json({
          error: 'Forbidden: Access denied. Patient has not granted alerts permission to caregiver'
        });
      }
    }

    const config = await AlertModel.getConfig(patientId);

    res.status(200).json({
      message: 'Monitoring thresholds retrieved successfully',
      config
    });
  } catch (error) {
    next(error);
  }
};

const updateConfig = async (req, res, next) => {
  try {
    // Caregiver cannot change patient information
    if (req.user.role === ROLES.CAREGIVER) {
      return res.status(403).json({
        error: 'Forbidden: Caregivers cannot change patient information or threshold configurations'
      });
    }

    const patientId = req.body.patientId || req.user.id;

    if (req.user.role === ROLES.PATIENT && patientId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Cannot modify another patient\'s threshold settings' });
    }

    const updatedConfig = await AlertModel.updateConfig(patientId, req.body, req.user.id);

    res.status(200).json({
      message: 'Monitoring thresholds updated successfully',
      config: updatedConfig
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAlerts,
  markAsRead,
  getConfig,
  updateConfig
};
