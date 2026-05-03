import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck, Clock, Flame } from 'lucide-react';

// Default configurable thresholds (days)
const DEFAULT_THRESHOLDS = { critical: 30, warning: 60, watch: 90 };

const LEVELS = [
  {
    key: 'critical',
    label: 'Critical',
    description: 'Expires within 30 days',
    icon: Flame,
    bg: 'bg-red-50 border-red-200',
    badge: 'bg-red-100 text-red-700',
    iconColor: 'text-red-500',
    numColor: 'text-red-700',
    dot: 'bg-red-500',
  },
  {
    key: 'warning',
    label: 'Warning',
    description: 'Expires within 31–60 days',
    icon: AlertTriangle,
    bg: 'bg-amber-50 border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    iconColor: 'text-amber-500',
    numColor: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  {
    key: 'watch',
    label: 'Watch',
    description: 'Expires within 61–90 days',
    icon: Clock,
    bg: 'bg-yellow-50 border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700',
    iconColor: 'text-yellow-500',
    numColor: 'text-yellow-700',
    dot: 'bg-yellow-500',
  },
];

export default function NearExpiryPanel({ thresholds = DEFAULT_THRESHOLDS }) {
  const [counts, setCounts] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (!window.electronAPI?.getNearExpiryStats) {
          setError('electronAPI not available');
          return;
        }

        const rows = await window.electronAPI.getNearExpiryStats(thresholds.critical, thresholds.warning, thresholds.watch);

        const row = rows?.[0] ?? { critical: 0, warning: 0, watch: 0 };
        setCounts({
          critical: parseInt(row.critical, 10) || 0,
          warning: parseInt(row.warning, 10) || 0,
          watch: parseInt(row.watch, 10) || 0,
        });
      } catch (err) {
        console.error('NearExpiryPanel error:', err);
        setError('Unable to load expiry data. Contact administrator.');
      }
    };

    load();
  }, [thresholds.critical, thresholds.warning, thresholds.watch]);

  // ── Error state (E1) ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
        <AlertTriangle size={18} className="shrink-0" />
        {error}
      </div>
    );
  }

  const loading = counts === null;
  const allClear = !loading && counts.critical === 0 && counts.warning === 0 && counts.watch === 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-800">Near-Expiry Batch Alerts</h2>
        </div>
        <span className="text-xs text-gray-400">
          Thresholds: {thresholds.critical}/{thresholds.warning}/{thresholds.watch} days
        </span>
      </div>

      {/* All-clear state (Alt Flow) */}
      {allClear && (
        <div className="flex items-center gap-3 py-4 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4">
          <ShieldCheck size={18} className="shrink-0 text-green-500" />
          <span className="text-sm font-medium">No near-expiry alerts at this time.</span>
        </div>
      )}

      {/* Alert cards */}
      {!allClear && (
        <div className="grid grid-cols-3 gap-3">
          {LEVELS.map(
            ({ key, label, description, icon: Icon, bg, badge, iconColor, numColor, dot }) => {
              const count = loading ? null : counts[key];
              const hasAlert = count > 0;
              return (
                <div
                  key={key}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all
                  ${hasAlert ? bg : 'bg-gray-50 border-gray-100'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-semibold ${hasAlert ? numColor : 'text-gray-400'}`}
                      >
                        {label}
                      </span>
                      {hasAlert && (
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                          Alert
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{loading ? '—' : count}</p>
                    <p
                      className={`text-[11px] mt-0.5 ${hasAlert ? 'text-gray-500' : 'text-gray-300'}`}
                    >
                      {description}
                    </p>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
