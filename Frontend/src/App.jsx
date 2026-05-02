import React, { useState, useEffect } from "react";
import AppSidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import Dashboard from "@/pages/Dashboard";
import AddSale from "@/pages/AddSale";
import Login from "@/pages/Login";
import Areas from "@/pages/AddArea";
import Customers from "@/pages/AddCustomers";
import Companies from "@/pages/Companies";
import Products from "@/pages/Products";
import Signup from "@/pages/Signup";
import CommandMenu from "@/components/Command";
import { SidebarProvider } from "@/components/ui/sidebar";
import AddBatch from "@/pages/AddBatch";
import SalesReport from "@/pages/SalesReport";
import CreditDues from "@/pages/CreditDues";
import Backup from "@/pages/Backup";
import Settings from "@/pages/Settings";
import Manufacturers from "@/pages/Manufacturer";
import PurchaseInvoice from "@/pages/Purchaseinvoice";
import PurchaseReturns from "@/pages/PurchaseReturns";
import SupplierLedger from "@/pages/SupplierLedger";

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [signup, setSignup] = useState(false);
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
    const savedUser = localStorage.getItem("pharmax_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleNavigate = (page) => {
    setActivePage(page);
  };

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleSignup = () => {

  }


  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("pharmax_user");
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
      case "Batches":
        return <AddBatch />
      case "Sales Reports":
        return <SalesReport />
      case "Credit Dues":
        return <CreditDues />
      case "Backup & Export":
        return <Backup />
      case "Settings":
        return <Settings />
      case "Manufacturers":
        return <Manufacturers />;
      case "Purchase Invoice":
        return <PurchaseInvoice />;
      case "Purchase Returns":
        return <PurchaseReturns />;
      case "Supplier Ledger":
        return <SupplierLedger />;
      default:
        return <Dashboard />;
    }
  };

  if (!user) {
    return signup ? (
      <Signup onSignup={handleSignup} setSignup={setSignup} />
    ) : (
      <Login onLogin={handleLogin} setSignup={setSignup} />
    )
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
