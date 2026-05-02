import React from 'react';
import StatsPanel from '@/components/StatsPanel';
import ActivityList from '@/components/ActivityList';
import AnalyticsChart from '@/components/AnalyticsChart';
import NearExpiryPanel from '@/components/NearExpiryPanel';

export default function Dashboard() {
  return (
    <div className="flex flex-col h-full w-full max-w-[calc(100vw-50px)] overflow-auto gap-6">
      <StatsPanel />
      <NearExpiryPanel />
      <div className="flex flex-col gap-15">
        <ActivityList />
        <AnalyticsChart />
      </div>
    </div>
  );
}
