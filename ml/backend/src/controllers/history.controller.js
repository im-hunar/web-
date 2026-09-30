const { AssessmentHistoryModel } = require('../models/assessmentHistory.model');
const { CaregiverPermissionModel } = require('../models/caregiverPermission.model');
const { ROLES } = require('../models/user.model');

const getHistory = async (req, res, next) => {
  try {
    let patientId = req.user.id;

    if (req.user.role === ROLES.CAREGIVER) {
      patientId = req.query.patientId;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request: patientId parameter is required for caregiver access' });
      }

      const hasPerm = await CaregiverPermissionModel.hasPermission(req.user.id, patientId, 'assessments');
      if (!hasPerm) {
        return res.status(403).json({
          error: 'Forbidden: Access denied. Patient has not granted assessments permission to caregiver'
        });
      }
    } else if (req.user.role === ROLES.PATIENT) {
      if (req.query.patientId && req.query.patientId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to access another patient\'s data' });
      }
      patientId = req.user.id;
    } else if (req.user.role === ROLES.DOCTOR || req.user.role === ROLES.ADMIN) {
      patientId = req.query.patientId || req.user.id;
    }

    const { sort = 'newest', startDate, endDate, page = 1, limit = 10 } = req.query;

    const result = await AssessmentHistoryModel.findByPatientId(patientId, {
      sort,
      startDate,
      endDate,
      page: Number(page),
      limit: Number(limit)
    });

    res.status(200).json({
      message: 'Assessment history retrieved successfully',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

const getHistoryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const record = await AssessmentHistoryModel.findById(id);

    if (!record) {
      return res.status(404).json({ error: 'Assessment record not found' });
    }

    // Patient Data Isolation check (IDOR protection)
    if (req.user.role === ROLES.PATIENT && record.patientId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only access your own assessment records' });
    }

    // Caregiver Permission check
    if (req.user.role === ROLES.CAREGIVER) {
      const hasPerm = await CaregiverPermissionModel.hasPermission(req.user.id, record.patientId, 'assessments');
      if (!hasPerm) {
        return res.status(403).json({
          error: 'Forbidden: Access denied. Patient has not granted assessments permission to caregiver'
        });
      }
    }

    res.status(200).json({
      message: 'Assessment record retrieved successfully',
      record
    });
  } catch (error) {
    next(error);
  }
};

const getTrends = async (req, res, next) => {
  try {
    let patientId = req.user.id;

    if (req.user.role === ROLES.CAREGIVER) {
      patientId = req.query.patientId;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request: patientId parameter is required for caregiver access' });
      }

      const hasPerm = await CaregiverPermissionModel.hasPermission(req.user.id, patientId, 'trends');
      if (!hasPerm) {
        return res.status(403).json({
          error: 'Forbidden: Access denied. Patient has not granted trends permission to caregiver'
        });
      }
    } else if (req.user.role === ROLES.PATIENT) {
      if (req.query.patientId && req.query.patientId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to access another patient\'s data' });
      }
      patientId = req.user.id;
    } else if (req.user.role === ROLES.DOCTOR || req.user.role === ROLES.ADMIN) {
      patientId = req.query.patientId || req.user.id;
    }

    const { timeframe = 'all' } = req.query; // 'weekly', 'monthly', 'all'

    const trends = await AssessmentHistoryModel.getTrends(patientId, timeframe);

    res.status(200).json({
      message: 'Health trends retrieved successfully',
      timeframe,
      trends
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHistory,
  getHistoryById,
  getTrends
};
