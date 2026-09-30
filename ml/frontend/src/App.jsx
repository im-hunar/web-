import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import AssessmentPage from './pages/AssessmentPage';
import HistoryPage from './pages/HistoryPage';
import TrendsPage from './pages/TrendsPage';
import AlertsPage from './pages/AlertsPage';
import PrivacyPage from './pages/PrivacyPage';
import { Heart, History, TrendingUp, Activity, Bell, ShieldCheck } from 'lucide-react';

function Navigation() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const checkUnreadAlerts = async () => {
      try {
        const res = await fetch('/api/alerts?read=false');
        const data = await res.json();
        if (res.ok && data.unreadCount !== undefined) {
          setUnreadCount(data.unreadCount);
        }
      } catch (err) {
        // Silent catch for nav badge check
      }
    };
    checkUnreadAlerts();
    const interval = setInterval(checkUnreadAlerts, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/assessment" className="flex items-center gap-2.5 font-bold text-slate-900 text-lg">
          <div className="p-2 bg-rose-600 text-white rounded-lg shadow-xs">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <span>HeartGuard</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/assessment"
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              isActive('/assessment')
                ? 'bg-rose-50 text-rose-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Risk Assessment</span>
          </Link>

          <Link
            to="/history"
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              isActive('/history')
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </Link>

          <Link
            to="/trends"
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              isActive('/trends')
                ? 'bg-teal-50 text-teal-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Health Trends</span>
          </Link>

          <Link
            to="/alerts"
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 relative ${
              isActive('/alerts')
                ? 'bg-amber-50 text-amber-800'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Alerts</span>
            {unreadCount > 0 && (
              <span className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                {unreadCount}
              </span>
            )}
          </Link>

          <Link
            to="/privacy"
            className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
              isActive('/privacy')
                ? 'bg-purple-50 text-purple-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Privacy & Sharing</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navigation />

        {/* Main Content */}
        <main className="flex-1 py-6">
          <Routes>
            <Route path="/assessment" element={<AssessmentPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<Navigate to="/assessment" replace />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          HeartGuard Clinical Risk Assessment Platform &copy; 2026. Powered by scikit-learn ML Model & Express/FastAPI Architecture.
        </footer>
      </div>
    </BrowserRouter>
  );
}
