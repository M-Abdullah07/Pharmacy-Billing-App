import React, { useState, useEffect } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltipContent, ChartTooltip, ChartLegendContent, ChartLegend } from "@/components/ui/chart";

const chartConfig = {
  sales: {
    label: "Sales",
    color: "#2563eb",
  },
  expenses: {
    label: "Expenses",
    color: "#dc2626",
  },
};

export default function AnalyticsChart() {
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    try {
      setIsLoading(true);
      const api = window.electronAPI;

      // Get last 7 days of sales and expenses
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Get sales for this day
        const salesResult = await api.queryDb(
          'SELECT SUM(total_amount) as total FROM sales WHERE DATE(created_at) = ?',
          [dateStr]
        );
        const sales = salesResult?.[0]?.total || 0;

        // Get expenses for this day
        const expensesResult = await api.queryDb(
          'SELECT SUM(amount) as total FROM expenses WHERE DATE(expense_date) = ?',
          [dateStr]
        );
        const expenses = expensesResult?.[0]?.total || 0;

        last7Days.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          sales: parseFloat(sales),
          expenses: parseFloat(expenses)
        });
      }

      setChartData(last7Days);
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center pb-24">
        <div className="w-full max-w-4xl p-4 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Loading chart data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center pb-24">
      <div className="w-full max-w-4xl p-4 bg-white dark:bg-zinc-900 rounded-lg shadow-sm">
        <h3 className="text-xl font-bold mb-4">Sales vs Expenses (Last 7 Days)</h3>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <LineChart data={chartData} width={500} height={300}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="var(--color-sales)"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="expenses"
              stroke="var(--color-expenses)"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
