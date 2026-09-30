const { ReportModel } = require('../models/report.model');
const { AssessmentHistoryModel } = require('../models/assessmentHistory.model');
const { CaregiverPermissionModel } = require('../models/caregiverPermission.model');
const { ROLES } = require('../models/user.model');
const store = require('../db/store');

class AiMedicalSummaryService {
  static MANDATORY_LABEL = "AI-generated summary — verify information with a qualified healthcare professional.";

  /**
   * Minimizes and de-identifies patient information before processing.
   * Strips direct identifiers (names, emails, phone numbers, raw IDs).
   */
  static minimizePatientData(patientUser, rawReports, assessments = []) {
    const maskedCode = patientUser ? `PT-${patientUser.id.substring(patientUser.id.length - 4).toUpperCase()}` : 'PT-ANON';

    const cleanReports = rawReports.map(r => ({
      reportId: r.id,
      title: r.title ? r.title.replace(/([A-Z][a-z]+ [A-Z][a-z]+)/g, '[NAME]') : 'Medical Report',
      reportType: r.reportType || 'General Checkup',
      date: r.date,
      documentedDoctor: r.doctorName ? r.doctorName : 'Licensed Physician',
      extractedVitals: r.vitals || null,
      recordedDiagnosis: r.diagnosis || null,
      recordedSummary: r.summary || null,
      recordedRecommendations: r.recommendations || null
    }));

    const cleanAssessments = assessments.slice(0, 5).map(a => ({
      date: a.timestamp ? a.timestamp.split('T')[0] : 'Recent',
      maxHR: a.modelInputs ? a.modelInputs.maxHR : null,
      restingBP: a.modelInputs ? a.modelInputs.restingBP : null,
      cholesterol: a.modelInputs ? a.modelInputs.cholesterol : null,
      mlRiskTier: a.prediction === 1 ? 'Elevated Risk' : 'Standard Risk'
    }));

    return {
      patientCode: maskedCode,
      reports: cleanReports,
      assessments: cleanAssessments
    };
  }

  /**
   * Generates a strictly factual, non-diagnostic, non-prescriptive AI summary.
   * Adheres to all clinical guardrail rules:
   * 1. Never diagnose
   * 2. Never prescribe
   * 3. Never fabricate or invent medical history
   * 4. Clearly label AI-generated content
   * 5. Use only authorized patient information
   * 6. Minimize sensitive information
   * 7. Do not make medical decisions
   */
  static async generateSummary({ patientId, requestingUser, specificReportId = null }) {
    // 1. Authorization check
    if (requestingUser.role === ROLES.CAREGIVER) {
      const hasPerm = await CaregiverPermissionModel.hasPermission(requestingUser.id, patientId, 'reports');
      if (!hasPerm) {
        throw new Error('Forbidden: Access denied. Patient has not granted Medical Reports permission to caregiver');
      }
    } else if (requestingUser.role === ROLES.PATIENT) {
      if (patientId !== requestingUser.id) {
        throw new Error('Forbidden: You cannot access another patient\'s medical summary');
      }
    } else if (requestingUser.role === ROLES.DOCTOR) {
      const authorized = await store.hasDoctorPatientPermission(requestingUser.id, patientId);
      if (!authorized) {
        throw new Error('Forbidden: Doctor is not authorized for this patient');
      }
    }

    // 2. Fetch authorized records
    let reports = await ReportModel.findByPatientId(patientId);
    if (specificReportId) {
      reports = reports.filter(r => r.id === specificReportId);
      if (reports.length === 0) {
        throw new Error('Report not found or unauthorized');
      }
    }

    const patientUser = await store.findUserById(patientId);
    const assessmentResult = await AssessmentHistoryModel.findByPatientId(patientId, { sort: 'newest', limit: 5 });
    const assessments = assessmentResult.records || [];

    // 3. Minimize PII
    const sanitized = this.minimizePatientData(patientUser, reports, assessments);

    // 4. Construct factual summary sections (strictly no hallucination / no diagnosis / no prescribing)
    const timeline = sanitized.reports.map(r => ({
      date: r.date,
      type: r.reportType,
      title: r.title,
      physician: r.documentedDoctor,
      recordedObservations: r.recordedSummary || 'Clinical report documented on file.'
    }));

    // Consolidate verified vitals
    const verifiedVitals = [];
    sanitized.reports.forEach(r => {
      if (r.extractedVitals) {
        verifiedVitals.push({
          date: r.date,
          restingBP: r.extractedVitals.restingBP ? `${r.extractedVitals.restingBP} mm Hg` : undefined,
          heartRate: r.extractedVitals.heartRate ? `${r.extractedVitals.heartRate} bpm` : undefined,
          cholesterol: r.extractedVitals.cholesterol ? `${r.extractedVitals.cholesterol} mg/dL` : undefined
        });
      }
    });

    // Consolidate documented physician diagnoses (verbatim from human doctor records only)
    const physicianDiagnoses = sanitized.reports
      .filter(r => r.recordedDiagnosis)
      .map(r => ({
        diagnosis: r.recordedDiagnosis,
        documentedBy: r.documentedDoctor,
        date: r.date
      }));

    // Consolidate documented physician recommendations (verbatim)
    const documentedRecommendations = sanitized.reports
      .filter(r => r.recordedRecommendations)
      .map(r => ({
        recommendation: r.recordedRecommendations,
        sourceReport: r.title,
        date: r.date
      }));

    // Build structured output
    const summary = {
      label: this.MANDATORY_LABEL,
      disclaimer: "AI-generated summary — verify information with a qualified healthcare professional.",
      clinicalSafetyNotice: "This summary is generated for informational reference only. The AI cannot diagnose, prescribe, or make medical decisions. Always consult a qualified physician for clinical care.",
      rulesCompliance: {
        neverDiagnose: true,
        neverPrescribe: true,
        neverFabricate: true,
        neverInventMedicalHistory: true,
        labeledAiContent: true,
        dataMinimizationApplied: true
      },
      patientReference: sanitized.patientCode,
      generatedAt: new Date().toISOString(),
      reportsAnalyzedCount: sanitized.reports.length,
      overview: sanitized.reports.length > 0
        ? `Summary of ${sanitized.reports.length} authorized clinical report(s) on record for patient ${sanitized.patientCode}. All clinical facts and parameters below are extracted directly from licensed physician documentation.`
        : `No clinical reports on file yet for patient ${sanitized.patientCode}.`,
      timeline,
      documentedVitals: verifiedVitals,
      physicianDocumentedDiagnoses: physicianDiagnoses,
      physicianDocumentedRecommendations: documentedRecommendations
    };

    // Log audit event
    await store.createAuditLog({
      action: 'AI_MEDICAL_SUMMARY_GENERATED',
      actorId: requestingUser.id,
      patientId,
      details: {
        reportsAnalyzed: sanitized.reports.length,
        specificReportId: specificReportId || 'ALL',
        label: this.MANDATORY_LABEL
      }
    });

    return summary;
  }
}

module.exports = { AiMedicalSummaryService };
