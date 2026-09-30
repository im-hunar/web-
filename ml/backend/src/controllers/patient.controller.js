const { PatientDataModel } = require('../models/patientData.model');

const getPatientData = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    let data = await PatientDataModel.getByPatientId(patientId);
    
    if (!data) {
      // Create initial sample data for requested patient if not exists
      data = await PatientDataModel.set(patientId, {
        heartRate: 72,
        restingBP: 120,
        cholesterol: 195,
        riskPrediction: 'Low Risk',
        notes: 'Patient resting parameters within normal clinical ranges.'
      });
    }

    res.status(200).json({
      message: 'Patient data retrieved successfully',
      data
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPatientData };
