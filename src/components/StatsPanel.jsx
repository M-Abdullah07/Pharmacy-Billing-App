import React, { useState, useEffect } from 'react';
import { DollarSign, ShoppingCart, Package, AlertTriangle, TrendingUp, Users, Calendar } from 'lucide-react';

export default function StatsPanel() {
  const [stats, setStats] = useState({
    totalSales: 0,
    todaySales: 0,
    totalProducts: 0,
    lowStock: 0,
    expiringSoon: 0,
    totalCustomers: 0,
    creditDues: 0,
    totalExpenses: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const api = window.electronAPI;

      // Get total sales
      const salesResult = await api.queryDb('SELECT SUM(total_amount) as total FROM sales');
      const totalSales = salesResult?.[0]?.total || 0;

      // Get today's sales
      const today = new Date().toISOString().split('T')[0];
      const todaySalesResult = await api.queryDb(
        'SELECT SUM(total_amount) as total FROM sales WHERE DATE(created_at) = ?',
        [today]
      );
      const todaySales = todaySalesResult?.[0]?.total || 0;

      // Get total products
      const productsResult = await api.queryDb('SELECT COUNT(*) as count FROM products');
      const totalProducts = productsResult?.[0]?.count || 0;

      // Get low stock items (quantity < 10)
      const lowStockResult = await api.queryDb(
        'SELECT COUNT(DISTINCT product_id) as count FROM batches WHERE quantity_available < 10 AND quantity_available > 0'
      );
      const lowStock = lowStockResult?.[0]?.count || 0;

      // Get expiring soon (within 30 days)
      const expiringResult = await api.queryDb(
        `SELECT COUNT(*) as count FROM batches 
         WHERE DATE(expiry_date) <= DATE('now', '+30 days') 
         AND DATE(expiry_date) >= DATE('now')`
      );
      const expiringSoon = expiringResult?.[0]?.count || 0;

      // Get total customers
      const customersResult = await api.queryDb('SELECT COUNT(*) as count FROM customers');
      const totalCustomers = customersResult?.[0]?.count || 0;

      // Get total credit dues
      const creditResult = await api.queryDb('SELECT SUM(credit_amount) as total FROM customers');
      const creditDues = creditResult?.[0]?.total || 0;

      // Get total expenses
      const expensesResult = await api.queryDb('SELECT SUM(amount) as total FROM expenses');
      const totalExpenses = expensesResult?.[0]?.total || 0;

      setStats({
        totalSales,
        todaySales,
        totalProducts,
        lowStock,
        expiringSoon,
        totalCustomers,
        creditDues,
        totalExpenses
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="dark:bg-white/20 p-6 rounded-xl shadow-lg backdrop-blur-md animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Sales',
      value: `Rs. ${stats.totalSales.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    {
      title: "Today's Sales",
      value: `Rs. ${stats.todaySales.toLocaleString()}`,
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Total Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStock,
      icon: AlertTriangle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Expiring Soon',
      value: stats.expiringSoon,
      icon: Calendar,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10'
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10'
    },
    {
      title: 'Credit Dues',
      value: `Rs. ${stats.creditDues.toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'Total Expenses',
      value: `Rs. ${stats.totalExpenses.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div
            key={index}
            className="dark:bg-white/20 bg-white p-6 rounded-xl shadow-lg backdrop-blur-md border border-gray-200 dark:border-white/10 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300">{stat.title}</h3>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}
