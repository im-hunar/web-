const { z } = require('zod');
const { CaregiverPermissionModel, PERMISSION_TYPES } = require('../models/caregiverPermission.model');
const { UserModel, ROLES } = require('../models/user.model');
const { AssessmentHistoryModel } = require('../models/assessmentHistory.model');
const { AlertModel } = require('../models/alert.model');
const { ReminderModel } = require('../models/reminder.model');
const { ReportModel } = require('../models/report.model');

// Validation schemas
const inviteSchema = z.object({
  email: z.string().email({ message: 'A valid email address is required' }),
  name: z.string().min(1, { message: 'Caregiver name is required' }).max(100),
  permissions: z.object({
    assessments: z.boolean().optional(),
    trends: z.boolean().optional(),
    alerts: z.boolean().optional(),
    reminders: z.boolean().optional(),
    reports: z.boolean().optional()
  }).optional()
});

const updatePermissionsSchema = z.object({
  permissions: z.object({
    assessments: z.boolean().optional(),
    trends: z.boolean().optional(),
    alerts: z.boolean().optional(),
    reminders: z.boolean().optional(),
    reports: z.boolean().optional()
  })
});

const getCaregivers = async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.PATIENT) {
      return res.status(403).json({ error: 'Forbidden: Only patients can view their caregiver delegation settings' });
    }

    const patientId = req.user.id;
    const caregivers = await CaregiverPermissionModel.getByPatientId(patientId);

    res.status(200).json({
      message: 'Caregivers retrieved successfully',
      caregivers
    });
  } catch (error) {
    next(error);
  }
};

const inviteCaregiver = async (req, res, next) => {
  try {
    // Caregiver cannot grant permissions to others
    if (req.user.role === ROLES.CAREGIVER) {
      return res.status(403).json({ error: 'Forbidden: Caregivers cannot grant permissions to others' });
    }

    if (req.user.role !== ROLES.PATIENT) {
      return res.status(403).json({ error: 'Forbidden: Only patients can invite caregivers' });
    }

    const parseResult = inviteSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error',
        details: parseResult.error.errors
      });
    }

    const { email, name, permissions } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Prevent patient from inviting themselves
    if (normalizedEmail === req.user.email.toLowerCase().trim()) {
      return res.status(400).json({ error: 'Bad Request: You cannot invite yourself as a caregiver' });
    }

    // Check if user already exists or create new caregiver user
    let caregiverUser = await UserModel.findByEmail(normalizedEmail);
    if (!caregiverUser) {
      // Create caregiver account with temporary secure credentials
      caregiverUser = await UserModel.create({
        email: normalizedEmail,
        password: `Caregiver_${Date.now()}_Pass!`,
        name,
        role: ROLES.CAREGIVER
      });
    }

    // Default permission is explicitly NO ACCESS unless requested by patient
    // Patient must explicitly grant access
    const initialPermissions = permissions || {
      assessments: false,
      trends: false,
      alerts: false,
      reminders: false,
      reports: false
    };

    const record = await CaregiverPermissionModel.create({
      patientId: req.user.id,
      caregiverId: caregiverUser.id,
      caregiverName: name || caregiverUser.name,
      caregiverEmail: normalizedEmail,
      permissions: initialPermissions
    });

    res.status(201).json({
      message: 'Caregiver invited successfully. Default permission set to NO ACCESS until explicitly granted.',
      permission: record
    });
  } catch (error) {
    next(error);
  }
};

const updatePermissions = async (req, res, next) => {
  try {
    // Caregiver cannot grant permissions to others
    if (req.user.role === ROLES.CAREGIVER) {
      return res.status(403).json({ error: 'Forbidden: Caregivers cannot grant permissions to others' });
    }

    if (req.user.role !== ROLES.PATIENT) {
      return res.status(403).json({ error: 'Forbidden: Only patients can manage caregiver permissions' });
    }

    const { caregiverId } = req.params;
    if (!caregiverId) {
      return res.status(400).json({ error: 'Bad Request: Caregiver identifier is required' });
    }

    const parseResult = updatePermissionsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation Error: Invalid permissions format',
        details: parseResult.error.errors
      });
    }

    const existing = await CaregiverPermissionModel.getByPatientAndCaregiver(req.user.id, caregiverId);
    if (!existing) {
      return res.status(404).json({ error: 'Caregiver relationship not found for this patient' });
    }

    const updated = await CaregiverPermissionModel.updatePermissions({
      patientId: req.user.id,
      caregiverId,
      permissions: parseResult.data.permissions,
      actorId: req.user.id
    });

    res.status(200).json({
      message: 'Caregiver permissions updated successfully',
      permission: updated
    });
  } catch (error) {
    next(error);
  }
};

