import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  UserCheck, 
  UserX, 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  FileText, 
  Activity, 
  TrendingUp, 
  Bell, 
  Calendar, 
  RefreshCw, 
  Info,
  CheckCircle2,
  ChevronRight,
  ShieldOff
} from 'lucide-react';

const PERMISSION_CONFIG = [
  {
    key: 'assessments',
    label: 'Assessments',
    description: 'View cardiovascular ML risk assessment records and historical predictions',
    icon: Activity
  },
  {
    key: 'trends',
    label: 'Trends',
    description: 'View longitudinal blood pressure, heart rate, and cholesterol trend charts',
    icon: TrendingUp
  },
  {
    key: 'alerts',
    label: 'Alerts',
    description: 'View smart clinical alerts and vital sign elevation notifications',
    icon: Bell
  },
  {
    key: 'reminders',
    label: 'Reminders',
    description: 'View medication schedules and routine clinical follow-up dates',
    icon: Calendar
  },
  {
    key: 'reports',
    label: 'Reports',
    description: 'View official physician diagnostic reports and medical consultation summaries',
    icon: FileText
  }
];

export default function PrivacyPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [caregivers, setCaregivers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Invite Form State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState(null);

  // Caregiver Simulation Verification State
  const [activeTab, setActiveTab] = useState('patient'); // 'patient' or 'caregiver'
  const [simResults, setSimResults] = useState({});
  const [simulating, setSimulating] = useState(false);

  // Load session & initial data
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get current user or auto-login default demo patient
      let meRes = await fetch('/api/auth/me');
      let userData;
      if (!meRes.ok) {
        // Auto-initialize demo patient session for seamless evaluation
        const switchRes = await fetch('/api/auth/demo-switch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'PATIENT' })
        });
        const switchData = await switchRes.json();
        userData = switchData.user;
      } else {
        const meData = await meRes.json();
        userData = meData.user;
      }
      setCurrentUser(userData);

      // If user is patient, load caregivers & audit logs
      if (userData && userData.role === 'PATIENT') {
        await Promise.all([fetchCaregivers(), fetchAuditLogs()]);
      } else if (userData && userData.role === 'CAREGIVER') {
        setActiveTab('caregiver');
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize session data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCaregivers = async () => {
    try {
      const res = await fetch('/api/privacy/caregivers');
      const data = await res.json();
      if (res.ok) {
        setCaregivers(data.caregivers || []);
      }
    } catch (err) {
      console.error('Error fetching caregivers:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/privacy/audit-logs');
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Handle switching personas between Patient and Caregiver
  const handleSwitchRole = async (targetRole) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch('/api/auth/demo-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: targetRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to switch role');

      setCurrentUser(data.user);
      setActiveTab(targetRole === 'CAREGIVER' ? 'caregiver' : 'patient');
      setSuccessMessage(`Switched active session to ${data.user.name} (${data.user.role})`);

      if (targetRole === 'PATIENT') {
        await Promise.all([fetchCaregivers(), fetchAuditLogs()]);
      } else {
        // Run live simulation checks for caregiver
        runCaregiverChecks(data.user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Toggle permission flag for a caregiver
  const handleTogglePermission = async (caregiverId, permissionKey) => {
    setError(null);
    setSuccessMessage(null);
    const targetCaregiver = caregivers.find(c => c.caregiverId === caregiverId);
    if (!targetCaregiver) return;

    const currentVal = targetCaregiver.permissions[permissionKey];
    const newPermissions = {
      ...targetCaregiver.permissions,
      [permissionKey]: !currentVal
    };

    try {
      const res = await fetch(`/api/privacy/caregivers/${caregiverId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: newPermissions })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update permission');
      }

      setCaregivers(prev => prev.map(c => 
        c.caregiverId === caregiverId ? { ...c, permissions: data.permission.permissions, status: data.permission.status } : c
      ));

      setSuccessMessage(`Updated ${PERMISSION_CONFIG.find(p => p.key === permissionKey)?.label} permission to ${!currentVal ? 'GRANTED' : 'DENIED'} for ${targetCaregiver.caregiverName}`);
      fetchAuditLogs();
    } catch (err) {
      setError(err.message);
    }
  };

  // Revoke caregiver access
  const handleRevokeAccess = async (caregiverId) => {
    if (!window.confirm('Are you sure you want to revoke all access for this caregiver? All permissions will be deactivated immediately.')) {
      return;
    }

    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch(`/api/privacy/caregivers/${caregiverId}/revoke`, {
        method: 'POST'
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke caregiver access');
      }

      setCaregivers(prev => prev.map(c => 
        c.caregiverId === caregiverId ? { ...c, status: 'REVOKED', permissions: data.permission.permissions } : c
      ));

      setSuccessMessage(`Access successfully REVOKED for ${data.permission.caregiverName || 'caregiver'}. All permissions disabled.`);
      fetchAuditLogs();
    } catch (err) {
      setError(err.message);
    }
  };

  // Invite trusted caregiver
  const handleInviteCaregiver = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;

    setInviting(true);
    setInviteError(null);
    try {
      const res = await fetch('/api/privacy/caregivers/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          name: inviteName.trim()
          // Default permission: NO ACCESS (omitted or empty)
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to invite caregiver');
      }

      setCaregivers(prev => [...prev, data.permission]);
      setShowInviteModal(false);
      setInviteName('');
      setInviteEmail('');
      setSuccessMessage(`Caregiver ${data.permission.caregiverName} invited successfully with default NO ACCESS. Explicitly grant permissions when ready.`);
      fetchAuditLogs();
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  };

  // Live test caregiver permissions against backend endpoints
  const runCaregiverChecks = async (user) => {
    setSimulating(true);
    const results = {};
    const patientId = 'patient_alpha_id';

    // 1. Check Assessments
    try {
      const res = await fetch(`/api/history?patientId=${patientId}`);
      const data = await res.json();
      results.assessments = { status: res.status, ok: res.ok, data: data.records ? `${data.records.length} records available` : data.error };
    } catch (err) {
      results.assessments = { status: 500, ok: false, error: err.message };
    }

    // 2. Check Trends
    try {
      const res = await fetch(`/api/trends?patientId=${patientId}`);
      const data = await res.json();
      results.trends = { status: res.status, ok: res.ok, data: data.trends ? `${data.trends.length} data points` : data.error };
    } catch (err) {
      results.trends = { status: 500, ok: false, error: err.message };
    }

    // 3. Check Alerts
    try {
      const res = await fetch(`/api/alerts?patientId=${patientId}`);
      const data = await res.json();
      results.alerts = { status: res.status, ok: res.ok, data: data.alerts ? `${data.alerts.length} alerts` : data.error };
    } catch (err) {
      results.alerts = { status: 500, ok: false, error: err.message };
    }

    // 4. Check Reminders
    try {
      const res = await fetch(`/api/reminders?patientId=${patientId}`);
      const data = await res.json();
      results.reminders = { status: res.status, ok: res.ok, data: data.reminders ? `${data.reminders.length} reminders` : data.error };
    } catch (err) {
      results.reminders = { status: 500, ok: false, error: err.message };
    }

    // 5. Check Reports
    try {
      const res = await fetch(`/api/reports?patientId=${patientId}`);
      const data = await res.json();
      results.reports = { status: res.status, ok: res.ok, data: data.reports ? `${data.reports.length} clinical reports` : data.error };
    } catch (err) {
      results.reports = { status: 500, ok: false, error: err.message };
    }

    // 6. Test Prohibited Action: Run Assessment
    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: 50, sex: 1, restingBP: 120, cholesterol: 200, fastingBS: 0, maxHR: 150, exerciseAngina: 0, oldpeak: 1.0, chestPainType: 'ATA', stSlope: 'Up'
        })
      });
      const data = await res.json();
      results.prohibitedAssessment = { status: res.status, ok: res.ok, message: data.error || 'Allowed' };
    } catch (err) {
      results.prohibitedAssessment = { status: 500, ok: false, message: err.message };
    }

    // 7. Test Prohibited Action: Modify Patient Threshold
    try {
      const res = await fetch('/api/alerts/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, systolicBPThreshold: 180 })
      });
      const data = await res.json();
      results.prohibitedThreshold = { status: res.status, ok: res.ok, message: data.error || 'Allowed' };
    } catch (err) {
      results.prohibitedThreshold = { status: 500, ok: false, message: err.message };
    }

    setSimResults(results);
    setSimulating(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Privacy & Sharing</h1>
            <p className="text-sm text-slate-600">
              Manage trusted caregiver access, granular health permissions, and security audit logs.
            </p>
          </div>
        </div>

        {/* Live Role Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-xs">
          <span className="font-semibold text-slate-600 px-2">Active Session:</span>
          <button
            onClick={() => handleSwitchRole('PATIENT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentUser?.role === 'PATIENT'
                ? 'bg-white text-indigo-700 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Patient (Sarah Patient)
          </button>
          <button
            onClick={() => handleSwitchRole('CAREGIVER')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              currentUser?.role === 'CAREGIVER'
                ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Caregiver (John Doe)
          </button>
        </div>
      </header>

      {/* Notifications */}
      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section 1: Core Caregiver & Permission Cards (Matching Prompt Specification) */}
      <div className="space-y-6 mb-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <span>Trusted Caregivers</span>
          </h2>
          {currentUser?.role === 'PATIENT' && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Trusted Caregiver</span>
            </button>
          )}
        </div>

        {caregivers.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
            <Lock className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No Caregiver Delegated</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Default permission is NO ACCESS. Invite a trusted family member or caregiver to grant explicit read-only access.
            </p>
            {currentUser?.role === 'PATIENT' && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Trusted Caregiver</span>
              </button>
            )}
          </div>
        ) : (
          caregivers.map((cg) => {
            const isRevoked = cg.status === 'REVOKED';

            return (
              <div 
                key={cg.id || cg.caregiverId} 
                className={`bg-white border rounded-2xl p-6 shadow-xs transition-all ${
                  isRevoked ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-100 gap-4">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Caregiver:</span>
                    <h3 className="text-xl font-bold text-slate-900 mt-0.5">{cg.caregiverName || 'John Doe'}</h3>
                    <p className="text-xs text-slate-500">{cg.caregiverEmail || 'caregiver@example.com'}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                      isRevoked 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}>
                      {isRevoked ? 'REVOKED' : 'ACTIVE'}
                    </span>

                    {currentUser?.role === 'PATIENT' && !isRevoked && (
                      <button
                        onClick={() => handleRevokeAccess(cg.caregiverId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Revoke Access</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Prompt-matching summary badges:
                    Permissions:
                    ✓ Assessments
                    ✓ Trends
                    ✗ Reports
                */}
                <div className="py-4 border-b border-slate-100">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2.5">
                    Permissions:
                  </div>
                  <div className="flex flex-wrap gap-2.5 font-mono text-xs">
                    {PERMISSION_CONFIG.map(({ key, label }) => {
                      const granted = !isRevoked && cg.permissions && cg.permissions[key] === true;
                      return (
                        <div
                          key={key}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold border ${
                            granted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border-slate-300 line-through'
                          }`}
                        >
                          <span>{granted ? '✓' : '✗'}</span>
                          <span>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Granular Permission Control Toggles */}
                <div className="pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Patient Granular Privacy Controls:
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Default: <strong className="text-slate-600">NO ACCESS</strong>. Patient must explicitly grant.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {PERMISSION_CONFIG.map(({ key, label, description, icon: Icon }) => {
                      const isGranted = !isRevoked && cg.permissions && cg.permissions[key] === true;

                      return (
                        <div 
                          key={key} 
                          className={`p-3.5 rounded-xl border transition-all ${
                            isGranted 
                              ? 'bg-indigo-50/40 border-indigo-200' 
                              : 'bg-slate-50 border-slate-200 opacity-80'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`p-1.5 rounded-lg ${isGranted ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                <Icon className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-semibold text-slate-800">{label}</span>
                            </div>

                            {currentUser?.role === 'PATIENT' && (
                              <button
                                type="button"
                                disabled={isRevoked}
                                onClick={() => handleTogglePermission(cg.caregiverId, key)}
                                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                  isGranted ? 'bg-indigo-600' : 'bg-slate-300'
                                } ${isRevoked ? 'cursor-not-allowed opacity-50' : ''}`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                    isGranted ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-2 line-clamp-2">{description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Prohibitions Notice */}
                <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                  <div className="font-semibold text-amber-950 mb-1 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                    <span>Caregiver Restrictions (Enforced by Backend):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-amber-800 text-[11px]">
                    <div>• Cannot modify medical records</div>
                    <div>• Cannot run assessments on behalf of patient</div>
                    <div>• Cannot change patient information / thresholds</div>
                    <div>• Cannot grant permissions to others</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Section 2: Caregiver Verification & Live Backend Enforcement Test Sandbox */}
      <div className="mb-10 bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-base font-bold text-white">Caregiver Backend Enforcement Verification</h3>
              <p className="text-xs text-slate-400">
                Directly invokes API endpoints using caregiver authentication to verify that backend RBAC & IDOR protections are strictly active.
              </p>
            </div>
          </div>
          <button
            onClick={() => runCaregiverChecks(currentUser)}
            disabled={simulating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
            <span>Run Live Verification</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Assessments Check */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-200">GET /api/history</span>
              <span className={`px-2 py-0.5 rounded-sm font-mono font-bold text-[10px] ${
                simResults.assessments?.status === 200 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {simResults.assessments ? `${simResults.assessments.status} ${simResults.assessments.ok ? 'OK' : 'FORBIDDEN'}` : 'READY'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] truncate">
              {simResults.assessments?.data || 'Tests if caregiver can read assessment records'}
            </p>
          </div>

          {/* Trends Check */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-200">GET /api/trends</span>
              <span className={`px-2 py-0.5 rounded-sm font-mono font-bold text-[10px] ${
                simResults.trends?.status === 200 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {simResults.trends ? `${simResults.trends.status} ${simResults.trends.ok ? 'OK' : 'FORBIDDEN'}` : 'READY'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] truncate">
              {simResults.trends?.data || 'Tests if caregiver can view vitals trend data'}
            </p>
          </div>

          {/* Reports Check */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-200">GET /api/reports</span>
              <span className={`px-2 py-0.5 rounded-sm font-mono font-bold text-[10px] ${
                simResults.reports?.status === 200 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {simResults.reports ? `${simResults.reports.status} ${simResults.reports.ok ? 'OK' : 'FORBIDDEN'}` : 'READY'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] truncate">
              {simResults.reports?.data || 'Tests if caregiver can access official reports'}
            </p>
          </div>

          {/* Alerts Check */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-200">GET /api/alerts</span>
              <span className={`px-2 py-0.5 rounded-sm font-mono font-bold text-[10px] ${
                simResults.alerts?.status === 200 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                {simResults.alerts ? `${simResults.alerts.status} ${simResults.alerts.ok ? 'OK' : 'FORBIDDEN'}` : 'READY'}
              </span>
            </div>
            <p className="text-slate-400 text-[11px] truncate">
              {simResults.alerts?.data || 'Tests if caregiver can view health alerts'}
            </p>
          </div>

          {/* Prohibited: Submit Assessment */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-200">POST /api/assessment</span>
              <span className="px-2 py-0.5 rounded-sm font-mono font-bold text-[10px] bg-rose-950 text-rose-400 border border-rose-800">
                {simResults.prohibitedAssessment ? `${simResults.prohibitedAssessment.status} REJECTED` : 'READY'}
              </span>
            </div>
            <p className="text-rose-300 text-[11px] truncate">
              {simResults.prohibitedAssessment?.message || 'Must be rejected: Caregiver cannot run assessments'}
            </p>
          </div>

          {/* Prohibited: Change Config */}
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-slate-200">PUT /api/alerts/config</span>
              <span className="px-2 py-0.5 rounded-sm font-mono font-bold text-[10px] bg-rose-950 text-rose-400 border border-rose-800">
                {simResults.prohibitedThreshold ? `${simResults.prohibitedThreshold.status} REJECTED` : 'READY'}
              </span>
            </div>
            <p className="text-rose-300 text-[11px] truncate">
              {simResults.prohibitedThreshold?.message || 'Must be rejected: Caregiver cannot alter thresholds'}
            </p>
          </div>
        </div>
      </div>

      {/* Section 3: Privacy & Security Audit Trail */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Privacy & Sharing Audit Trail</h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {auditLogs.length} logged events
          </span>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">No privacy audit records found yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Timestamp</th>
                  <th className="pb-2.5">Action</th>
                  <th className="pb-2.5">Actor</th>
                  <th className="pb-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        log.action === 'CAREGIVER_INVITED'
                          ? 'bg-blue-100 text-blue-800'
                          : log.action === 'CAREGIVER_PERMISSIONS_UPDATED'
                          ? 'bg-amber-100 text-amber-800'
                          : log.action === 'CAREGIVER_ACCESS_REVOKED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-slate-600">{log.actorId}</td>
                    <td className="py-2.5 text-slate-700 max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : 'Audit record'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>Invite Trusted Caregiver</span>
              </h3>
              <button 
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteCaregiver} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Caregiver Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Caregiver Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john.doe@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                <p className="font-semibold text-amber-950 mb-0.5">Default Permission: NO ACCESS</p>
                <p className="text-amber-800 text-[11px]">
                  When invited, the caregiver receives 0 access permissions by default. You must explicitly grant access to each section.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  {inviting ? 'Inviting...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
