import React, { useState, useEffect } from "react";

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

  const handleNavigate = (page) => {
    setActivePage(page);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("loggedInUser", userData.username);
  };

  const handleLogout = () => {
    setUser(null);
    document.documentElement.classList.toggle("dark");
    localStorage.removeItem("loggedInUser");
  };

  const renderPage = () => {
    switch (activePage) {
      case "Add Sale":
        return <AddSale />;
      case "Dashboard":
        return <Dashboard />;
      case "Areas":
        return <Areas />;
      case "Customers":
        return <Customers />;
      case "Companies":
        return <Companies />;
      case "Products":
        return <Products />;
      case "Add Batch":
        return <AddBatch />
      case "Sales Reports":
        return <SalesReport />
      case "Credit Dues":
        return <CreditDues />
      case "Backup":
        return <Backup />
      case "Settings":
        return <Settings />
      case "Stock Adjustment":
        return <StockAdjustment />
      case "Expiry Management":
        return <ExpiryManagement />
      case "Salesmen":
        return <Salesmen />
      case "Customer Ledger":
        return <CustomerLedger />
      case "Expense Tracker":
        return <ExpenseTracker />
      case "Supplier Payments":
        return <SupplierPayment />
      case "Preferences":
        return <Preferences />
      case "Return Handling":
        return <ReturnHandling />
      default:
        return <Dashboard />;
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="flex h-screen">
      <SidebarProvider>
        <AppSidebar onNavigate={handleNavigate} username={user.username} onLogout={handleLogout} />
        <CommandMenu open={open} setOpen={setOpen} onNavigate={handleNavigate} />
        <div className="flex flex-1 flex-col justify-center">
          <Header currentPage={activePage} />
          <div className="flex flex-1 items-center justify-center overflow-auto p-2">{renderPage()}</div>
        </div>
      </SidebarProvider>
    </div>
  );
}
