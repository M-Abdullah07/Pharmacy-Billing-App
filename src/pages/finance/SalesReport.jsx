import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Calendar, DollarSign, TrendingUp, ShoppingCart } from "lucide-react";
import { PageContainer, PageSection, MessageAlert, LoadingState, EmptyState } from "@/components/PageLayout";

export default function SalesReport() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState({});
  const [dailySales, setDailySales] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadSalesData();
  }, []);

  const loadSalesData = async () => {
    try {
      setIsLoading(true);
      const filters = {
        start_date: startDate,
        end_date: endDate,
      };

      const salesResult = await window.electron.ipcRenderer.invoke(
        "get-sales",
        filters
      );
      setSales(salesResult || []);

      const summaryResult = await window.electron.ipcRenderer.invoke(
        "get-sales-summary",
        filters
      );
      setSummary(summaryResult || {});

      const dailyResult = await window.electron.ipcRenderer.invoke(
        "get-daily-sales",
        filters
      );
      setDailySales(dailyResult || []);
    } catch (error) {
      console.error("Error loading sales data:", error);
      setMessage({ type: "error", text: "Failed to load sales data" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilter = () => {
    loadSalesData();
  };

  const handleExport = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke("export-to-csv", {
        table: "sales",
        filename: `sales-report-${startDate}-to-${endDate}.csv`,
      });

      if (result.success) {
        setMessage({
          type: "success",
          text: `Report exported successfully to ${result.path}`,
        });
      } else {
        setMessage({
          type: "error",
          text: "Failed to export: " + (result.error || "Unknown error"),
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error: " + error.message });
    }
  };

  return (
    <PageContainer
      title="Sales Report"
      description="Analyze your sales performance and trends"
      actions={
        <Button onClick={handleExport} variant="outline">
          <Download size={16} className="mr-2" />
          Export to CSV
        </Button>
      }
    >
      {message && (
        <MessageAlert
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* Date Filters */}
      <PageSection
        title="Filter by Date Range"
        description="Select a date range to view sales data"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">End Date</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleFilter} className="w-full">
              <Calendar size={16} className="mr-2" />
              Apply Filter
            </Button>
          </div>
        </div>
      </PageSection>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PageSection noPadding>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              ₹{(summary.total_sales || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.total_transactions || 0} transactions
            </p>
          </div>
        </PageSection>

        <PageSection noPadding>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Cash Sales</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              ₹{(summary.cash_sales || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.total_sales > 0
                ? ((summary.cash_sales / summary.total_sales) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </div>
        </PageSection>

        <PageSection noPadding>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Credit Sales</p>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-orange-600">
              ₹{(summary.credit_sales || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.total_sales > 0
                ? ((summary.credit_sales / summary.total_sales) * 100).toFixed(1)
                : 0}
              % of total
            </p>
          </div>
        </PageSection>

        <PageSection noPadding>
          <div className="p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">Avg. Sale</p>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">
              ₹
              {summary.total_transactions > 0
                ? (summary.total_sales / summary.total_transactions).toFixed(2)
                : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </div>
        </PageSection>
      </div>

      {/* Sales Chart */}
      <PageSection
        title="Daily Sales Trend"
        description="Sales performance over the selected period"
      >
        {dailySales.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis />
              <Tooltip
                formatter={(value) => `₹${value.toFixed(2)}`}
                labelFormatter={(label) =>
                  new Date(label).toLocaleDateString()
                }
              />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" name="Sales Amount" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={TrendingUp}
            title="No sales data available"
            description="No sales were recorded for the selected period"
          />
        )}
      </PageSection>

      {/* Sales Table */}
      <PageSection
        title="Recent Transactions"
        description="Detailed list of all sales"
        noPadding
      >
        {isLoading ? (
          <LoadingState message="Loading sales data..." />
        ) : sales.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="No sales found"
            description="No sales were recorded for the selected period"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {new Date(sale.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {sale.customer_name || "Walk-in"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${sale.is_credit
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100"
                            : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"
                          }`}
                      >
                        {sale.is_credit ? "Credit" : "Cash"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{sale.total_amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageSection>
    </PageContainer>
  );
}
