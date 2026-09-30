import React, { useEffect, useState } from 'react';
import { 
  History, 
  Calendar, 
  Filter, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert,
  Activity,
  BarChart3,
  Info
} from 'lucide-react';

export default function HistoryPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtering & Pagination state
  const [sort, setSort] = useState('newest');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Selected record for details modal
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        sort,
        page: page.toString(),
        limit: '8'
      });
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);

      const res = await fetch(`/api/history?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch assessment history');
      }

      setRecords(data.records || []);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.total || 0);
    } catch (err) {
      setError(err.message || 'An error occurred while loading assessment history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [sort, startDate, endDate, page]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
            <History className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Prediction History</h1>
            <p className="text-sm text-slate-600">Review past ML risk assessments, SHAP feature explanations, and submitted parameters.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-indigo-50 text-indigo-900 text-xs font-semibold px-3 py-1.5 rounded-full border border-indigo-200">
          <span>Total Assessments:</span>
          <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full">{totalRecords}</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Filter Date:</span>
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            aria-label="Start Date"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            aria-label="End Date"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); setPage(1); }}
              className="text-xs text-rose-600 hover:underline font-medium ml-1"
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <span>Sort:</span>
          </div>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchHistory} className="px-3 py-1 bg-rose-600 text-white rounded text-xs">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Loading assessment history records...</p>
        </div>
      ) : records.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Assessment Records Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            No risk assessment records match your current criteria. Submit a new assessment from the Risk Assessment page.
          </p>
        </div>
      ) : (
        /* History Records Table */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-slate-500">
                  <th className="py-3.5 px-6">Assessment Date</th>
                  <th className="py-3.5 px-6">Model Result</th>
                  <th className="py-3.5 px-6">Risk Probability</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {records.map((record) => {
                  const isHigherRisk = record.prediction === 1;
                  const formattedDate = new Date(record.timestamp).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  let probPercentage = 'N/A';
                  if (record.probability && typeof record.probability === 'object' && record.probability['1'] !== undefined) {
                    probPercentage = `${(record.probability['1'] * 100).toFixed(1)}%`;
                  }

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 text-slate-900 font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{formattedDate}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {isHigherRisk ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Higher Risk Assessment
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Lower Risk Assessment
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {probPercentage}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" /> View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalRecords} records)
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 border border-slate-300 bg-white disabled:opacity-40 text-xs font-medium rounded-lg flex items-center gap-1 text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border border-slate-300 bg-white disabled:opacity-40 text-xs font-medium rounded-lg flex items-center gap-1 text-slate-700"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" /> Assessment Record Details
              </h3>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Result Summary Banner */}
              <div className={`p-4 rounded-xl border ${selectedRecord.prediction === 1 ? 'bg-amber-50 border-amber-200 text-amber-950' : 'bg-emerald-50 border-emerald-200 text-emerald-950'}`}>
                <div className="text-xs uppercase tracking-wider font-semibold opacity-75">Model Assessment</div>
                <div className="text-base font-bold mt-1">
                  {selectedRecord.prediction === 1
                    ? 'The model generated a higher-risk assessment based on the submitted values.'
                    : 'The model generated a lower-risk assessment based on the submitted values.'}
                </div>
                <div className="text-xs mt-2 text-slate-600 flex items-center gap-4">
                  <span>Date: {new Date(selectedRecord.timestamp).toLocaleString()}</span>
                  <span>Model: {selectedRecord.modelVersion}</span>
                </div>
              </div>

              {/* Medical Disclaimer */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Disclaimer:</strong> AI-generated risk assessment. This result is not a medical diagnosis. Consult a qualified healthcare professional for medical decisions.
                </span>
              </div>

              {/* Explainable AI (XAI) Feature Contribution Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-600" /> Important Contributing Features
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Model-derived SHAP feature importance breakdown.
                </p>

                {selectedRecord.featureExplanationsSupported === false || !selectedRecord.featureContributions ? (
                  <div className="p-3 bg-slate-100 text-slate-600 text-xs rounded-lg font-medium">
                    Feature-level explanation is not available for this model.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedRecord.featureContributions.slice(0, 5).map((fc) => {
                      const maxContrib = selectedRecord.featureContributions[0].contribution || 1;
                      const barPercent = Math.min(100, Math.max(8, (fc.contribution / maxContrib) * 100));
                      const isPositive = fc.direction === 'increases_risk';

                      return (
                        <div key={fc.feature} className="p-2.5 bg-white border border-slate-200/80 rounded-lg">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold text-slate-800">{fc.label}</span>
                            <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded ${isPositive ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                              {isPositive ? '↑ Increases Risk' : '↓ Decreases Risk'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isPositive ? 'bg-amber-500' : 'bg-blue-500'}`}
                              style={{ width: `${barPercent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Submitted Inputs Grid */}
              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Submitted Model Inputs</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block">Age</span>
                    <span className="font-semibold text-slate-900">{selectedRecord.modelInputs.age} years</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block">Sex</span>
                    <span className="font-semibold text-slate-900">{selectedRecord.modelInputs.sex === 1 ? 'Male' : 'Female'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block">Resting BP</span>
                    <span className="font-semibold text-slate-900">{selectedRecord.modelInputs.restingBP} mm Hg</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block">Cholesterol</span>
                    <span className="font-semibold text-slate-900">{selectedRecord.modelInputs.cholesterol} mg/dL</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block">Fasting Sugar</span>
                    <span className="font-semibold text-slate-900">{selectedRecord.modelInputs.fastingBS === 1 ? '> 120 mg/dL' : '≤ 120 mg/dL'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block">Max Heart Rate</span>
                    <span className="font-semibold text-slate-900">{selectedRecord.modelInputs.maxHR} bpm</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block">Exercise Angina</span>
                    <span className="font-semibold text-slate-900">{selectedRecord.modelInputs.exerciseAngina === 1 ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block">Oldpeak</span>
                    <span className="font-semibold text-slate-900">{selectedRecord.modelInputs.oldpeak} mm</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-slate-500 block">Chest Pain Type</span>
                    <span className="font-semibold text-slate-900">{selectedRecord.modelInputs.chestPainType}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
