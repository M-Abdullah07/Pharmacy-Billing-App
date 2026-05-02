import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from './ui/badge';
import { format } from 'date-fns';

// Map status → badge variant
const statusVariant = (s) => {
  switch (s?.toLowerCase()) {
    case 'confirmed':
      return 'confirmed';
    case 'cancelled':
      return 'cancelled';
    case 'draft':
      return 'draft';
    default:
      return 'outline';
  }
};

// Map activity type → badge-like label colour via inline style
const typeColor = (type) => {
  switch (type) {
    case 'Sale':
      return 'text-blue-500 font-semibold';
    case 'Purchase':
      return 'text-purple-500 font-semibold';
    case 'Sale Return':
      return 'text-orange-500 font-semibold';
    case 'Purchase Return':
      return 'text-rose-500 font-semibold';
    case 'Payment Received':
      return 'text-emerald-500 font-semibold';
    case 'Payment Paid':
      return 'text-indigo-500 font-semibold';
    case 'Expense':
      return 'text-red-500 font-semibold';
    default:
      return 'font-medium';
  }
};

export default function ActivityList() {
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        if (!window.electronAPI?.getActivityList) {
          setError('electronAPI not available');
          setLoading(false);
          return;
        }

        const data = await window.electronAPI.getActivityList();
        setActivities(data);
      } catch (err) {
        console.error('ActivityList fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, []);

  const renderBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-6 text-zinc-400">
            Loading…
          </TableCell>
        </TableRow>
      );
    }
    if (error) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-4 text-red-400 text-sm">
            Error: {error}
          </TableCell>
        </TableRow>
      );
    }
    if (activities.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={5} className="text-center py-6 text-zinc-400">
            No recent activity
          </TableCell>
        </TableRow>
      );
    }
    return activities.map((act, index) => (
      <TableRow key={index}>
        <TableCell className={`px-6 py-4 ${typeColor(act.type)}`}>{act.type}</TableCell>
        <TableCell className="px-6 py-4">{act.name}</TableCell>
        <TableCell className="px-6 py-4 font-mono text-xs">{act.id}</TableCell>
        <TableCell className="px-6 py-4 text-sm">
          {act.time ? format(new Date(act.time), 'MMM d, yyyy h:mm a') : '—'}
        </TableCell>
        <TableCell className="px-6 py-4">
          <Badge variant={statusVariant(act.status)}>
            {act.status ? act.status.charAt(0).toUpperCase() + act.status.slice(1) : '—'}
          </Badge>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="flex-1 p-4 bg-white dark:bg-zinc-900 rounded-xl shadow-sm">
      <h3 className="text-xl font-bold p-6">Recent Activity</h3>
      <Table>
        <TableCaption>Latest 10 transactions across all modules</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="px-6 py-3">Type</TableHead>
            <TableHead className="px-6 py-3">Party</TableHead>
            <TableHead className="px-9 py-3">Reference</TableHead>
            <TableHead className="px-9 py-3">Date / Time</TableHead>
            <TableHead className="px-6 py-3">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{renderBody()}</TableBody>
      </Table>
    </div>
  );
}
