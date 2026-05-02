import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartTooltip,
  ChartLegendContent,
  ChartLegend,
} from '@/components/ui/chart';

const chartData = [
  { month: 'January', antibiotics: 120, painkillers: 90 },
  { month: 'February', antibiotics: 160, painkillers: 130 },
  { month: 'March', antibiotics: 140, painkillers: 100 },
  { month: 'April', antibiotics: 110, painkillers: 150 },
  { month: 'May', antibiotics: 180, painkillers: 120 },
  { month: 'June', antibiotics: 170, painkillers: 140 },
];

const chartConfig = {
  antibiotics: {
    label: 'Antibiotics',
    color: '#2563eb',
  },
  painkillers: {
    label: 'Painkillers',
    color: '#60a5fa',
  },
};

export default function AnalyticsChart() {
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
              dataKey="antibiotics"
              stroke="var(--color-antibiotics)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="linear"
              dataKey="painkillers"
              stroke="var(--color-painkillers)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
