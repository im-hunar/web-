import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  Check, 
  Eye, 
  Sliders, 
  X, 
  Clock, 
  FileText,
  Activity
} from 'lucide-react';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [levelFilter, setLevelFilter] = useState('');
  const [readFilter, setReadFilter] = useState('');

  // Modals
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState({
    systolicBPThreshold: 140,
    cholesterolThreshold: 240,
    deltaBPThreshold: 20,
    deltaCholesterolThreshold: 30,
    maxConsecutiveHighRisk: 2
  });
  const [configSaving, setConfigSaving] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (levelFilter) queryParams.append('level', levelFilter);
      if (readFilter) queryParams.append('read', readFilter);

      const res = await fetch(`/api/alerts?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch health alerts');
      }

      setAlerts(data.alerts || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      setError(err.message || 'An error occurred while loading health alerts.');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/alerts/config');
      const data = await res.json();
      if (res.ok && data.config) {
        setConfig(data.config);
      }
    } catch (err) {
      console.error('Failed to load alert threshold config', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchConfig();
  }, [levelFilter, readFilter]);

  const handleMarkAsRead = async (alertId) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/read`, {
        method: 'PATCH'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to mark alert as read');
      }

      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
      if (selectedAlert && selectedAlert.id === alertId) {
        setSelectedAlert(data.alert);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setConfigSaving(true);
    try {
      const res = await fetch('/api/alerts/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update threshold settings');
      }

      setConfig(data.config);
      setShowConfigModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setConfigSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
            <Bell className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Smart Health Alerts</h1>
            <p className="text-sm text-slate-600">Non-diagnostic monitoring notifications and threshold tracking.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
          >
            <Sliders className="w-4 h-4 text-slate-500" /> Threshold Settings
          </button>
          <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-200">
            <span>Unread Alerts:</span>
            <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
          </div>
        </div>
      </div>

      {/* Mandatory Non-Emergency Disclaimer */}
      <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm flex items-start gap-3 shadow-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-amber-950">Monitoring Notice:</span>{' '}
          Health alerts provide automated threshold monitoring and do <strong>not</strong> diagnose emergency conditions or prescribe medical treatment. In the case of severe symptoms or a medical emergency, contact emergency medical services immediately.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <Filter className="w-4 h-4 text-slate-400" />
            <span>Filter Level:</span>
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="">All Alert Levels</option>
            <option value="INFO">INFO (Informational)</option>
            <option value="NOTICE">NOTICE (Measurement Change)</option>
            <option value="REVIEW">REVIEW (Assessment Check)</option>
          </select>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 ml-2">
            <span>Status:</span>
          </div>
          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="">All Statuses</option>
            <option value="false">Unread Only</option>
            <option value="true">Read Only</option>
          </select>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm mb-6 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAlerts} className="px-3 py-1 bg-rose-600 text-white rounded text-xs">Retry</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-medium">Checking health monitoring alerts...</p>
        </div>
      ) : alerts.length === 0 ? (
        /* Empty State */
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Alerts Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There are no health monitoring alerts matching your criteria.
          </p>
        </div>
      ) : (
        /* Alert Cards List */
        <div className="space-y-4">
          {alerts.map((alertItem) => {
            const isRead = alertItem.read;
            const level = alertItem.alertLevel;

            let levelBadgeStyle = 'bg-blue-100 text-blue-800 border-blue-200';
            let IconComponent = Info;
            if (level === 'NOTICE') {
              levelBadgeStyle = 'bg-amber-100 text-amber-900 border-amber-200';
              IconComponent = AlertTriangle;
            } else if (level === 'REVIEW') {
              levelBadgeStyle = 'bg-rose-100 text-rose-900 border-rose-200';
              IconComponent = ShieldAlert;
            }

            return (
              <div
                key={alertItem.id}
                className={`p-5 bg-white border rounded-2xl transition-all shadow-2xs ${
                  isRead ? 'border-slate-200 opacity-80' : 'border-amber-300 ring-2 ring-amber-500/10'
                }`}
              >
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-[280px]">
                    <div className={`p-2.5 rounded-xl shrink-0 ${levelBadgeStyle.split(' ')[0]}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${levelBadgeStyle}`}>
                          {level}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(alertItem.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 mt-1">{alertItem.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedAlert(alertItem)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" /> Details
                    </button>
                    {!isRead && (
                      <button
                        onClick={() => handleMarkAsRead(alertItem.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alert Details & Audit Log Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-600" /> Alert Details & Audit History
              </h3>
              <button onClick={() => setSelectedAlert(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Reason</div>
                <p className="text-sm font-medium text-slate-900">{selectedAlert.reason}</p>
                <div className="mt-3 text-xs text-slate-500 flex items-center gap-4">
                  <span>Level: <strong>{selectedAlert.alertLevel}</strong></span>
                  <span>Trigger: <strong>{selectedAlert.triggerType}</strong></span>
                  <span>Status: <strong>{selectedAlert.read ? 'Read' : 'Unread'}</strong></span>
                </div>
              </div>

              {/* Audit Log Timeline */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-400" /> Audit Log Entries
                </h4>
                <div className="space-y-2 border-l-2 border-slate-200 pl-4">
                  {selectedAlert.auditLog.map((log, index) => (
                    <div key={index} className="text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">{log.action}</span> by{' '}
                      <span className="font-mono text-slate-600">{log.actorId}</span> at{' '}
                      <span className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              {!selectedAlert.read && (
                <button
                  onClick={() => handleMarkAsRead(selectedAlert.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                >
                  Mark as Read
                </button>
              )}
              <button
                onClick={() => setSelectedAlert(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configurable Threshold Settings Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleSaveConfig} className="bg-white rounded-2xl max-w-lg w-full shadow-xl border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-slate-600" /> Monitoring Threshold Settings
              </h3>
              <button type="button" onClick={() => setShowConfigModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-xs text-indigo-900 flex items-start gap-2 mb-2">
                <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Documented Sources:</strong> Default thresholds derived from ACC/AHA Hypertension Guidelines (BP ≥ 140 mm Hg) and NCEP ATP III (Cholesterol ≥ 240 mg/dL). You can customize these thresholds to fit your monitoring preferences.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Systolic Blood Pressure Threshold (mm Hg)
                </label>
                <input
                  type="number"
                  value={config.systolicBPThreshold}
                  onChange={(e) => setConfig({ ...config, systolicBPThreshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Serum Cholesterol Threshold (mg/dL)
                </label>
                <input
                  type="number"
                  value={config.cholesterolThreshold}
                  onChange={(e) => setConfig({ ...config, cholesterolThreshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Significant Blood Pressure Delta (mm Hg change)
                </label>
                <input
                  type="number"
                  value={config.deltaBPThreshold}
                  onChange={(e) => setConfig({ ...config, deltaBPThreshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={configSaving}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg"
              >
                {configSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
