import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ArrowUpRight, ArrowDownLeft, RefreshCcw, DollarSign, Receipt } from 'lucide-react';

const ActivityIcon = ({ type }) => {
  const iconSize = 16;
  switch (type) {
    case 'Sale':
      return <div className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><ArrowUpRight size={iconSize} /></div>;
    case 'Purchase':
      return <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"><ArrowDownLeft size={iconSize} /></div>;
    case 'Sale Return':
    case 'Purchase Return':
      return <div className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"><RefreshCcw size={iconSize} /></div>;
    case 'Payment Received':
    case 'Payment Paid':
      return <div className="p-1.5 rounded-md bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900"><DollarSign size={iconSize} /></div>;
    default:
      return <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-400"><Receipt size={iconSize} /></div>;
  }
};

export default function ActivityList() {
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        if (!window.electronAPI?.getActivityList) return;
        const data = await window.electronAPI.getActivityList();
        setActivities(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-800/20">
        <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-[0.2em]">Transaction Ledger</h3>
        <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest tabular-nums">Latest 10</span>
      </div>
      
      <div className="flex-1 overflow-auto no-scrollbar">
        <Table>
          <TableHeader className="bg-zinc-50/50 dark:bg-zinc-800/30 sticky top-0 z-10">
            <TableRow className="hover:bg-transparent border-b border-zinc-100 dark:border-zinc-800">
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-12 px-6">Event</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-12 px-6">Reference</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 h-12 px-6 text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                   <TableCell colSpan={3} className="h-14 px-6"><div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded w-full" /></TableCell>
                </TableRow>
              ))
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-20">
                  <p className="text-[10px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">Awaiting Transactions</p>
                </TableCell>
              </TableRow>
            ) : (
              activities.map((act, index) => (
                <TableRow key={index} className="border-b border-zinc-50 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <TableCell className="px-6 py-6">
                    <div className="flex items-center gap-5">
                      <ActivityIcon type={act.type} />
                      <div className="flex flex-col gap-1">
                        <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-50 truncate max-w-[180px] group-hover:text-zinc-900 transition-colors">{act.name || 'Anonymous'}</span>
                        <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-tight">{act.type}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-6">
                    <code className="text-[12px] font-bold text-zinc-400 dark:text-zinc-600 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-lg tabular-nums">
                      {act.id ? `#${act.id.toString().slice(-6)}` : '—'}
                    </code>
                  </TableCell>
                  <TableCell className="px-6 py-6 text-right">
                    <div className="flex flex-col items-end gap-1">
                       <span className="text-[14px] font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                         {act.time ? format(new Date(act.time), 'HH:mm') : '—'}
                       </span>
                       <span className="text-[12px] text-zinc-400 font-medium uppercase tracking-tight">
                         {act.time ? format(new Date(act.time), 'MMM d') : '—'}
                       </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="p-4 bg-zinc-50/30 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-center">
         <button className="text-[9px] font-black text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 uppercase tracking-[0.2em] transition-colors">
           Archive Log →
         </button>
      </div>
    </div>
  );
}
