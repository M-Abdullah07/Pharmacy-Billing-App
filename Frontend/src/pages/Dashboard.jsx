import React from 'react';
import StatsPanel from '@/components/StatsPanel';
import ActivityList from '@/components/ActivityList';
import AnalyticsChart from '@/components/AnalyticsChart';

export default function Dashboard() {
  return (
    <div className="flex flex-col h-full w-full max-w-[calc(100vw-50px)] overflow-auto">
      <StatsPanel />
      <div className="flex flex-col gap-15 mt-8">
        <ActivityList />
        <AnalyticsChart />
      </div>
    </div>
  );
}
