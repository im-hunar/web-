const store = require('../db/store');

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png'
];

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png'
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

class ReportModel {
  static ALLOWED_MIME_TYPES = ALLOWED_MIME_TYPES;
  static ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS;
  static MAX_FILE_SIZE = MAX_FILE_SIZE;

  static async create(reportData) {
    return await store.createReport(reportData);
  }

  static async findByPatientId(patientId) {
    return await store.getReportsByPatientId(patientId);
  }

  static async findById(id) {
    return await store.getReportById(id);
  }

  static async delete(id, actorId) {
    return await store.deleteReport(id, actorId);
  }
}

module.exports = {
  ReportModel,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE
};
