const store = require('../db/store');

class ReminderModel {
  static async create(reminderData) {
    return await store.createReminder(reminderData);
  }

  static async findByPatientId(patientId) {
    return await store.getRemindersByPatientId(patientId);
  }
}

module.exports = { ReminderModel };
