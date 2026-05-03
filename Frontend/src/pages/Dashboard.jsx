import React from 'react';
import StatsPanel from '@/components/StatsPanel';
import ActivityList from '@/components/ActivityList';
import AnalyticsChart from '@/components/AnalyticsChart';
import NearExpiryPanel from '@/components/NearExpiryPanel';

export default function Dashboard() {
  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden bg-[#fafafa] dark:bg-[#0a0a0a] transition-colors duration-300">
      <div className="flex-1 overflow-auto no-scrollbar p-8 space-y-8">
        {/* ── Top Section: Key Metrics ─────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Financial Pulse</h2>
          </div>
          <StatsPanel />
        </section>

        {/* ── Main Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* ── Left Column: Analytics & Expiry (Primary Context) ───────────── */}
          <div className="col-span-12 xl:col-span-8 space-y-8">
             <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Revenue Performance</h2>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <AnalyticsChart />
                </div>
             </section>

             <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Inventory Risks</h2>
                </div>
                <NearExpiryPanel />
             </section>
          </div>

          {/* ── Right Column: Activity Stream ───────────────────────────────── */}
          <div className="col-span-12 xl:col-span-4 h-full">
            <section className="space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Live Activity</h2>
              </div>
              <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                <ActivityList />
              </div>
            </section>
          </div>

        </div>
      </div>
    </div>
  );
}
