const { DoctorModel } = require('../models/doctor.model');
const { ROLES } = require('../models/user.model');

const verifyDoctorPatientAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    // Admins bypass doctor-patient permission check
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    if (req.user.role !== ROLES.DOCTOR) {
      return res.status(403).json({ error: 'Forbidden: Only authorized medical doctors can access this endpoint' });
    }

    const patientId = req.params.patientId || req.query.patientId || req.body.patientId;

    if (!patientId) {
      return res.status(400).json({ error: 'Bad Request: Patient identifier missing from request' });
    }

    const isAuthorized = await DoctorModel.hasPermission(req.user.id, patientId);

    if (!isAuthorized) {
      return res.status(403).json({
        error: 'Forbidden: Doctor is not authorized to access this patient\'s records. Explicit patient authorization is required.'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { verifyDoctorPatientAuth };
