import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, AlertCircle, Clock, ShieldAlert } from 'lucide-react';

const formatPKR = (amount) => {
  const num = Number(amount) || 0;
  return 'Rs ' + num.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const StatCard = ({ title, value, sub, status, icon: Icon, colorClass }) => (
  <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-zinc-200 dark:hover:border-zinc-700 transition-all group">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-50 transition-colors`}>
        <Icon size={18} />
      </div>
      {status && (
        <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full ${status === 'up' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
          {status === 'up' ? '↑ Trend' : '↓ Risk'}
        </span>
      )}
    </div>
    <div className="space-y-1">
      <h3 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{title}</h3>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tighter">{value}</p>
      </div>
      <p className={`text-[11px] font-medium ${colorClass || 'text-zinc-400'}`}>{sub}</p>
    </div>
  </div>
);

export default function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!window.electronAPI?.getDashboardStats) return;
        const { saleData, profitData, outOfStockData, expiryData } = await window.electronAPI.getDashboardStats();

        setStats({
          totalSale: parseFloat(saleData?.[0]?.total_sale ?? 0),
          totalProfit: parseFloat(profitData?.[0]?.total_profit ?? 0),
          outOfStock: parseInt(outOfStockData?.[0]?.out_of_stock ?? 0, 10),
          critical: parseInt(expiryData?.[0]?.critical ?? 0, 10),
          warning: parseInt(expiryData?.[0]?.warning ?? 0, 10),
          watch: parseInt(expiryData?.[0]?.watch ?? 0, 10),
        });
      } catch (err) {
        setError(err.message);
      }
    };
    fetchStats();
  }, []);

  if (error) return <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-[11px] font-bold uppercase tracking-wider border border-rose-100 dark:border-rose-500/20">Telemetry Error: {error}</div>;

  const loading = stats === null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      <StatCard
        title="Gross Revenue"
        value={loading ? '—' : formatPKR(stats.totalSale)}
        sub="Life-to-date volume"
        icon={TrendingUp}
        status="up"
      />
      <StatCard
        title="Net Profit"
        value={loading ? '—' : formatPKR(stats.totalProfit)}
        sub="Retained earnings"
        icon={TrendingUp}
        status="up"
      />
      <StatCard
        title="Stock Depletion"
        value={loading ? '—' : stats.outOfStock}
        sub="Zero balance items"
        icon={Package}
        colorClass={stats?.outOfStock > 0 ? 'text-amber-500' : 'text-emerald-500'}
        status={stats?.outOfStock > 0 ? 'down' : null}
      />
      <StatCard
        title="Critical Expiry"
        value={loading ? '—' : stats.critical}
        sub="Expires < 30 days"
        icon={ShieldAlert}
        colorClass={stats?.critical > 0 ? 'text-rose-500' : 'text-zinc-400'}
        status={stats?.critical > 0 ? 'down' : null}
      />
      <StatCard
        title="Warning Batches"
        value={loading ? '—' : stats.warning}
        sub="Expires < 60 days"
        icon={AlertCircle}
        colorClass={stats?.warning > 0 ? 'text-amber-500' : 'text-zinc-400'}
      />
      <StatCard
        title="Watch Batches"
        value={loading ? '—' : stats.watch}
        sub="Monitoring phase"
        icon={Clock}
        colorClass="text-zinc-400"
      />
    </div>
  );
}
