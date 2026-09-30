const { AlertModel, ALERT_LEVELS, TRIGGER_TYPES } = require('../models/alert.model');
const { AssessmentHistoryModel } = require('../models/assessmentHistory.model');

class AlertEngine {
  static async evaluateNewAssessment(patientId, newAssessment) {
    const config = await AlertModel.getConfig(patientId);
    const historyResult = await AssessmentHistoryModel.findByPatientId(patientId, { sort: 'newest', limit: 10 });
    const records = historyResult.records || [];

    const alertsGenerated = [];

    // 1. Trigger Check: Repeated Concerning Model Assessments
    if (records.length >= config.maxConsecutiveHighRisk) {
      const recent = records.slice(0, config.maxConsecutiveHighRisk);
      const allHighRisk = recent.every(r => r.prediction === 1);
      
      if (allHighRisk) {
        const alert = await AlertModel.create({
          patientId,
          alertLevel: ALERT_LEVELS.REVIEW,
          triggerType: TRIGGER_TYPES.REPEATED_CONCERNING_ASSESSMENT,
          reason: 'Your recent model assessments show consecutive higher-risk scores based on submitted values. Consider reviewing these results with your healthcare provider.',
          relatedAssessmentId: newAssessment.id
        });
        alertsGenerated.push(alert);
      }
    }

    // 2. Trigger Check: Significant Measurement Changes
    if (records.length >= 2) {
      const currentInputs = newAssessment.modelInputs;
      const previousInputs = records[1].modelInputs;

      const bpChange = Math.abs(currentInputs.restingBP - previousInputs.restingBP);
      const cholChange = Math.abs(currentInputs.cholesterol - previousInputs.cholesterol);

      if (bpChange >= config.deltaBPThreshold || cholChange >= config.deltaCholesterolThreshold) {
        let changeDetail = [];
        if (bpChange >= config.deltaBPThreshold) {
          changeDetail.push(`Resting Blood Pressure changed by ${bpChange} mm Hg`);
        }
        if (cholChange >= config.deltaCholesterolThreshold) {
          changeDetail.push(`Cholesterol changed by ${cholChange} mg/dL`);
        }

        const alert = await AlertModel.create({
          patientId,
          alertLevel: ALERT_LEVELS.NOTICE,
          triggerType: TRIGGER_TYPES.SIGNIFICANT_MEASUREMENT_CHANGE,
          reason: `Your recent recorded measurements show a notable change (${changeDetail.join(', ')}). Consider discussing this with a healthcare professional.`,
          relatedAssessmentId: newAssessment.id
        });
        alertsGenerated.push(alert);
      }
    }

    // 3. Trigger Check: Configured Monitoring Conditions
    const currentInputs = newAssessment.modelInputs;
    if (currentInputs.restingBP >= config.systolicBPThreshold) {
      const alert = await AlertModel.create({
        patientId,
        alertLevel: ALERT_LEVELS.NOTICE,
        triggerType: TRIGGER_TYPES.CONFIGURED_CONDITION,
        reason: `Your resting blood pressure measurement (${currentInputs.restingBP} mm Hg) exceeded your configured threshold (${config.systolicBPThreshold} mm Hg). Consider discussing this with a healthcare professional.`,
        relatedAssessmentId: newAssessment.id
      });
      alertsGenerated.push(alert);
    } else if (currentInputs.cholesterol >= config.cholesterolThreshold) {
      const alert = await AlertModel.create({
        patientId,
        alertLevel: ALERT_LEVELS.INFO,
        triggerType: TRIGGER_TYPES.CONFIGURED_CONDITION,
        reason: `Your serum cholesterol measurement (${currentInputs.cholesterol} mg/dL) reached your configured threshold (${config.cholesterolThreshold} mg/dL). Consider discussing this with a healthcare professional.`,
        relatedAssessmentId: newAssessment.id
      });
      alertsGenerated.push(alert);
    }

    return alertsGenerated;
  }
}

module.exports = { AlertEngine };