const revokeAccess = async (req, res, next) => {
  try {
    if (req.user.role === ROLES.CAREGIVER) {
      return res.status(403).json({ error: 'Forbidden: Caregivers cannot modify permissions' });
    }

    if (req.user.role !== ROLES.PATIENT) {
      return res.status(403).json({ error: 'Forbidden: Only patients can revoke caregiver access' });
    }

    const { caregiverId } = req.params;
    if (!caregiverId) {
      return res.status(400).json({ error: 'Bad Request: Caregiver identifier is required' });
    }

    const existing = await CaregiverPermissionModel.getByPatientAndCaregiver(req.user.id, caregiverId);
    if (!existing) {
      return res.status(404).json({ error: 'Caregiver relationship not found for this patient' });
    }

    const revoked = await CaregiverPermissionModel.revoke({
      patientId: req.user.id,
      caregiverId,
      actorId: req.user.id
    });

    res.status(200).json({
      message: 'Caregiver access revoked successfully. All permissions have been deactivated.',
      permission: revoked
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.PATIENT) {
      return res.status(403).json({ error: 'Forbidden: Only patients can view their privacy audit logs' });
    }

    const logs = await CaregiverPermissionModel.getAuditLogs(req.user.id);

    res.status(200).json({
      message: 'Privacy audit trail retrieved successfully',
      logs
    });
  } catch (error) {
    next(error);
  }
};

// Caregiver portal methods
const getMyPatients = async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.CAREGIVER) {
      return res.status(403).json({ error: 'Forbidden: Only caregivers can access caregiver patient list' });
    }

    const patients = await CaregiverPermissionModel.getPatientsForCaregiver(req.user.id);

    res.status(200).json({
      message: 'Linked patients retrieved successfully',
      patients
    });
  } catch (error) {
    next(error);
  }
};

const getCaregiverPatientSummary = async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.CAREGIVER) {
      return res.status(403).json({ error: 'Forbidden: Only caregivers can access this endpoint' });
    }

    const { patientId } = req.params;
    const perm = await CaregiverPermissionModel.getByPatientAndCaregiver(patientId, req.user.id);

    if (!perm || perm.status !== 'ACTIVE') {
      return res.status(403).json({
        error: 'Forbidden: Access denied. Patient has revoked or not granted caregiver access'
      });
    }

    const patientUser = await UserModel.findById(patientId);
    if (!patientUser) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const summary = {
      patient: {
        name: patientUser.name,
        id: patientUser.id
      },
      permissionsGranted: perm.permissions,
      data: {}
    };

    // Include assessments if permitted
    if (perm.permissions.assessments) {
      const history = await AssessmentHistoryModel.findByPatientId(patientId, { sort: 'newest', limit: 10 });
      summary.data.assessments = history.records || [];
    } else {
      summary.data.assessments = { access: 'DENIED', reason: 'Patient has not granted Assessments permission' };
    }

    // Include trends if permitted
    if (perm.permissions.trends) {
      summary.data.trends = await AssessmentHistoryModel.getTrends(patientId, 'all');
    } else {
      summary.data.trends = { access: 'DENIED', reason: 'Patient has not granted Health Trends permission' };
    }

    // Include alerts if permitted
    if (perm.permissions.alerts) {
      summary.data.alerts = await AlertModel.findByPatientId(patientId, { sort: 'newest' });
    } else {
      summary.data.alerts = { access: 'DENIED', reason: 'Patient has not granted Alerts permission' };
    }

    // Include reminders if permitted
    if (perm.permissions.reminders) {
      summary.data.reminders = await ReminderModel.findByPatientId(patientId);
    } else {
      summary.data.reminders = { access: 'DENIED', reason: 'Patient has not granted Reminders permission' };
    }

    // Include reports if permitted
    if (perm.permissions.reports) {
      summary.data.reports = await ReportModel.findByPatientId(patientId);
    } else {
      summary.data.reports = { access: 'DENIED', reason: 'Patient has not granted Medical Reports permission' };
    }

    res.status(200).json({
      message: 'Caregiver patient overview retrieved with verified permissions',
      summary
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCaregivers,
  inviteCaregiver,
  updatePermissions,
  revokeAccess,
  getAuditLogs,
  getMyPatients,
  getCaregiverPatientSummary
};
