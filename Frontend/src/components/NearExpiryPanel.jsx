import React, { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck, Clock, ShieldAlert, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_THRESHOLDS = { critical: 30, warning: 60, watch: 90 };

const RiskItem = ({ label, count, description, status, loading }) => {
  const isZero = count === 0;
  
  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-xl border transition-all",
      isZero ? "bg-zinc-50/50 dark:bg-zinc-900/30 border-transparent opacity-60" : 
      status === 'critical' ? "bg-rose-50/50 dark:bg-rose-500/5 border-rose-100 dark:border-rose-500/20" :
      status === 'warning' ? "bg-amber-50/50 dark:bg-amber-500/5 border-amber-100 dark:border-amber-500/20" :
      "bg-zinc-50/50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm",
          isZero ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400" :
          status === 'critical' ? "bg-rose-500 text-white shadow-rose-500/20" :
          status === 'warning' ? "bg-amber-500 text-white shadow-amber-500/20" :
          "bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 shadow-zinc-900/20"
        )}>
          {status === 'critical' ? <ShieldAlert size={18} /> : 
           status === 'warning' ? <AlertTriangle size={18} /> : 
           <Clock size={18} />}
        </div>
        <div>
          <h4 className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em]",
            isZero ? "text-zinc-400" : 
            status === 'critical' ? "text-rose-600 dark:text-rose-400" : 
            status === 'warning' ? "text-amber-600 dark:text-amber-400" : 
            "text-zinc-900 dark:text-zinc-50"
          )}>
            {label}
          </h4>
          <p className="text-[11px] text-zinc-500 font-medium">{description}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className={cn(
            "text-xl font-black tabular-nums tracking-tighter",
            isZero ? "text-zinc-300 dark:text-zinc-700" : "text-zinc-900 dark:text-zinc-50"
          )}>
            {loading ? '—' : count}
          </p>
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Units</span>
        </div>
        <ChevronRight size={14} className="text-zinc-300" />
      </div>
    </div>
  );
};

export default function NearExpiryPanel({ thresholds = DEFAULT_THRESHOLDS }) {
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        if (!window.electronAPI?.getNearExpiryStats) return;
        const rows = await window.electronAPI.getNearExpiryStats(thresholds.critical, thresholds.warning, thresholds.watch);
        const row = rows?.[0] ?? { critical: 0, warning: 0, watch: 0 };
        setCounts({
          critical: parseInt(row.critical, 10) || 0,
          warning: parseInt(row.warning, 10) || 0,
          watch: parseInt(row.watch, 10) || 0,
        });
      } catch (err) {
        setError('Telemetry failure');
      }
    };
    load();
  }, [thresholds.critical, thresholds.warning, thresholds.watch]);

  if (error) return <div className="p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 dark:border-rose-500/20 uppercase tracking-widest">{error}</div>;

  const loading = counts === null;
  const allClear = !loading && counts.critical === 0 && counts.warning === 0 && counts.watch === 0;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-8 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm font-black text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
          Regulatory Compliance
          {allClear && <ShieldCheck size={16} className="text-emerald-500" />}
        </h2>
        <div className="flex gap-1.5">
           <div className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 rounded text-[9px] font-bold text-zinc-400 uppercase tracking-widest border border-zinc-100 dark:border-zinc-700">
             Live Scrutiny
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 flex-1">
        <RiskItem 
          label="Critical Risk" 
          count={counts?.critical ?? 0} 
          description="Immediate liquidation required" 
          status="critical"
          loading={loading}
        />
        <RiskItem 
          label="Warning Phase" 
          count={counts?.warning ?? 0} 
          description="Stock rotation recommended" 
          status="warning"
          loading={loading}
        />
        <RiskItem 
          label="Observation" 
          count={counts?.watch ?? 0} 
          description="Monitoring expiry trajectory" 
          status="watch"
          loading={loading}
        />
      </div>

      <div className="mt-8 pt-6 border-t border-zinc-50 dark:border-zinc-800">
         <p className="text-[10px] text-zinc-400 font-medium">
            Thresholds enforced: {thresholds.critical}/{thresholds.warning}/{thresholds.watch} days. 
            All data audited via system log.
         </p>
      </div>
    </div>
  );
}
