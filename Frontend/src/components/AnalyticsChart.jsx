import React, { useState, useEffect } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartTooltip,
} from '@/components/ui/chart';

const chartConfig = {
  sales: {
    label: 'Sales Revenue',
    color: '#000000', // Bloomberg Black/Dark
  },
  purchases: {
    label: 'Inventory Outflow',
    color: '#2563eb', // Professional Blue
  },
};

export default function AnalyticsChart() {
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        if (!window.electronAPI?.getAnalyticsChartData) return;
        const data = await window.electronAPI.getAnalyticsChartData();
        const formattedData = data.map((item) => ({
          month: item.month,
          sales: parseFloat(item.sales || 0),
          purchases: parseFloat(item.purchases || 0),
        }));
        setChartData(formattedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (error) return <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold border border-rose-100 uppercase tracking-widest">Analytics Failure: {error}</div>;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-zinc-900 dark:bg-zinc-50" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Revenue Flow</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Procurement</span>
           </div>
        </div>
        <div className="px-2 py-1 bg-zinc-50 dark:bg-zinc-800 rounded text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] border border-zinc-100 dark:border-zinc-700">
           Trailing 12 Months
        </div>
      </div>

      <div className="h-[300px] w-full">
        {loading ? (
          <div className="h-full w-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="w-1/2 h-full bg-zinc-400 animate-[shimmer_2s_infinite]" />
              </div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Synchronizing Data</span>
            </div>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-sales)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--color-sales)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-purchases)" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="var(--color-purchases)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis 
                  dataKey="month" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#a1a1aa', fontSize: 9, fontWeight: 700 }}
                  tickFormatter={(val) => val.slice(0, 3).toUpperCase()}
                  dy={10}
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: '#a1a1aa', fontSize: 9, fontWeight: 700 }}
                  tickFormatter={(val) => `Rs${val / 1000}k`}
                />
                <Tooltip content={<ChartTooltipContent hideLabel />} />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="var(--color-sales)" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorSales)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="purchases" 
                  stroke="var(--color-purchases)" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorPurchases)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </div>
    </div>
  );
}
