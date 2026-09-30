const path = require('path');
const fs = require('fs');
const { ReportModel } = require('../models/report.model');
const { CaregiverPermissionModel } = require('../models/caregiverPermission.model');
const { ROLES } = require('../models/user.model');
const { verifyMagicBytes } = require('../middleware/upload.middleware');
const { AiMedicalSummaryService } = require('../services/aiMedicalSummary.service');
const store = require('../db/store');

// Helper to sanitize filenames for safe HTTP download headers
const sanitizeHeaderFilename = (name) => {
  if (!name) return 'medical_report.pdf';
  // Strip path traversal and dangerous characters
  const clean = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
  return clean || 'medical_report.pdf';
};

// Helper to verify user can access a specific patient's reports
const verifyReportAccess = async (user, targetPatientId) => {
  if (user.role === ROLES.PATIENT) {
    return user.id === targetPatientId;
  }
  if (user.role === ROLES.CAREGIVER) {
    return await CaregiverPermissionModel.hasPermission(user.id, targetPatientId, 'reports');
  }
  if (user.role === ROLES.DOCTOR) {
    return await store.hasDoctorPatientPermission(user.id, targetPatientId);
  }
  if (user.role === ROLES.ADMIN) {
    return true;
  }
  return false;
};

const getReports = async (req, res, next) => {
  try {
    let patientId = req.user.id;

    if (req.user.role === ROLES.CAREGIVER) {
      patientId = req.query.patientId;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request: patientId query parameter is required for caregiver' });
      }

      const hasPerm = await CaregiverPermissionModel.hasPermission(req.user.id, patientId, 'reports');
      if (!hasPerm) {
        return res.status(403).json({
          error: 'Forbidden: Access denied. Patient has not granted Medical Reports permission to caregiver'
        });
      }
    } else if (req.user.role === ROLES.PATIENT) {
      if (req.query.patientId && req.query.patientId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: You cannot access another patient\'s medical reports' });
      }
      patientId = req.user.id;
    } else if (req.user.role === ROLES.DOCTOR || req.user.role === ROLES.ADMIN) {
      patientId = req.query.patientId || req.user.id;
    }

    const reports = await ReportModel.findByPatientId(patientId);

    // Omit server filesystem paths from client JSON responses for security
    const sanitizedReports = reports.map(({ filePath, ...r }) => ({
      ...r,
      viewUrl: `/api/reports/${r.id}/view`,
      downloadUrl: `/api/reports/${r.id}/download`
    }));

    res.status(200).json({
      message: 'Medical reports retrieved successfully',
      reports: sanitizedReports
    });
  } catch (error) {
    next(error);
  }
};

const getReportById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await ReportModel.findById(id);

    if (!report) {
      return res.status(404).json({ error: 'Medical report not found' });
    }

    // Authorization check
    const hasAccess = await verifyReportAccess(req.user, report.patientId);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden: You are not authorized to view this medical report'
      });
    }

    const { filePath, ...safeReport } = report;
    res.status(200).json({
      message: 'Medical report retrieved successfully',
      report: safeReport
    });
  } catch (error) {
    next(error);
  }
};

const uploadReport = async (req, res, next) => {
  try {
    // Caregiver cannot modify or upload medical records
    if (req.user.role === ROLES.CAREGIVER) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        error: 'Forbidden: Caregivers cannot upload or modify medical records'
      });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Validation Error: No medical report file uploaded' });
    }

    const uploadedFile = req.file;

    // 1. Magic Bytes Inspection (prevents extension-spoofed malicious files)
    const isMagicValid = verifyMagicBytes(uploadedFile.path, uploadedFile.mimetype);
    if (!isMagicValid) {
      if (fs.existsSync(uploadedFile.path)) {
        fs.unlinkSync(uploadedFile.path);
      }
      return res.status(400).json({
        error: 'Validation Error: File content does not match declared MIME format. Ensure file is a valid PDF, JPG, or PNG.'
      });
    }

    // 2. Set strict non-executable permissions (never execute uploaded files)
    try {
      fs.chmodSync(uploadedFile.path, 0o600);
    } catch (e) {
      // Best-effort permission clamp
    }

    // 3. Extract and sanitize metadata
    const { title, reportType, date } = req.body;
    const sanitizedTitle = (title && title.trim()) ? title.trim().substring(0, 150) : path.parse(uploadedFile.originalname).name;
    const sanitizedDate = date || new Date().toISOString().split('T')[0];
    const safeType = reportType || 'General Checkup';

    const patientId = req.user.role === ROLES.PATIENT ? req.user.id : (req.body.patientId || req.user.id);

    // 4. Persist in report store
    const newReport = await ReportModel.create({
      patientId,
      title: sanitizedTitle,
      reportType: safeType,
      date: sanitizedDate,
      fileName: sanitizeHeaderFilename(uploadedFile.originalname),
      storedFileName: uploadedFile.filename,
      filePath: uploadedFile.path,
      fileSize: uploadedFile.size,
      mimeType: uploadedFile.mimetype,
      doctorName: req.user.role === ROLES.DOCTOR ? req.user.name : 'Patient Uploaded',
      summary: `Uploaded ${safeType} document: ${sanitizedTitle}`,
      diagnosis: 'Diagnostic documentation on record',
      actorId: req.user.id
    });

    const { filePath, ...clientReport } = newReport;

    res.status(201).json({
      message: 'Medical report uploaded securely and stored in private storage',
      report: clientReport
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    next(error);
  }
};

const viewReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await ReportModel.findById(id);

    if (!report) {
      return res.status(404).json({ error: 'Medical report not found' });
    }

    // Authorization before access
    const hasAccess = await verifyReportAccess(req.user, report.patientId);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden: You are not authorized to view this medical report'
      });
    }

    // If report is an initial seed without an actual on-disk file, stream synthesized safe document
    if (!report.filePath || !fs.existsSync(report.filePath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");
      res.setHeader('Content-Disposition', 'inline');
      return res.status(200).send(`HEARTGUARD SECURE MEDICAL REPORT\n\nTitle: ${report.title}\nDate: ${report.date}\nDoctor: ${report.doctorName}\nSummary: ${report.summary}\nDiagnosis: ${report.diagnosis}`);
    }

    // Set secure content headers (never execute, prevent MIME confusion)
    res.setHeader('Content-Type', report.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Content-Disposition', 'inline');

    res.sendFile(path.resolve(report.filePath));
  } catch (error) {
    next(error);
  }
};

const downloadReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await ReportModel.findById(id);

    if (!report) {
      return res.status(404).json({ error: 'Medical report not found' });
    }

    // Authorization before access
    const hasAccess = await verifyReportAccess(req.user, report.patientId);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Forbidden: You are not authorized to download this medical report'
      });
    }

    const safeName = sanitizeHeaderFilename(report.fileName || `${report.title}.pdf`);

    // Handle seed records without physical file
    if (!report.filePath || !fs.existsSync(report.filePath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `attachment; filename="${safeName}.txt"`);
      return res.status(200).send(`HEARTGUARD SECURE MEDICAL REPORT\n\nTitle: ${report.title}\nDate: ${report.date}\nDoctor: ${report.doctorName}\nSummary: ${report.summary}\nDiagnosis: ${report.diagnosis}`);
    }

    // Secure download headers
    res.setHeader('Content-Type', report.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

    res.sendFile(path.resolve(report.filePath));
  } catch (error) {
    next(error);
  }
};

const deleteReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await ReportModel.findById(id);

    if (!report) {
      return res.status(404).json({ error: 'Medical report not found' });
    }

    // Caregivers CANNOT delete or modify medical records
    if (req.user.role === ROLES.CAREGIVER) {
      return res.status(403).json({
        error: 'Forbidden: Caregivers cannot modify or delete medical records'
      });
    }

    // Patients can only delete their own reports (IDOR Protection)
    if (req.user.role === ROLES.PATIENT && report.patientId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: You cannot delete another patient\'s medical report'
      });
    }

    // Doctors must be authorized for this patient
    if (req.user.role === ROLES.DOCTOR) {
      const authorized = await store.hasDoctorPatientPermission(req.user.id, report.patientId);
      if (!authorized) {
        return res.status(403).json({ error: 'Forbidden: Doctor unauthorized for this patient' });
      }
    }

    // Delete from store
    await ReportModel.delete(id, req.user.id);

    // Delete physical file from private disk storage if exists
    if (report.filePath && fs.existsSync(report.filePath)) {
      try {
        fs.unlinkSync(report.filePath);
      } catch (e) {
        console.error('Failed to unlink report file:', e);
      }
    }

    res.status(200).json({
      message: 'Medical report deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

const getAiMedicalSummary = async (req, res, next) => {
  try {
    let patientId = req.user.id;

    if (req.user.role === ROLES.CAREGIVER) {
      patientId = req.query.patientId;
      if (!patientId) {
        return res.status(400).json({ error: 'Bad Request: patientId query parameter is required for caregiver' });
      }
    } else if (req.user.role === ROLES.DOCTOR || req.user.role === ROLES.ADMIN) {
      patientId = req.query.patientId || req.user.id;
    }

    const specificReportId = req.query.reportId || null;

    const summary = await AiMedicalSummaryService.generateSummary({
      patientId,
      requestingUser: req.user,
      specificReportId
    });

    res.status(200).json({
      message: 'AI Medical Record Summary generated successfully',
      summary
    });
  } catch (error) {
    if (error.message.startsWith('Forbidden:')) {
      return res.status(403).json({ error: error.message });
    }
    next(error);
  }
};

module.exports = {
  getReports,
  getReportById,
  uploadReport,
  viewReport,
  downloadReport,
  deleteReport,
  getAiMedicalSummary
};
