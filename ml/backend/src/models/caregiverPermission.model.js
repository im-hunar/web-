const store = require('../db/store');

const PERMISSION_TYPES = {
  ASSESSMENTS: 'assessments',
  TRENDS: 'trends',
  ALERTS: 'alerts',
  REMINDERS: 'reminders',
  REPORTS: 'reports'
};

const DEFAULT_PERMISSIONS = {
  assessments: false,
  trends: false,
  alerts: false,
  reminders: false,
  reports: false
};

class CaregiverPermissionModel {
  static PERMISSION_TYPES = PERMISSION_TYPES;
  static DEFAULT_PERMISSIONS = DEFAULT_PERMISSIONS;

  static async create({ patientId, caregiverId, caregiverName, caregiverEmail, permissions = {} }) {
    // Default permission is explicitly NO ACCESS unless overridden
    return await store.createCaregiverPermission({
      patientId,
      caregiverId,
      caregiverName,
      caregiverEmail,
      permissions
    });
  }

  static async updatePermissions({ patientId, caregiverId, permissions, actorId }) {
    return await store.updateCaregiverPermissions({
      patientId,
      caregiverId,
      permissions,
      actorId
    });
  }

  static async revoke({ patientId, caregiverId, actorId }) {
    return await store.revokeCaregiverAccess({
      patientId,
      caregiverId,
      actorId
    });
  }

  static async getByPatientId(patientId) {
    return await store.getCaregiverPermissionsForPatient(patientId);
  }

  static async getByPatientAndCaregiver(patientId, caregiverId) {
    return await store.getCaregiverPermission(patientId, caregiverId);
  }

  static async getPatientsForCaregiver(caregiverId) {
    return await store.getPatientsForCaregiver(caregiverId);
  }

  static async hasPermission(caregiverId, patientId, resourceType) {
    return await store.hasCaregiverPermission(caregiverId, patientId, resourceType);
  }

  static async getAuditLogs(patientId) {
    return await store.getAuditLogsForPatient(patientId);
  }
}

module.exports = {
  CaregiverPermissionModel,
  PERMISSION_TYPES,
  DEFAULT_PERMISSIONS
};
