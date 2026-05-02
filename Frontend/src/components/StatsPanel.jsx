import React, { useState, useEffect } from 'react';

const formatPKR = (amount) => {
  const num = Number(amount) || 0;
  return 'Rs ' + num.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const StatCard = ({ title, value, sub, subColor = 'text-zinc-400', accent }) => (
  <div
    className={`dark:bg-white/20 bg-white/60 p-4 rounded-xl shadow-lg backdrop-blur-md border ${accent || 'border-white/10'}`}
  >
    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-300">{title}</h3>
    <p className="text-2xl font-bold py-1">{value}</p>
    <span className={`text-sm py-1 ${subColor}`}>{sub}</span>
  </div>
);

export default function StatsPanel() {
  const [stats, setStats] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!window.electronAPI?.getDashboardStats) {
          setError('electronAPI not available');
          return;
        }

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
        console.error('StatsPanel fetch error:', err);
        setError(err.message);
      }
    };

    fetchStats();
  }, []);

  if (error) {
    return (
      <div className="grid grid-cols-6 gap-2">
        <div className="col-span-6 p-4 rounded-xl bg-red-500/10 text-red-400 text-sm">
          Dashboard error: {error}
        </div>
      </div>
    );
  }

  const loading = stats === null;

  return (
    <div className="grid grid-cols-6 gap-2">
      <StatCard
        title="Total Profit"
        value={loading ? '—' : formatPKR(stats.totalProfit)}
        sub="All confirmed sales"
        subColor="text-green-400"
      />
      <StatCard
        title="Total Sales"
        value={loading ? '—' : formatPKR(stats.totalSale)}
        sub="All confirmed sales"
        subColor="text-green-400"
      />
      <StatCard
        title="Out of Stock"
        value={loading ? '—' : stats.outOfStock}
        sub="Active products"
        subColor="text-fuchsia-400"
      />
      <StatCard
        title="⚠ Critical Batches"
        value={loading ? '—' : stats.critical}
        sub="Expire within 30 days"
        subColor={stats?.critical > 0 ? 'text-red-500' : 'text-zinc-400'}
        accent={stats?.critical > 0 ? 'border-red-200 bg-red-50/60' : 'border-white/10'}
      />
      <StatCard
        title="⚠ Warning Batches"
        value={loading ? '—' : stats.warning}
        sub="Expire within 31–60 days"
        subColor={stats?.warning > 0 ? 'text-amber-500' : 'text-zinc-400'}
        accent={stats?.warning > 0 ? 'border-amber-200 bg-amber-50/60' : 'border-white/10'}
      />
      <StatCard
        title="👁 Watch Batches"
        value={loading ? '—' : stats.watch}
        sub="Expire within 61–90 days"
        subColor={stats?.watch > 0 ? 'text-yellow-600' : 'text-zinc-400'}
        accent={stats?.watch > 0 ? 'border-yellow-200 bg-yellow-50/60' : 'border-white/10'}
      />
    </div>
  );
}
