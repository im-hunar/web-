const store = require('../db/store');

const ALERT_LEVELS = {
  INFO: 'INFO',
  NOTICE: 'NOTICE',
  REVIEW: 'REVIEW'
};

const TRIGGER_TYPES = {
  REPEATED_CONCERNING_ASSESSMENT: 'REPEATED_CONCERNING_ASSESSMENT',
  SIGNIFICANT_MEASUREMENT_CHANGE: 'SIGNIFICANT_MEASUREMENT_CHANGE',
  MISSED_FOLLOWUP: 'MISSED_FOLLOWUP',
  CONFIGURED_CONDITION: 'CONFIGURED_CONDITION'
};

class AlertModel {
  static ALERT_LEVELS = ALERT_LEVELS;
  static TRIGGER_TYPES = TRIGGER_TYPES;

  static async create(data) {
    return await store.createAlert(data);
  }

  static async findByPatientId(patientId, options) {
    return await store.getAlertsByPatientId(patientId, options);
  }

  static async findForDoctor(doctorPatientIds, options) {
    return await store.getAlertsForDoctor(doctorPatientIds, options);
  }

  static async findById(id) {
    return await store.getAlertById(id);
  }

  static async markAsRead(id, actorId) {
    return await store.markAlertAsRead(id, actorId);
  }

  static async getConfig(patientId) {
    return await store.getAlertConfig(patientId);
  }

  static async updateConfig(patientId, configData, actorId) {
    return await store.setAlertConfig(patientId, configData, actorId);
  }
}

module.exports = { AlertModel, ALERT_LEVELS, TRIGGER_TYPES };
