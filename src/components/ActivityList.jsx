import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "./ui/badge";

export default function ActivityList() {
  const [recentSales, setRecentSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecentSales();
  }, []);

  const loadRecentSales = async () => {
    try {
      setIsLoading(true);
      const result = await window.electronAPI.queryDb(`
        SELECT s.id, s.total_amount, s.is_credit, s.created_at, c.name as customer_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        ORDER BY s.created_at DESC
        LIMIT 10
      `);
      setRecentSales(result || []);
    } catch (error) {
      console.error('Error loading recent sales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="flex-1 p-4">
      <h3 className="text-xl font-bold p-6">Recent Sales</h3>
      <Table>
        <TableCaption>Last 10 sales transactions</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="px-6 py-3 rounded-tl-xl">Sale ID</TableHead>
            <TableHead className="px-9 py-3">Customer</TableHead>
            <TableHead className="px-9 py-3">Amount</TableHead>
            <TableHead className="px-9 py-3">Date</TableHead>
            <TableHead className="px-6 py-3 rounded-tr-xl">Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan="5" className="text-center py-8">
                Loading recent sales...
              </TableCell>
            </TableRow>
          ) : recentSales.length === 0 ? (
            <TableRow>
              <TableCell colSpan="5" className="text-center py-8">
                No sales yet. Start by adding your first sale!
              </TableCell>
            </TableRow>
          ) : (
            recentSales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="px-6 py-4 font-medium">#{sale.id}</TableCell>
                <TableCell className="px-6 py-4">{sale.customer_name || 'Walk-in Customer'}</TableCell>
                <TableCell className="px-6 py-4 font-semibold">Rs. {parseFloat(sale.total_amount).toFixed(2)}</TableCell>
                <TableCell className="px-6 py-4">
                  {formatDate(sale.created_at)} at {formatTime(sale.created_at)}
                </TableCell>
                <TableCell className="px-6 py-4">
                  <Badge variant={sale.is_credit ? "default" : "secondary"}>
                    {sale.is_credit ? 'Credit' : 'Cash'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
