/**
 * In-memory repository store for HeartGuard entities.
 * Supports thread-safe operations for Users, PatientData, AssessmentHistory, Alerts, AlertConfigs, AuditLogs, DoctorProfiles, DoctorPatientPermissions, and Consultations.
 */

class Store {
  constructor() {
    this.users = new Map();
    this.patientData = new Map();
    this.assessments = [];
    this.alerts = [];
    this.alertConfigs = new Map();
    this.auditLogs = [];
    this.doctorProfiles = new Map(); // doctorId -> profile object
    this.doctorPatientPermissions = []; // [{ doctorId, patientId, status: 'AUTHORIZED'|'REVOKED', grantedAt }]
    this.consultations = []; // [{ id, doctorId, patientId, date, notes, followUpDate, observations, createdAt }]
    this.caregiverPermissions = []; // [{ id, patientId, caregiverId, caregiverName, caregiverEmail, status, permissions, invitedAt, updatedAt, revokedAt }]
    this.reminders = []; // [{ id, patientId, title, dueDate, type, priority, notes, completed, createdAt }]
    this.reports = []; // [{ id, patientId, title, doctorName, date, summary, diagnosis, vitals, recommendations, createdAt }]
    this.reset();
  }

  reset() {
    this.users.clear();
    this.patientData.clear();
    this.assessments = [];
    this.alerts = [];
    this.alertConfigs.clear();
    this.auditLogs = [];
    this.doctorProfiles.clear();
    this.doctorPatientPermissions = [];
    this.consultations = [];
    this.caregiverPermissions = [];
    this.reminders = [];
    this.reports = [];
  }

  // User operations
  async createUser(userData) {
    const user = {
      id: userData.id || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      email: userData.email.toLowerCase().trim(),
      password: userData.password,
      name: userData.name,
      role: userData.role,
      createdAt: new Date().toISOString()
    };
    this.users.set(user.id, user);
    return { ...user };
  }

