import React from "react";
import StatsPanel from "../components/StatsPanel";
import ActivityList from "../components/ActivityList";
// import AnalyticsChart from "./AnalyticsChart";

export default function Dashboard() {
  return (
    <div className="flex flex-col h-fit w-full max-w-[calc(100vw-100px)] overflow-auto">
      <StatsPanel />
      <div className="flex flex-col gap-4 mt-8">
        <ActivityList />
        {/* Commenting this out for now
          <AnalyticsChart />
        */}
      </div>
    </div>
  );
}
