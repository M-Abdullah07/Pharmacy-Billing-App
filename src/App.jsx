import React, { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import { SidebarProvider } from "@/components/ui/sidebar";
import CommandMenu from "@/components/Command";
import AppSidebar from "@/components/Sidebar";
import Header from "@/components/Header";

import ReturnHandling from "@/pages/core/ReturnHandling";
import Dashboard from "@/pages/core/Dashboard";
import AddBatch from "@/pages/core/AddBatch";
import AddSale from "@/pages/core/AddSale";

import Login from "@/pages/auth/Login";

import CustomerLedger from "@/pages/finance/CustomerLedger";
import SalesReport from "@/pages/finance/SalesReport";
import CreditDues from "@/pages/finance/CreditDues";
import SupplierPayment from "@/pages/finance/SupplierPayment";
import ExpenseTracker from "@/pages/finance/ExpenseTracker";

import ExpiryManagement from "@/pages/inventory/ExpiryManagement";
import StockAdjustment from "@/pages/inventory/StockAdjustment";
import Products from "@/pages/inventory/Products";

import Areas from "@/pages/stakeholders/Area";
import Customers from "@/pages/stakeholders/Customers";
import Companies from "@/pages/stakeholders/Companies";
import Salesmen from "@/pages/stakeholders/Salesmen"

import Preferences from "@/pages/settings/Preferences";
import Settings from "@/pages/settings/Settings";
import Backup from "@/pages/settings/Backup";

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [open, setOpen] = React.useState(false)

  useEffect(() => {
    const down = (e) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  useEffect(() => {
    const savedUser = localStorage.getItem("loggedInUser");
    if (savedUser) {
      setUser({ username: savedUser });
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("loggedInUser", userData.username);
  };

  const handleLogout = () => {
    setUser(null);
    document.documentElement.classList.toggle("dark");
    localStorage.removeItem("loggedInUser");
  };

  if (!user) return <Login onLogin={handleLogin} />

  return (
    <HashRouter>
      <div className="flex h-screen">
        <SidebarProvider>
          <AppSidebar username={user.username} onLogout={handleLogout} />
          <CommandMenu open={open} setOpen={setOpen} />
          <div className="flex flex-1 flex-col justify-center">
            <Header />
            <div className="flex flex-1 items-center justify-center overflow-auto p-2">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/add-sale" element={<AddSale />} />
                <Route path="/add-batch" element={<AddBatch />} />
                <Route path="/areas" element={<Areas />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/companies" element={<Companies />} />
                <Route path="/products" element={<Products />} />
                <Route path="/sales-reports" element={<SalesReport />} />
                <Route path="/credit-dues" element={<CreditDues />} />
                <Route path="/backup" element={<Backup />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/stock-adjustment" element={<StockAdjustment />} />
                <Route path="/expiry-management" element={<ExpiryManagement />} />
                <Route path="/salesmen" element={<Salesmen />} />
                <Route path="/customer-ledger" element={<CustomerLedger />} />
                <Route path="/expense-tracker" element={<ExpenseTracker />} />
                <Route path="/supplier-payments" element={<SupplierPayment />} />
                <Route path="/preferences" element={<Preferences />} />
                <Route path="/return-handling" element={<ReturnHandling />} />
              </Routes>
            </div>
          </div>
        </SidebarProvider>
      </div>
    </HashRouter>
  );
}
