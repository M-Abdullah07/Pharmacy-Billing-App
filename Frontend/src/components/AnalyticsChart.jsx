import React, { useState, useEffect } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartTooltip,
  ChartLegendContent,
  ChartLegend,
} from '@/components/ui/chart';

const chartConfig = {
  sales: {
    label: 'Sales',
    color: '#2563eb',
  },
  purchases: {
    label: 'Purchases',
    color: '#60a5fa',
  },
};

export default function AnalyticsChart() {
  const [chartData, setChartData] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await window.electronAPI.getAnalyticsChartData();

        const formattedData = data.map((item) => ({
          month: item.month,
          sales: parseFloat(item.sales || 0),
          purchases: parseFloat(item.purchases || 0),
        }));
        setChartData(formattedData);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (error) {
    return (
      <div className="flex justify-center pb-24">
        <div className="w-full max-w-4xl p-4 bg-white dark:bg-zinc-900 rounded-lg shadow-sm text-red-500 text-sm">
          Analytics error: {error}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center pb-24">
        <div className="w-full max-w-4xl p-4 bg-white dark:bg-zinc-900 rounded-lg shadow-sm text-zinc-400 text-center">
          Loading Analytics…
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center pb-24">
      <div className="w-full max-w-4xl p-4 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
        <ChartContainer config={chartConfig} className="min-h-[150px] w-full">
          <LineChart data={chartData} width={500} height={200}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="linear"
              dataKey="sales"
              stroke="var(--color-sales)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="linear"
              dataKey="purchases"
              stroke="var(--color-purchases)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
