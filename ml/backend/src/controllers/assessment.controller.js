const { z } = require('zod');
const config = require('../config/config');
const { AssessmentHistoryModel } = require('../models/assessmentHistory.model');
const { AlertEngine } = require('../services/alertEngine.service');
const { ROLES } = require('../models/user.model');

// Validation schema for assessment request
const assessmentInputSchema = z.object({
  age: z.number({ invalid_type_error: 'Age must be a valid number' })
    .min(18, { message: 'Age must be at least 18 years' })
    .max(120, { message: 'Age must be at most 120 years' }),
  sex: z.number().int().min(0).max(1),
  restingBP: z.number({ invalid_type_error: 'Resting Blood Pressure must be a valid number' })
    .min(50, { message: 'Resting Blood Pressure must be at least 50 mm Hg' })
    .max(250, { message: 'Resting Blood Pressure must be at most 250 mm Hg' }),
  cholesterol: z.number({ invalid_type_error: 'Cholesterol must be a valid number' })
    .min(0, { message: 'Cholesterol must be a non-negative number' })
    .max(800, { message: 'Cholesterol must be at most 800 mg/dL' }),
  fastingBS: z.number().int().min(0).max(1),
  maxHR: z.number({ invalid_type_error: 'Maximum Heart Rate must be a valid number' })
    .min(40, { message: 'Maximum Heart Rate must be at least 40 bpm' })
    .max(250, { message: 'Maximum Heart Rate must be at most 250 bpm' }),
  exerciseAngina: z.number().int().min(0).max(1),
  oldpeak: z.number({ invalid_type_error: 'ST Depression must be a valid number' })
    .min(-5, { message: 'ST Depression must be at least -5 mm' })
    .max(10, { message: 'ST Depression must be at most 10 mm' }),
  chestPainType: z.enum(['ATA', 'NAP', 'TA', 'ASY'], {
    errorMap: () => ({ message: 'Please select a valid Chest Pain Type' })
  }),
  stSlope: z.enum(['Up', 'Flat', 'Down'], {
    errorMap: () => ({ message: 'Please select a valid ST Segment Slope' })
  })
});

const submitAssessment = async (req, res, next) => {
  try {
    // Caregiver cannot run assessments on behalf of patient
    if (req.user && req.user.role === ROLES.CAREGIVER) {
      return res.status(403).json({
        error: 'Forbidden: Caregivers cannot run assessments on behalf of patients'
      });
    }

    // 1. Backend Request Body Validation
    const validationResult = assessmentInputSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation Error: Invalid assessment payload',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;

    // 2. Map frontend inputs to exact ML model feature schema required by FastAPI
    const mlPayload = {
      Age: data.age,
      Sex: data.sex,
      RestingBP: data.restingBP,
      Cholesterol: data.cholesterol,
      FastingBS: data.fastingBS,
      MaxHR: data.maxHR,
      ExerciseAngina: data.exerciseAngina,
      Oldpeak: data.oldpeak,
      ChestPainType_ATA: data.chestPainType === 'ATA' ? 1 : 0,
      ChestPainType_NAP: data.chestPainType === 'NAP' ? 1 : 0,
      ChestPainType_TA: data.chestPainType === 'TA' ? 1 : 0,
      ST_Slope_Flat: data.stSlope === 'Flat' ? 1 : 0,
      ST_Slope_Up: data.stSlope === 'Up' ? 1 : 0
    };

    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000/predict';

    let mlResponse;
    try {
      const response = await fetch(mlServiceUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(502).json({
          error: 'ML prediction service returned an error',
          details: errorText
        });
      }

      mlResponse = await response.json();
    } catch (err) {
      return res.status(503).json({
        error: 'ML service unavailable. Please ensure the FastAPI ML service is running on port 8000.',
        details: err.message
      });
    }

    const assessmentDate = new Date().toISOString();

    const featureExplanationsSupported = mlResponse.feature_explanations_supported ?? true;
    const featureContributions = mlResponse.feature_contributions || null;

    // 3. Persist Assessment Entry in DB
    const savedRecord = await AssessmentHistoryModel.create({
      patientId: req.user.id,
      modelInputs: data,
      prediction: mlResponse.prediction,
      probability: mlResponse.probabilities || null,
      modelVersion: mlResponse.model_version || 'GradientBoostingClassifier v1.0',
      featureExplanationsSupported,
      featureContributions,
      timestamp: assessmentDate
    });

    // 4. Trigger Smart Health Alert Engine Evaluation
    await AlertEngine.evaluateNewAssessment(req.user.id, savedRecord);
    
    // Construct submitted values list with labels & units for report summary
    const submittedValues = {
      age: { label: 'Age', value: data.age, unit: 'years' },
      sex: { label: 'Sex', value: data.sex === 1 ? 'Male' : 'Female', unit: '' },
      restingBP: { label: 'Resting Blood Pressure', value: data.restingBP, unit: 'mm Hg' },
      cholesterol: { label: 'Serum Cholesterol', value: data.cholesterol, unit: 'mg/dL' },
      fastingBS: { label: 'Fasting Blood Sugar', value: data.fastingBS === 1 ? '> 120 mg/dL' : '≤ 120 mg/dL', unit: '' },
      maxHR: { label: 'Maximum Heart Rate', value: data.maxHR, unit: 'bpm' },
      exerciseAngina: { label: 'Exercise-Induced Angina', value: data.exerciseAngina === 1 ? 'Yes' : 'No', unit: '' },
      oldpeak: { label: 'ST Depression (Oldpeak)', value: data.oldpeak, unit: 'mm' },
      chestPainType: {
        label: 'Chest Pain Type',
        value: {
          ATA: 'Atypical Angina (ATA)',
          NAP: 'Non-Anginal Pain (NAP)',
          TA: 'Typical Angina (TA)',
          ASY: 'Asymptomatic (ASY)'
        }[data.chestPainType],
        unit: ''
      },
      stSlope: {
        label: 'ST Segment Slope',
        value: {
          Up: 'Upsloping (Up)',
          Flat: 'Flat',
          Down: 'Downsloping (Down)'
        }[data.stSlope],
        unit: ''
      }
    };

    res.status(200).json({
      message: 'Assessment processed successfully',
      assessment: {
        id: savedRecord.id,
        prediction: mlResponse.prediction,
        probabilities: mlResponse.probabilities || null,
        modelVersion: mlResponse.model_version || 'GradientBoostingClassifier v1.0',
        featureExplanationsSupported,
        featureContributions,
        assessmentDate,
        submittedValues
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { submitAssessment };
