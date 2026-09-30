const store = require('../db/store');

class DoctorModel {
  static async getProfile(doctorId) {
    return await store.getDoctorProfile(doctorId);
  }

  static async updateProfile(profileData) {
    return await store.createDoctorProfile(profileData);
  }

  static async setPermission({ doctorId, patientId, status = 'AUTHORIZED' }) {
    return await store.setDoctorPatientPermission({ doctorId, patientId, status });
  }

  static async hasPermission(doctorId, patientId) {
    return await store.hasDoctorPatientPermission(doctorId, patientId);
  }

  static async getAuthorizedPatients(doctorId) {
    return await store.getAuthorizedPatientsForDoctor(doctorId);
  }

  static async createConsultation(data) {
    return await store.createConsultation(data);
  }

  static async getConsultations(patientId) {
    return await store.getConsultationsForPatient(patientId);
  }
}

module.exports = { DoctorModel };
