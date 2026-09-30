const { ROLES } = require('../models/user.model');
const { CaregiverPermissionModel } = require('../models/caregiverPermission.model');

const checkPatientDataOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const targetPatientId = req.params.patientId || req.params.id;

    if (!targetPatientId) {
      return res.status(400).json({ error: 'Bad Request: Patient identifier missing from request' });
    }

    // Caregivers cannot modify patient records
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.user.role === ROLES.CAREGIVER) {
      return res.status(403).json({
        error: 'Forbidden: Caregivers cannot modify medical records or patient information'
      });
    }

    // PATIENT role can ONLY access their own data
    if (req.user.role === ROLES.PATIENT) {
      if (req.user.id !== targetPatientId) {
        return res.status(403).json({
          error: 'Forbidden: You are not authorized to access another patient\'s data'
        });
      }
    }

    // CAREGIVER role requires active permission granted by the specific patient
    if (req.user.role === ROLES.CAREGIVER) {
      const hasPerm = await CaregiverPermissionModel.hasPermission(req.user.id, targetPatientId, 'reports');
      if (!hasPerm) {
        return res.status(403).json({
          error: 'Forbidden: Access denied. Patient has not granted medical records/reports permission to caregiver'
        });
      }
    }

    // DOCTOR, ADMIN possess medical authorization to view patient record
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { checkPatientDataOwnership };
