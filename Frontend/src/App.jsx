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
import { cn } from "@/lib/utils";
import AddBatch from "@/pages/AddBatch";
import SalesReport from "@/pages/SalesReport";
import CreditDues from "@/pages/CreditDues";
import Backup from "@/pages/Backup";
import Settings from "@/pages/Settings";
import Manufacturers from "@/pages/Manufacturer";
import PurchaseInvoice from "@/pages/PurchaseInvoice";


export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [signup, setSignup] = useState(false);
  const [open, setOpen] = React.useState(false);

  // Cmd/Ctrl + K (industry standard for command palettes)
  useEffect(() => {
    const down = (e) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

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
    localStorage.setItem("pharmax_user", JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("pharmax_user");
    setActivePage("Dashboard");
  };

  const renderPage = () => {
    switch (activePage) {
      case "Add Sale":
        return <AddSale onNavigate={handleNavigate} />;
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
        return <AddBatch />;
      case "Sales Reports":
        return <SalesReport />;
      case "Credit Dues":
        return <CreditDues />;
      case "Backup & Export":
        return <Backup />;
      case "Settings":
        return <Settings />;
      case "Manufacturers":
        return <Manufacturers />;
      case "Purchase Invoice":
        return <PurchaseInvoice />;
      default:
        return <Dashboard />;
    }
  };

  if (!user) {
    return signup ? (
      <Signup onSignup={handleSignup} setSignup={setSignup} />
    ) : (
      <Login onLogin={handleLogin} setSignup={setSignup} />
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <SidebarProvider>
        <AppSidebar
          onNavigate={handleNavigate}
          username={user?.username}
          onLogout={handleLogout}
          activePage={activePage}           // Used for active nav highlighting
        />

        <div className="flex flex-1 flex-col min-w-0 overflow-hidden border-l border-border">
          <CommandMenu open={open} setOpen={setOpen} onNavigate={handleNavigate} />
          
          <Header currentPage={activePage} />

          {/* Modern Main Content Area */}
          <main className={cn(
            "flex-1 overflow-auto bg-background p-6 lg:p-8",
            "scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          )}>
            <div className="mx-auto max-w-[1480px] space-y-8">
              {renderPage()}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}