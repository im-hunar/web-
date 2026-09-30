const { CaregiverPermissionModel } = require('../models/caregiverPermission.model');
const { ROLES } = require('../models/user.model');

/**
 * Middleware factory enforcing caregiver permission checks.
 * If user is PATIENT, verifies target is own patient ID (IDOR protection).
 * If user is CAREGIVER, verifies active CaregiverPermission with the requested permission flag.
 * If user is DOCTOR or ADMIN, allows standard clinical access.
 */
const requireResourceAccess = (resourceType) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    // Determine target patient ID
    const targetPatientId = req.query.patientId || req.params.patientId || req.body.patientId || req.user.id;

    if (req.user.role === ROLES.PATIENT) {
      // Patient cannot access other patients' data (IDOR protection)
      if (targetPatientId !== req.user.id) {
        return res.status(403).json({
          error: 'Forbidden: You are not authorized to access another patient\'s data'
        });
      }
      return next();
    }

    if (req.user.role === ROLES.CAREGIVER) {
      if (!req.query.patientId && !req.params.patientId && !req.body.patientId) {
        return res.status(400).json({
          error: 'Bad Request: patientId parameter is required for caregiver access'
        });
      }

      const hasPerm = await CaregiverPermissionModel.hasPermission(
        req.user.id,
        targetPatientId,
        resourceType
      );

      if (!hasPerm) {
        return res.status(403).json({
          error: `Forbidden: Access denied. Patient has not granted ${resourceType} permission to this caregiver`
        });
      }

      return next();
    }

    if (req.user.role === ROLES.DOCTOR || req.user.role === ROLES.ADMIN) {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden: Role unauthorized to access this resource' });
  };
};

/**
 * Middleware preventing caregivers from performing prohibited mutations:
 * - Modify medical records
 * - Run assessments on behalf of patient
 * - Change patient information
 * - Grant permissions to others
 */
const denyCaregiverAction = (actionDescription) => {
  return (req, res, next) => {
    if (req.user && req.user.role === ROLES.CAREGIVER) {
      return res.status(403).json({
        error: `Forbidden: Caregivers cannot ${actionDescription}`
      });
    }
    next();
  };
};

module.exports = {
  requireResourceAccess,
  denyCaregiverAction
};
