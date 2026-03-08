import React, { useState, useCallback } from 'react';
import { Download, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { generateAnalyticsReport } from '../../utils/reportGenerator';

/**
 * DownloadReportButton
 *
 * Renders a button that generates and downloads a comprehensive PDF analytics report.
 * Shows progress, success, and error states.
 *
 * Props:
 *   analyticsData  - The full analytics data object from Analytics.jsx state
 *   userData       - The current user object (from supabase auth)
 *   loading        - Whether analytics data is still loading
 *   disabled       - Additional disable condition
 */
const DownloadReportButton = ({ analyticsData, userData, loading = false, disabled = false }) => {
  const [status, setStatus] = useState('idle'); // idle | generating | success | error
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const hasData = analyticsData && analyticsData.kpi && (analyticsData.kpi.totalTests ?? 0) > 0;
  const isDisabled = disabled || loading || !hasData || status === 'generating';

  const handleDownload = useCallback(async () => {
    if (isDisabled) return;

    try {
      setStatus('generating');
      setProgress(0);
      setErrorMsg('');

      await generateAnalyticsReport(analyticsData, userData, (pct) => {
        setProgress(pct);
      });

      setStatus('success');

      // Revert to idle after 3 seconds
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 3000);
    } catch (err) {
      console.error('Report generation failed:', err);
      setErrorMsg(err?.message || 'Failed to generate report. Please try again.');
      setStatus('error');

      // Revert to idle after 4 seconds
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
        setErrorMsg('');
      }, 4000);
    }
  }, [analyticsData, userData, isDisabled]);

  // ── Render helpers ──────────────────────────────────────

  const renderIdleButton = () => (
    <button
      onClick={handleDownload}
      disabled={isDisabled}
      title={
        loading
          ? 'Loading analytics data...'
          : !hasData
          ? 'Take some tests first to generate a report'
          : 'Download your performance analytics as a PDF report'
      }
      className={`
        group relative flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm
        transition-all duration-200
        ${
          isDisabled
            ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
            : 'bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/20 hover:shadow-teal-500/30 active:scale-[0.97]'
        }
      `}
    >
      <Download size={18} className={isDisabled ? '' : 'group-hover:-translate-y-0.5 transition-transform'} />
      <span className="hidden sm:inline">Download Report</span>
      <span className="sm:hidden">PDF</span>
    </button>
  );

  const renderGeneratingButton = () => (
    <div className="flex items-center gap-3">
      <button
        disabled
        className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm bg-teal-600/40 text-teal-200 cursor-wait"
      >
        <Loader size={18} className="animate-spin" />
        <span className="hidden sm:inline">Generating... {progress}%</span>
        <span className="sm:hidden">{progress}%</span>
      </button>
      {/* Progress bar */}
      <div className="hidden md:block w-28 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );

  const renderSuccessButton = () => (
    <button
      disabled
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm bg-emerald-600 text-white"
    >
      <CheckCircle size={18} />
      <span className="hidden sm:inline">Report Downloaded!</span>
      <span className="sm:hidden">Done!</span>
    </button>
  );

  const renderErrorButton = () => (
    <button
      onClick={handleDownload}
      title={errorMsg}
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm bg-red-600/80 hover:bg-red-600 text-white transition-colors"
    >
      <AlertCircle size={18} />
      <span className="hidden sm:inline">Failed — Retry</span>
      <span className="sm:hidden">Retry</span>
    </button>
  );

  // ── Main render ─────────────────────────────────────────

  switch (status) {
    case 'generating':
      return renderGeneratingButton();
    case 'success':
      return renderSuccessButton();
    case 'error':
      return renderErrorButton();
    default:
      return renderIdleButton();
  }
};

export default DownloadReportButton;
