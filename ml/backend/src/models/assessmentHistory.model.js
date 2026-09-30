const store = require('../db/store');

class AssessmentHistoryModel {
  static async create(data) {
    return await store.createAssessment(data);
  }

  static async findByPatientId(patientId, options) {
    return await store.getAssessmentsByPatientId(patientId, options);
  }

  static async findById(id) {
    return await store.getAssessmentById(id);
  }

  static async getTrends(patientId, timeframe) {
    return await store.getTrendsByPatientId(patientId, timeframe);
  }
}

module.exports = { AssessmentHistoryModel };
