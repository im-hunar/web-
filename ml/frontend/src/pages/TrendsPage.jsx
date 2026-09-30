import React, { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Calendar, ShieldAlert, Heart, Activity, Info } from 'lucide-react';

export default function TrendsPage() {
  const [timeframe, setTimeframe] = useState('all'); // 'weekly', 'monthly', 'all'
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trends?timeframe=${timeframe}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch health trend monitoring data');
      }

      setTrends(data.trends || []);
    } catch (err) {
      setError(err.message || 'An error occurred while loading health trends.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrends();
  }, [timeframe]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-100 text-teal-700 rounded-xl">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Health Trend Monitoring</h1>
            <p className="text-sm text-slate-600">Track longitudinal changes in clinical indicators across assessment submissions.</p>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setTimeframe('weekly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              timeframe === 'weekly' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              timeframe === 'monthly' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              timeframe === 'all' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All-Time
          </button>
        </div>
      </div>

      {/* Medical Compliance Notice */}
      <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-950">Notice on Health Trends:</span>{' '}
          Health trend charts reflect historical clinical measurements recorded during risk assessment submissions. <strong>Trends do not prove disease progression or medical prognosis.</strong> Consult your healthcare provider for clinical evaluations.
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchTrends} className="px-3 py-1 bg-rose-600 text-white rounded text-xs">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Aggregating longitudinal health measurements...</p>
        </div>
      ) : trends.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">Insufficient Trend Data</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Submit multiple risk assessments over time to visualize longitudinal health trend charts.
          </p>
        </div>
      ) : (
        /* Charts Stack */
        <div className="space-y-8">
          {/* Chart 1: Blood Pressure & Heart Rate */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" /> Blood Pressure & Heart Rate Over Time
            </h2>
            <p className="text-xs text-slate-500 mb-6">Tracks resting blood pressure (mm Hg) and maximum heart rate (bpm).</p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dateFormatted" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="restingBP" name="Resting Blood Pressure (mm Hg)" stroke="#e11d48" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="maxHR" name="Max Heart Rate (bpm)" stroke="#0284c7" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Accessibility Text Summary */}
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700">
              <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-500" /> Accessible Data Summary (Blood Pressure & Heart Rate):
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {trends.map(t => (
                  <li key={t.id}>
                    <strong>{t.dateFormatted}:</strong> Resting BP = {t.restingBP} mm Hg, Max HR = {t.maxHR} bpm.
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Chart 2: Cholesterol Levels */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-500" /> Serum Cholesterol Levels
            </h2>
            <p className="text-xs text-slate-500 mb-6">Longitudinal serum cholesterol measurements (mg/dL).</p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dateFormatted" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="cholesterol" name="Serum Cholesterol (mg/dL)" stroke="#d97706" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Accessibility Text Summary */}
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700">
              <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-500" /> Accessible Data Summary (Cholesterol):
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {trends.map(t => (
                  <li key={t.id}>
                    <strong>{t.dateFormatted}:</strong> Cholesterol = {t.cholesterol} mg/dL.
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Chart 3: ST Depression (Oldpeak) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-600" /> Exercise ST Depression (Oldpeak)
            </h2>
            <p className="text-xs text-slate-500 mb-6">ST depression induced by exercise relative to rest (mm).</p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="dateFormatted" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                  <Legend />
                  <Line type="monotone" dataKey="oldpeak" name="ST Depression (mm)" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Accessibility Text Summary */}
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-700">
              <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-500" /> Accessible Data Summary (ST Depression):
              </div>
              <ul className="list-disc pl-5 space-y-1">
                {trends.map(t => (
                  <li key={t.id}>
                    <strong>{t.dateFormatted}:</strong> ST Depression = {t.oldpeak} mm.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