  async findUserByEmail(email) {
    if (!email) return null;
    const normalized = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email === normalized) {
        return { ...user };
      }
    }
    return null;
  }

  async findUserById(id) {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  // PatientData operations
  async setPatientData(patientId, data) {
    const record = {
      patientId,
      heartRate: data.heartRate || 75,
      restingBP: data.restingBP || 120,
      cholesterol: data.cholesterol || 200,
      riskPrediction: data.riskPrediction || 'Normal',
      notes: data.notes || 'Patient medical summary',
      updatedAt: new Date().toISOString()
    };
    this.patientData.set(patientId, record);
    return { ...record };
  }

  async getPatientData(patientId) {
    const data = this.patientData.get(patientId);
    return data ? { ...data } : null;
  }

  // AssessmentHistory operations
  async createAssessment(recordData) {
    const record = {
      id: `asm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId: recordData.patientId,
      modelInputs: recordData.modelInputs,
      prediction: recordData.prediction,
      probability: recordData.probability !== undefined ? recordData.probability : null,
      modelVersion: recordData.modelVersion || 'GradientBoostingClassifier v1.0',
      featureExplanationsSupported: recordData.featureExplanationsSupported ?? true,
      featureContributions: recordData.featureContributions || null,
      timestamp: recordData.timestamp || new Date().toISOString()
    };
    this.assessments.push(record);
    return { ...record };
  }

  async getAssessmentsByPatientId(patientId, { sort = 'newest', startDate, endDate, page = 1, limit = 10 } = {}) {
    let filtered = this.assessments.filter(a => a.patientId === patientId);

    if (startDate) {
      const startMs = new Date(startDate).getTime();
      filtered = filtered.filter(a => new Date(a.timestamp).getTime() >= startMs);
    }
    if (endDate) {
      const endMs = new Date(endDate).getTime();
      filtered = filtered.filter(a => new Date(a.timestamp).getTime() <= endMs);
    }

    filtered.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sort === 'oldest' ? timeA - timeB : timeB - timeA;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      records: paginated,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages
    };
  }

  async getAssessmentById(id) {
    const record = this.assessments.find(a => a.id === id);
    return record ? { ...record } : null;
  }

  async getTrendsByPatientId(patientId, timeframe = 'all') {
    let records = this.assessments.filter(a => a.patientId === patientId);
    records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const now = new Date();
    if (timeframe === 'weekly') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      records = records.filter(a => new Date(a.timestamp) >= sevenDaysAgo);
    } else if (timeframe === 'monthly') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      records = records.filter(a => new Date(a.timestamp) >= thirtyDaysAgo);
    }

    return records.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      dateFormatted: new Date(r.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      maxHR: r.modelInputs.maxHR,
      restingBP: r.modelInputs.restingBP,
      cholesterol: r.modelInputs.cholesterol,
      fastingBS: r.modelInputs.fastingBS,
      oldpeak: r.modelInputs.oldpeak,
      exerciseAngina: r.modelInputs.exerciseAngina,
      prediction: r.prediction,
      probabilityHigherRisk: r.probability && typeof r.probability === 'object' && r.probability['1'] !== undefined
        ? Number((r.probability['1'] * 100).toFixed(1))
        : (r.prediction === 1 ? 85 : 15)
    }));
  }

  // Audit Log operations
  async createAuditLog({ action, actorId, patientId, details }) {
    const entry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action,
      actorId,
      patientId,
      details,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.push(entry);
    return { ...entry };
  }

  // Alert operations
  async createAlert(alertData) {
    const alert = {
      id: `alt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId: alertData.patientId,
      alertLevel: alertData.alertLevel,
      triggerType: alertData.triggerType,
      reason: alertData.reason,
      relatedAssessmentId: alertData.relatedAssessmentId || null,
      read: false,
      timestamp: alertData.timestamp || new Date().toISOString(),
      auditLog: [
        {
          action: 'ALERT_GENERATED',
          actorId: 'SYSTEM',
          timestamp: new Date().toISOString()
        }
      ]
    };
    this.alerts.push(alert);

    await this.createAuditLog({
      action: 'ALERT_GENERATED',
      actorId: 'SYSTEM',
      patientId: alertData.patientId,
      details: { alertId: alert.id, level: alert.alertLevel, reason: alert.reason }
    });

    return { ...alert };
  }

  async getAlertsByPatientId(patientId, { level, read, sort = 'newest' } = {}) {
    let filtered = this.alerts.filter(a => a.patientId === patientId);

    if (level) {
      filtered = filtered.filter(a => a.alertLevel === level);
    }
    if (read !== undefined) {
      const isRead = read === 'true' || read === true;
      filtered = filtered.filter(a => a.read === isRead);
    }

    filtered.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sort === 'oldest' ? timeA - timeB : timeB - timeA;
    });

    return filtered.map(a => ({ ...a }));
  }

  async getAlertsForDoctor(doctorPatientIds = [], { level, read, sort = 'newest' } = {}) {
    let filtered = this.alerts.filter(a => doctorPatientIds.includes(a.patientId));

    if (level) {
      filtered = filtered.filter(a => a.alertLevel === level);
    }
    if (read !== undefined) {
      const isRead = read === 'true' || read === true;
      filtered = filtered.filter(a => a.read === isRead);
    }

    filtered.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sort === 'oldest' ? timeA - timeB : timeB - timeA;
    });

    return filtered.map(a => ({ ...a }));
  }

  async getAlertById(id) {
    const alert = this.alerts.find(a => a.id === id);
    return alert ? { ...alert } : null;
  }

  async markAlertAsRead(id, actorId) {
    const alert = this.alerts.find(a => a.id === id);
    if (!alert) return null;

    alert.read = true;
    const auditEntry = {
      action: 'ALERT_MARKED_READ',
      actorId,
      timestamp: new Date().toISOString()
    };
    alert.auditLog.push(auditEntry);

    await this.createAuditLog({
      action: 'ALERT_MARKED_READ',
      actorId,
      patientId: alert.patientId,
      details: { alertId: id }
    });

    return { ...alert };
  }

  // Alert Config operations
  async getAlertConfig(patientId) {
    const defaultConfig = {
      patientId,
      systolicBPThreshold: 140,
      cholesterolThreshold: 240,
      deltaBPThreshold: 20,
      deltaCholesterolThreshold: 30,
      maxConsecutiveHighRisk: 2,
      sourcesDocumentation: 'Thresholds derived from ACC/AHA Hypertension Guidelines & NCEP ATP III. Fully user-configurable.'
    };

    const existing = this.alertConfigs.get(patientId);
    return existing ? { ...existing } : defaultConfig;
  }

  async setAlertConfig(patientId, configData, actorId) {
    const current = await this.getAlertConfig(patientId);
    const updated = {
      ...current,
      ...configData,
      patientId,
      updatedAt: new Date().toISOString()
    };
    this.alertConfigs.set(patientId, updated);

    await this.createAuditLog({
      action: 'ALERT_CONFIG_UPDATED',
      actorId,
      patientId,
      details: updated
    });

    return { ...updated };
  }

  // DoctorProfile operations
  async createDoctorProfile(profileData) {
    const profile = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      doctorId: profileData.doctorId,
      name: profileData.name || 'Dr. Medical Specialist',
      specialty: profileData.specialty || 'Cardiology',
      hospital: profileData.hospital || 'HeartGuard Medical Center',
      licenseNumber: profileData.licenseNumber || 'MD-884920',
      phone: profileData.phone || '+1 (555) 234-5678',
      createdAt: new Date().toISOString()
    };
    this.doctorProfiles.set(profileData.doctorId, profile);
    return { ...profile };
  }

  async getDoctorProfile(doctorId) {
    let profile = this.doctorProfiles.get(doctorId);
    if (!profile) {
      const user = await this.findUserById(doctorId);
      profile = await this.createDoctorProfile({
        doctorId,
        name: user ? user.name : 'Dr. Specialist'
      });
    }
    return { ...profile };
  }

  // DoctorPatientPermission operations
  async setDoctorPatientPermission({ doctorId, patientId, status = 'AUTHORIZED' }) {
    const existingIndex = this.doctorPatientPermissions.findIndex(
      p => p.doctorId === doctorId && p.patientId === patientId
    );

    const record = {
      id: `perm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      doctorId,
      patientId,
      status, // 'AUTHORIZED' | 'REVOKED'
      grantedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.doctorPatientPermissions[existingIndex] = record;
    } else {
      this.doctorPatientPermissions.push(record);
    }

    await this.createAuditLog({
      action: 'DOCTOR_PATIENT_PERMISSION_UPDATED',
      actorId: patientId,
      patientId,
      details: { doctorId, status }
    });

    return { ...record };
  }

  async hasDoctorPatientPermission(doctorId, patientId) {
    const perm = this.doctorPatientPermissions.find(
      p => p.doctorId === doctorId && p.patientId === patientId
    );
    return perm ? perm.status === 'AUTHORIZED' : false;
  }

  async getAuthorizedPatientsForDoctor(doctorId) {
    const perms = this.doctorPatientPermissions.filter(
      p => p.doctorId === doctorId && p.status === 'AUTHORIZED'
    );
    const patientIds = perms.map(p => p.patientId);

    const patients = [];
    for (const pid of patientIds) {
      const user = await this.findUserById(pid);
      const data = await this.getPatientData(pid);
      if (user) {
        const { password: _, ...u } = user;
        patients.push({
          ...u,
          clinicalSummary: data
        });
      }
    }
    return patients;
  }

  // Consultation operations
  async createConsultation(consultationData) {
    const consultation = {
      id: `csl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      doctorId: consultationData.doctorId,
      patientId: consultationData.patientId,
      date: consultationData.date || new Date().toISOString(),
      notes: consultationData.notes,
      followUpDate: consultationData.followUpDate || null,
      observations: consultationData.observations || 'Routine clinical follow-up observations.',
      createdAt: new Date().toISOString()
    };
    this.consultations.push(consultation);

    await this.createAuditLog({
      action: 'CONSULTATION_RECORDED',
      actorId: consultationData.doctorId,
      patientId: consultationData.patientId,
      details: { consultationId: consultation.id, followUpDate: consultation.followUpDate }
    });

    return { ...consultation };
  }

  async getConsultationsForPatient(patientId) {
    const filtered = this.consultations.filter(c => c.patientId === patientId);
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return filtered.map(c => ({ ...c }));
  }

  // CaregiverPermission operations
  async createCaregiverPermission({ patientId, caregiverId, caregiverName, caregiverEmail, permissions = {} }) {
    const existingIndex = this.caregiverPermissions.findIndex(
      p => p.patientId === patientId && p.caregiverId === caregiverId
    );

    // Default permission is explicitly NO ACCESS unless specified
    const mergedPermissions = {
      assessments: Boolean(permissions.assessments),
      trends: Boolean(permissions.trends),
      alerts: Boolean(permissions.alerts),
      reminders: Boolean(permissions.reminders),
      reports: Boolean(permissions.reports)
    };

    const record = {
      id: `cgp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId,
      caregiverId,
      caregiverName: caregiverName || 'Caregiver',
      caregiverEmail: caregiverEmail ? caregiverEmail.toLowerCase().trim() : '',
      status: 'ACTIVE',
      permissions: mergedPermissions,
      invitedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revokedAt: null
    };

    if (existingIndex >= 0) {
      this.caregiverPermissions[existingIndex] = record;
    } else {
      this.caregiverPermissions.push(record);
    }

    await this.createAuditLog({
      action: 'CAREGIVER_INVITED',
      actorId: patientId,
      patientId,
      details: {
        caregiverId,
        caregiverName: record.caregiverName,
        caregiverEmail: record.caregiverEmail,
        permissions: record.permissions,
        status: record.status
      }
    });

    return { ...record };
  }

  async updateCaregiverPermissions({ patientId, caregiverId, permissions, actorId }) {
    const perm = this.caregiverPermissions.find(
      p => p.patientId === patientId && p.caregiverId === caregiverId
    );

    if (!perm) {
      return null;
    }

    const previousPermissions = { ...perm.permissions };
    const updatedPermissions = {
      assessments: permissions.assessments !== undefined ? Boolean(permissions.assessments) : perm.permissions.assessments,
      trends: permissions.trends !== undefined ? Boolean(permissions.trends) : perm.permissions.trends,
      alerts: permissions.alerts !== undefined ? Boolean(permissions.alerts) : perm.permissions.alerts,
      reminders: permissions.reminders !== undefined ? Boolean(permissions.reminders) : perm.permissions.reminders,
      reports: permissions.reports !== undefined ? Boolean(permissions.reports) : perm.permissions.reports
    };

    perm.permissions = updatedPermissions;
    perm.status = 'ACTIVE';
    perm.revokedAt = null;
    perm.updatedAt = new Date().toISOString();

    await this.createAuditLog({
      action: 'CAREGIVER_PERMISSIONS_UPDATED',
      actorId: actorId || patientId,
      patientId,
      details: {
        caregiverId,
        caregiverName: perm.caregiverName,
        previousPermissions,
        newPermissions: updatedPermissions
      }
    });

    return { ...perm };
  }

  async revokeCaregiverAccess({ patientId, caregiverId, actorId }) {
    const perm = this.caregiverPermissions.find(
      p => p.patientId === patientId && p.caregiverId === caregiverId
    );

    if (!perm) {
      return null;
    }

    perm.status = 'REVOKED';
    perm.revokedAt = new Date().toISOString();
    perm.updatedAt = perm.revokedAt;
    perm.permissions = {
      assessments: false,
      trends: false,
      alerts: false,
      reminders: false,
      reports: false
    };

    await this.createAuditLog({
      action: 'CAREGIVER_ACCESS_REVOKED',
      actorId: actorId || patientId,
      patientId,
      details: {
        caregiverId,
        caregiverName: perm.caregiverName,
        status: 'REVOKED',
        revokedAt: perm.revokedAt
      }
    });

    return { ...perm };
  }

  async getCaregiverPermissionsForPatient(patientId) {
    const list = this.caregiverPermissions.filter(p => p.patientId === patientId);
    return list.map(p => ({ ...p }));
  }

  async getCaregiverPermission(patientId, caregiverId) {
    const perm = this.caregiverPermissions.find(
      p => p.patientId === patientId && p.caregiverId === caregiverId
    );
    return perm ? { ...perm } : null;
  }

  async getPatientsForCaregiver(caregiverId) {
    const perms = this.caregiverPermissions.filter(
      p => p.caregiverId === caregiverId && p.status === 'ACTIVE'
    );
    const results = [];
    for (const perm of perms) {
      const patient = await this.findUserById(perm.patientId);
      if (patient) {
        const { password: _, ...pInfo } = patient;
        results.push({
          patient: pInfo,
          permissions: perm.permissions,
          status: perm.status,
          invitedAt: perm.invitedAt,
          updatedAt: perm.updatedAt
        });
      }
    }
    return results;
  }

  async hasCaregiverPermission(caregiverId, patientId, resourceType) {
    if (!caregiverId || !patientId || !resourceType) return false;
    const perm = this.caregiverPermissions.find(
      p => p.caregiverId === caregiverId && p.patientId === patientId
    );

    if (!perm || perm.status !== 'ACTIVE') {
      return false;
    }

    return Boolean(perm.permissions && perm.permissions[resourceType] === true);
  }

  async getAuditLogsForPatient(patientId) {
    const list = this.auditLogs.filter(l => l.patientId === patientId);
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list.map(l => ({ ...l }));
  }

  // Reminder operations
  async createReminder(reminderData) {
    const reminder = {
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId: reminderData.patientId,
      title: reminderData.title,
      dueDate: reminderData.dueDate || new Date().toISOString(),
      type: reminderData.type || 'Medication',
      priority: reminderData.priority || 'Medium',
      notes: reminderData.notes || '',
      completed: Boolean(reminderData.completed),
      createdAt: new Date().toISOString()
    };
    this.reminders.push(reminder);
    return { ...reminder };
  }

  async getRemindersByPatientId(patientId) {
    const list = this.reminders.filter(r => r.patientId === patientId);
    list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    return list.map(r => ({ ...r }));
  }

  // Medical Report operations
  async createReport(reportData) {
    const report = {
      id: reportData.id || `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      patientId: reportData.patientId,
      title: reportData.title || 'Cardiovascular Clinical Evaluation Report',
      reportType: reportData.reportType || 'General Checkup',
      date: reportData.date || new Date().toISOString().split('T')[0],
      fileName: reportData.fileName || null,
      storedFileName: reportData.storedFileName || null,
      filePath: reportData.filePath || null,
      fileSize: reportData.fileSize || 0,
      mimeType: reportData.mimeType || 'application/pdf',
      doctorName: reportData.doctorName || 'Dr. Medical Specialist',
      summary: reportData.summary || 'Routine clinical cardiovascular assessment and diagnostic report.',
      diagnosis: reportData.diagnosis || 'Stage 1 Hypertension, Elevated Cardiovascular Risk Profile',
      vitals: reportData.vitals || { restingBP: 130, heartRate: 74, cholesterol: 210 },
      recommendations: reportData.recommendations || 'Low sodium dietary protocol, lifestyle adjustments, 30-day follow-up.',
      createdAt: new Date().toISOString()
    };
    this.reports.push(report);

    await this.createAuditLog({
      action: 'REPORT_UPLOADED',
      actorId: reportData.actorId || reportData.patientId,
      patientId: reportData.patientId,
      details: {
        reportId: report.id,
        title: report.title,
        reportType: report.reportType,
        fileName: report.fileName,
        fileSize: report.fileSize
      }
    });

    return { ...report };
  }

  async getReportsByPatientId(patientId) {
    const list = this.reports.filter(r => r.patientId === patientId);
    list.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
    return list.map(r => ({ ...r }));
  }

  async getReportById(id) {
    const report = this.reports.find(r => r.id === id);
    return report ? { ...report } : null;
  }

  async deleteReport(id, actorId) {
    const index = this.reports.findIndex(r => r.id === id);
    if (index === -1) return null;

    const [deleted] = this.reports.splice(index, 1);

    await this.createAuditLog({
      action: 'REPORT_DELETED',
      actorId: actorId || deleted.patientId,
      patientId: deleted.patientId,
      details: {
        reportId: deleted.id,
        title: deleted.title,
        fileName: deleted.fileName
      }
    });

    return { ...deleted };
  }

  async seedDefaultData() {
    let patient = await this.findUserByEmail('patienta@example.com');
    if (!patient) {
      const bcrypt = require('bcryptjs');
      const hashedPw = await bcrypt.hash('Password123!', 12);
      patient = await this.createUser({
        id: 'patient_alpha_id',
        email: 'patienta@example.com',
        password: hashedPw,
        name: 'Sarah Patient',
        role: 'PATIENT'
      });
      await this.setPatientData('patient_alpha_id', {
        heartRate: 74,
        restingBP: 128,
        cholesterol: 215,
        riskPrediction: 'Moderate Risk',
        notes: 'Clinical parameters undergoing routine surveillance.'
      });
    }

    let caregiver = await this.findUserByEmail('john.doe@example.com');
    if (!caregiver) {
      const bcrypt = require('bcryptjs');
      const hashedPw = await bcrypt.hash('Password123!', 12);
      caregiver = await this.createUser({
        id: 'caregiver_john_doe',
        email: 'john.doe@example.com',
        password: hashedPw,
        name: 'John Doe',
        role: 'CAREGIVER'
      });
    }

    const existingPerm = await this.getCaregiverPermission('patient_alpha_id', 'caregiver_john_doe');
    if (!existingPerm) {
      await this.createCaregiverPermission({
        patientId: 'patient_alpha_id',
        caregiverId: 'caregiver_john_doe',
        caregiverName: 'John Doe',
        caregiverEmail: 'john.doe@example.com',
        permissions: {
          assessments: true,
          trends: true,
          reports: false,
          alerts: false,
          reminders: false
        }
      });
    }

    if (this.reminders.length === 0) {
      await this.createReminder({
        patientId: 'patient_alpha_id',
        title: 'Take Morning Blood Pressure Medication (Metoprolol 25mg)',
        dueDate: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
        type: 'Medication',
        priority: 'High',
        notes: 'Take with food and a full glass of water.'
      });
      await this.createReminder({
        patientId: 'patient_alpha_id',
        title: 'Evening Blood Pressure & Heart Rate Reading',
        dueDate: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        type: 'BloodPressureCheck',
        priority: 'Medium',
        notes: 'Rest for 5 minutes prior to cuff measurement.'
      });
      await this.createReminder({
        patientId: 'patient_alpha_id',
        title: 'Cardiology Follow-Up Consultation with Dr. Specialist',
        dueDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString(),
        type: 'FollowUp',
        priority: 'Medium',
        notes: 'Review recent ECG trends and medication tolerance.'
      });
    }

    if (this.reports.length === 0) {
      await this.createReport({
        patientId: 'patient_alpha_id',
        title: 'Comprehensive Cardiovascular Consultation & Risk Evaluation',
        doctorName: 'Dr. Medical Specialist, MD',
        date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
        summary: 'Cardiac evaluation shows borderline Stage 1 systolic hypertension. Lipid panel indicates mildly elevated serum cholesterol.',
        diagnosis: 'Stage 1 Hypertension (ICD-10 I10), Elevated Cardiovascular Risk Profile',
        vitals: { restingBP: 135, heartRate: 78, cholesterol: 220, maxHR: 155 },
        recommendations: 'Initiate dietary sodium restriction (<2000mg/day). Daily 30-minute moderate aerobic exercise. Continue blood pressure logging.'
      });
    }
  }
}

const store = new Store();
module.exports = store;
