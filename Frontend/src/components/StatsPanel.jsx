import React, { useState, useEffect } from "react";

const formatPKR = (amount) => {
  const num = Number(amount) || 0;
  return "Rs " + num.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const StatCard = ({ title, value, sub, subColor = "text-zinc-400" }) => (
  <div className="dark:bg-white/20 bg-white/60 p-4 rounded-xl shadow-lg backdrop-blur-md border border-white/10">
    <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-300">{title}</h3>
    <p className="text-2xl font-bold py-1">{value}</p>
    <span className={`text-sm py-1 ${subColor}`}>{sub}</span>
  </div>
);

export default function StatsPanel() {
  const [stats, setStats] = useState(null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!window.electronAPI?.queryDb) {
          setError("electronAPI not available");
          return;
        }

        const [saleData, profitData, outOfStockData, expiredData] = await Promise.all([
          window.electronAPI.queryDb(
            `SELECT COALESCE(SUM(net_receivable), 0) AS total_sale
             FROM sale_invoices WHERE status = 'confirmed'`
          ),
          window.electronAPI.queryDb(
            `SELECT COALESCE(SUM((si.sale_rate - b.purchase_cost_per_unit) * si.quantity), 0) AS total_profit
             FROM sale_invoice_items si
             JOIN batches b ON si.batch_id = b.batch_id
             JOIN sale_invoices inv ON si.sale_invoice_id = inv.sale_invoice_id
             WHERE inv.status = 'confirmed'`
          ),
          window.electronAPI.queryDb(
            `SELECT COUNT(*) AS out_of_stock
             FROM products p
             WHERE p.is_active = TRUE
               AND (SELECT COALESCE(SUM(quantity_available), 0)
                    FROM batches b
                    WHERE b.product_id = p.product_id AND b.is_active = TRUE) = 0`
          ),
          window.electronAPI.queryDb(
            `SELECT COUNT(*) AS expired
             FROM batches
             WHERE expiry_date < CURRENT_DATE
               AND quantity_available > 0 AND is_active = TRUE`
          ),
        ]);

        const fetchedStats = {
          totalSale: parseFloat(saleData?.[0]?.total_sale ?? 0),
          totalProfit: parseFloat(profitData?.[0]?.total_profit ?? 0),
          outOfStock: parseInt(outOfStockData?.[0]?.out_of_stock ?? 0, 10),
          expired: parseInt(expiredData?.[0]?.expired ?? 0, 10),
        };
        console.log("Dashboard Stats Fetched:", fetchedStats);
        setStats(fetchedStats);
      } catch (err) {
        console.error("StatsPanel fetch error:", err);
        setError(err.message);
      }
    };

    fetchStats();
  }, []);

  if (error) {
    return (
      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-4 p-4 rounded-xl bg-red-500/10 text-red-400 text-sm">
          Dashboard error: {error}
        </div>
      </div>
    );
  }

  const loading = stats === null;

  return (
    <div className="grid grid-cols-4 gap-2">
      <StatCard
        title="Total Profit"
        value={loading ? "—" : formatPKR(stats.totalProfit)}
        sub="All confirmed sales"
        subColor="text-green-400"
      />
      <StatCard
        title="Total Sales"
        value={loading ? "—" : formatPKR(stats.totalSale)}
        sub="All confirmed sales"
        subColor="text-green-400"
      />
      <StatCard
        title="Out of Stock"
        value={loading ? "—" : stats.outOfStock}
        sub="Active products"
        subColor="text-fuchsia-400"
      />
      <StatCard
        title="Expired Batches"
        value={loading ? "—" : stats.expired}
        sub="With remaining stock"
        subColor="text-red-400"
      />
    </div>
  );
}

