import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Heart, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ShieldAlert, 
  Info,
  Calendar,
  Cpu,
  ArrowRight,
  BarChart3,
  HelpCircle
} from 'lucide-react';

// Zod Schema matching exact ML model input requirements
const assessmentSchema = z.object({
  age: z.coerce
    .number({ invalid_type_error: 'Age must be a valid number' })
    .min(18, 'Age must be at least 18 years')
    .max(120, 'Age must be at most 120 years'),
  sex: z.coerce
    .number({ invalid_type_error: 'Please select a sex' })
    .int()
    .min(0)
    .max(1),
  restingBP: z.coerce
    .number({ invalid_type_error: 'Resting Blood Pressure must be a number' })
    .min(50, 'Resting Blood Pressure must be at least 50 mm Hg')
    .max(250, 'Resting Blood Pressure must be at most 250 mm Hg'),
  cholesterol: z.coerce
    .number({ invalid_type_error: 'Cholesterol must be a number' })
    .min(0, 'Cholesterol must be a non-negative number')
    .max(800, 'Cholesterol must be at most 800 mg/dL'),
  fastingBS: z.coerce
    .number({ invalid_type_error: 'Please select fasting blood sugar status' })
    .int()
    .min(0)
    .max(1),
  maxHR: z.coerce
    .number({ invalid_type_error: 'Maximum Heart Rate must be a number' })
    .min(40, 'Maximum Heart Rate must be at least 40 bpm')
    .max(250, 'Maximum Heart Rate must be at most 250 bpm'),
  exerciseAngina: z.coerce
    .number({ invalid_type_error: 'Please select exercise angina status' })
    .int()
    .min(0)
    .max(1),
  oldpeak: z.coerce
    .number({ invalid_type_error: 'ST Depression must be a number' })
    .min(-5, 'ST Depression must be at least -5 mm')
    .max(10, 'ST Depression must be at most 10 mm'),
  chestPainType: z.enum(['ATA', 'NAP', 'TA', 'ASY'], {
    errorMap: () => ({ message: 'Please select a valid Chest Pain Type' })
  }),
  stSlope: z.enum(['Up', 'Flat', 'Down'], {
    errorMap: () => ({ message: 'Please select a valid ST Segment Slope' })
  })
});

const defaultValues = {
  age: 50,
  sex: 1,
  restingBP: 120,
  cholesterol: 200,
  fastingBS: 0,
  maxHR: 150,
  exerciseAngina: 0,
  oldpeak: 1.0,
  chestPainType: 'ATA',
  stSlope: 'Up'
};

