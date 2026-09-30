const store = require('../db/store');

class PatientDataModel {
  static async set(patientId, data) {
    return await store.setPatientData(patientId, data);
  }

  static async getByPatientId(patientId) {
    return await store.getPatientData(patientId);
  }
}

module.exports = { PatientDataModel };
