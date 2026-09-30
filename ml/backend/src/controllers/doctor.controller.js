const { DoctorModel } = require('../models/doctor.model');
const { UserModel } = require('../models/user.model');
const { AssessmentHistoryModel } = require('../models/assessmentHistory.model');
const { AlertModel } = require('../models/alert.model');

const getAuthorizedPatients = async (req, res, next) => {
  try {
    const doctorId = req.user.id;
    const search = req.query.search ? req.query.search.toLowerCase() : '';

    let patients = await DoctorModel.getAuthorizedPatients(doctorId);

    if (search) {
      patients = patients.filter(p => 
        p.name.toLowerCase().includes(search) || 
        p.email.toLowerCase().includes(search) ||
        p.id.toLowerCase().includes(search)
      );
    }

    res.status(200).json({
      message: 'Authorized patient list retrieved successfully',
      count: patients.length,
      patients
    });
  } catch (error) {
    next(error);
  }
};

const getPatientSummary = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const patientUser = await UserModel.findById(patientId);
    if (!patientUser) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const historyResult = await AssessmentHistoryModel.findByPatientId(patientId, { sort: 'newest', limit: 20 });
    const trends = await AssessmentHistoryModel.getTrends(patientId, 'all');
    const alerts = await AlertModel.findByPatientId(patientId, { sort: 'newest' });
    const consultations = await DoctorModel.getConsultations(patientId);

    res.status(200).json({
      message: 'Patient medical summary retrieved successfully',
      patient: patientUser,
      assessments: historyResult.records || [],
      trends,
      alerts,
      consultations
    });
  } catch (error) {
    next(error);
  }
};

const getConsultations = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const consultations = await DoctorModel.getConsultations(patientId);

    res.status(200).json({
      message: 'Consultations log retrieved successfully',
      consultations
    });
  } catch (error) {
    next(error);
  }
};

const createConsultation = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { notes, followUpDate, observations } = req.body;

    if (!notes || notes.trim() === '') {
      return res.status(400).json({ error: 'Validation Error: Consultation notes are required' });
    }

    const consultation = await DoctorModel.createConsultation({
      doctorId: req.user.id,
      patientId,
      notes: notes.trim(),
      followUpDate: followUpDate || null,
      observations: observations || 'Routine clinical observations.'
    });

    res.status(201).json({
      message: 'Consultation note recorded successfully',
      consultation
    });
  } catch (error) {
    next(error);
  }
};

// Grant permission endpoint for testing & patient setting management
const setPermission = async (req, res, next) => {
  try {
    const { doctorId, patientId, status = 'AUTHORIZED' } = req.body;

    if (!doctorId || !patientId) {
      return res.status(400).json({ error: 'Validation Error: doctorId and patientId are required' });
    }

    const perm = await DoctorModel.setPermission({ doctorId, patientId, status });

    res.status(200).json({
      message: `Doctor-patient permission updated to ${status}`,
      permission: perm
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuthorizedPatients,
  getPatientSummary,
  getConsultations,
  createConsultation,
  setPermission
};