export default function AssessmentPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(assessmentSchema),
    defaultValues
  });

  const onSubmit = async (formData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit heart failure risk assessment');
      }

      setResult(data.assessment);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while connecting to the assessment service.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    reset(defaultValues);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <header className="mb-8 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
            <Heart className="w-7 h-7 fill-rose-600/20" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Heart Failure Risk Assessment</h1>
            <p className="text-sm text-slate-600">
              Evaluates clinical indicators against the real scikit-learn ML GradientBoosting classifier.
            </p>
          </div>
        </div>
      </header>

      {/* Mandatory Medical Disclaimer Bar */}
      <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-start gap-3 shadow-sm" role="alert">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-950">Mandatory Medical Disclaimer:</span>{' '}
          AI-generated risk assessment. This result is not a medical diagnosis. Consult a qualified healthcare professional for medical decisions.
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-8 p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 flex flex-col gap-3 shadow-sm" role="alert">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-rose-950 text-base">Assessment Error</h3>
              <p className="text-sm text-rose-800 mt-1">{error}</p>
            </div>
          </div>
          <div className="mt-2 flex gap-3">
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Retry Assessment
            </button>
          </div>
        </div>
      )}

      {/* Success State Report View */}
      {result && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-md overflow-hidden mb-8">
          <div className={`p-6 border-b ${result.prediction === 1 ? 'bg-amber-50/70 border-amber-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                {result.prediction === 1 ? (
                  <div className="p-3 bg-amber-100 text-amber-700 rounded-full">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-full">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                )}
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Model Risk Assessment Result
                  </span>
                  {/* Mandatory Neutral Wording */}
                  <h2 className={`text-xl font-bold mt-0.5 ${result.prediction === 1 ? 'text-amber-950' : 'text-emerald-950'}`}>
                    {result.prediction === 1
                      ? 'The model generated a higher-risk assessment based on the submitted values.'
                      : 'The model generated a lower-risk assessment based on the submitted values.'}
                  </h2>
                </div>
              </div>
            </div>

            {/* Probability Gauge */}
            {result.probabilities && (
              <div className="mt-6 pt-4 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-white/80 rounded-xl border border-slate-200/60 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Estimated Higher Risk Probability</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {(result.probabilities['1'] * 100).toFixed(1)}%
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${result.prediction === 1 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${(result.probabilities['1'] * 100).toFixed(1)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="p-4 bg-white/80 rounded-xl border border-slate-200/60 shadow-xs">
                  <div className="text-xs text-slate-500 font-medium">Estimated Lower Risk Probability</div>
                  <div className="text-2xl font-extrabold text-slate-900 mt-1">
                    {(result.probabilities['0'] * 100).toFixed(1)}%
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-emerald-500"
                      style={{ width: `${(result.probabilities['0'] * 100).toFixed(1)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Meta Information Bar */}
            <div className="mt-4 flex flex-wrap items-center gap-6 text-xs text-slate-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>Assessment Date: <strong>{new Date(result.assessmentDate).toLocaleString()}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-slate-400" />
                <span>Model Version: <strong>{result.modelVersion}</strong></span>
              </div>
            </div>
          </div>

          {/* Explainable AI (XAI) Feature Importance Section */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" /> Important Contributing Features
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Model-derived SHAP feature contributions showing how input variables impacted the ML model's prediction score.
            </p>

            {result.featureExplanationsSupported === false || !result.featureContributions ? (
              <div className="p-4 bg-slate-100 text-slate-600 text-xs rounded-xl font-medium">
                Feature-level explanation is not available for this model.
              </div>
            ) : (
              <div className="space-y-3.5">
                {result.featureContributions.slice(0, 6).map((fc, index) => {
                  const maxContrib = result.featureContributions[0].contribution || 1;
                  const barPercent = Math.min(100, Math.max(8, (fc.contribution / maxContrib) * 100));
                  const isPositive = fc.direction === 'increases_risk';

                  return (
                    <div key={fc.feature} className="p-3 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-semibold text-slate-800">{fc.label}</span>
                        <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${isPositive ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                          {isPositive ? '↑ Increases Risk Score' : '↓ Decreases Risk Score'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex items-center">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isPositive ? 'bg-amber-500' : 'bg-blue-500'}`}
                          style={{ width: `${barPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Distinction between ML Explanation and Medical Diagnosis */}
            <div className="mt-4 p-3.5 bg-indigo-50/80 border border-indigo-200/80 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>Distinguishing ML Explanation from Medical Diagnosis:</strong>{' '}
                This feature breakdown reflects mathematical weights used by the GradientBoosting algorithm to generate a risk estimate. <strong>Feature importance indicates model decision weighting, not clinical causation.</strong> Medical diagnosis requires clinical examination by a licensed doctor.
              </div>
            </div>
          </div>

          {/* Submitted Values Table */}
          <div className="p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-slate-500" /> Submitted Clinical Parameters
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(result.submittedValues).map(([key, item]) => (
                <div key={key} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                  <div className="text-xs text-slate-500 font-medium">{item.label}</div>
                  <div className="text-sm font-semibold text-slate-900 mt-0.5 flex items-baseline gap-1">
                    <span>{item.value}</span>
                    {item.unit && <span className="text-xs font-normal text-slate-500">{item.unit}</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleReset}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Start New Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Form View */}
      {!result && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 mb-2">
            <h2 className="text-lg font-semibold text-slate-900">Patient Clinical Parameters</h2>
            <p className="text-xs text-slate-500">Provide exact numeric measurements and categorical features required by the model.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Field 1: Age */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="age" className="block text-sm font-medium text-slate-900">
                  Age <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">years</span>
              </div>
              <input
                id="age"
                type="number"
                {...register('age')}
                aria-invalid={errors.age ? 'true' : 'false'}
                className={`w-full px-3.5 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.age ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-300 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              />
              <p className="text-xs text-slate-500 mt-1">Patient's age in years (18–120).</p>
              {errors.age && <p className="text-xs text-rose-600 font-medium mt-1">{errors.age.message}</p>}
            </div>

            {/* Field 2: Sex */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="sex" className="block text-sm font-medium text-slate-900">
                  Sex / Gender <span className="text-rose-500">*</span>
                </label>
              </div>
              <select
                id="sex"
                {...register('sex')}
                aria-invalid={errors.sex ? 'true' : 'false'}
                className={`w-full px-3.5 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.sex ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-300 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              >
                <option value={1}>Male (1)</option>
                <option value={0}>Female (0)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Biological sex assigned at birth.</p>
              {errors.sex && <p className="text-xs text-rose-600 font-medium mt-1">{errors.sex.message}</p>}
            </div>

            {/* Field 3: Resting Blood Pressure */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="restingBP" className="block text-sm font-medium text-slate-900">
                  Resting Blood Pressure <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">mm Hg</span>
              </div>
              <input
                id="restingBP"
                type="number"
                {...register('restingBP')}
                aria-invalid={errors.restingBP ? 'true' : 'false'}
                className={`w-full px-3.5 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.restingBP ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-300 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              />
              <p className="text-xs text-slate-500 mt-1">Resting blood pressure measured in mm Hg upon admission.</p>
              {errors.restingBP && <p className="text-xs text-rose-600 font-medium mt-1">{errors.restingBP.message}</p>}
            </div>

            {/* Field 4: Serum Cholesterol */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="cholesterol" className="block text-sm font-medium text-slate-900">
                  Serum Cholesterol <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">mg/dL</span>
              </div>
              <input
                id="cholesterol"
                type="number"
                {...register('cholesterol')}
                aria-invalid={errors.cholesterol ? 'true' : 'false'}
                className={`w-full px-3.5 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.cholesterol ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-300 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              />
              <p className="text-xs text-slate-500 mt-1">Serum cholesterol level measured in mg/dL.</p>
              {errors.cholesterol && <p className="text-xs text-rose-600 font-medium mt-1">{errors.cholesterol.message}</p>}
            </div>

            {/* Field 5: Fasting Blood Sugar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="fastingBS" className="block text-sm font-medium text-slate-900">
                  Fasting Blood Sugar <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">threshold</span>
              </div>
              <select
                id="fastingBS"
                {...register('fastingBS')}
                aria-invalid={errors.fastingBS ? 'true' : 'false'}
                className={`w-full px-3.5 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.fastingBS ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-300 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              >
                <option value={0}>≤ 120 mg/dL (0)</option>
                <option value={1}>&gt; 120 mg/dL (1)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Select whether fasting blood sugar exceeds 120 mg/dL.</p>
              {errors.fastingBS && <p className="text-xs text-rose-600 font-medium mt-1">{errors.fastingBS.message}</p>}
            </div>

            {/* Field 6: Maximum Heart Rate */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="maxHR" className="block text-sm font-medium text-slate-900">
                  Maximum Heart Rate <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">bpm</span>
              </div>
              <input
                id="maxHR"
                type="number"
                {...register('maxHR')}
                aria-invalid={errors.maxHR ? 'true' : 'false'}
                className={`w-full px-3.5 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.maxHR ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-300 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              />
              <p className="text-xs text-slate-500 mt-1">Maximum heart rate achieved during exercise stress testing.</p>
              {errors.maxHR && <p className="text-xs text-rose-600 font-medium mt-1">{errors.maxHR.message}</p>}
            </div>

            {/* Field 7: Exercise-Induced Angina */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="exerciseAngina" className="block text-sm font-medium text-slate-900">
                  Exercise-Induced Angina <span className="text-rose-500">*</span>
                </label>
              </div>
              <select
                id="exerciseAngina"
                {...register('exerciseAngina')}
                aria-invalid={errors.exerciseAngina ? 'true' : 'false'}
                className={`w-full px-3.5 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.exerciseAngina ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-300 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              >
                <option value={0}>No (0)</option>
                <option value={1}>Yes (1)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Presence of exercise-induced angina symptoms.</p>
              {errors.exerciseAngina && <p className="text-xs text-rose-600 font-medium mt-1">{errors.exerciseAngina.message}</p>}
            </div>

            {/* Field 8: Oldpeak */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="oldpeak" className="block text-sm font-medium text-slate-900">
                  ST Depression (Oldpeak) <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">mm</span>
              </div>
              <input
                id="oldpeak"
                type="number"
                step="0.1"
                {...register('oldpeak')}
                aria-invalid={errors.oldpeak ? 'true' : 'false'}
                className={`w-full px-3.5 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.oldpeak ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-300 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              />
              <p className="text-xs text-slate-500 mt-1">ST depression induced by exercise relative to rest (in mm).</p>
              {errors.oldpeak && <p className="text-xs text-rose-600 font-medium mt-1">{errors.oldpeak.message}</p>}
            </div>

            {/* Field 9: Chest Pain Type */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="chestPainType" className="block text-sm font-medium text-slate-900">
                  Chest Pain Type <span className="text-rose-500">*</span>
                </label>
              </div>
              <select
                id="chestPainType"
                {...register('chestPainType')}
                aria-invalid={errors.chestPainType ? 'true' : 'false'}
                className={`w-full px-3.5 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.chestPainType ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-300 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              >
                <option value="ATA">Atypical Angina (ATA)</option>
                <option value="NAP">Non-Anginal Pain (NAP)</option>
                <option value="TA">Typical Angina (TA)</option>
                <option value="ASY">Asymptomatic (ASY)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Clinical classification of reported chest pain.</p>
              {errors.chestPainType && <p className="text-xs text-rose-600 font-medium mt-1">{errors.chestPainType.message}</p>}
            </div>

            {/* Field 10: ST Slope */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="stSlope" className="block text-sm font-medium text-slate-900">
                  ST Segment Slope <span className="text-rose-500">*</span>
                </label>
              </div>
              <select
                id="stSlope"
                {...register('stSlope')}
                aria-invalid={errors.stSlope ? 'true' : 'false'}
                className={`w-full px-3.5 py-2 border rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.stSlope ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-300 focus:ring-rose-500/20 focus:border-rose-500'
                }`}
              >
                <option value="Up">Upsloping (Up)</option>
                <option value="Flat">Flat</option>
                <option value="Down">Downsloping (Down)</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Slope of the peak exercise ST segment.</p>
              {errors.stSlope && <p className="text-xs text-rose-600 font-medium mt-1">{errors.stSlope.message}</p>}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing ML Risk Model & XAI...</span>
                </>
              ) : (
                <>
                  <span>Generate Risk Assessment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
