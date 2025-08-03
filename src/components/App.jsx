import React, { useState, useEffect } from "react";
import AppSidebar from "./Sidebar";
import Header from "./Header";
import Dashboard from "../pages/Dashboard";
import AddSale from "../pages/AddSale";
import Login from "../pages/Login";
import Areas from "../pages/AddArea";
import Customers from "../pages/AddCustomers";
import Companies from "../pages/Companies";
import Products from "../pages/Products";
import Signup from "../pages/Signup";
import { SidebarProvider } from "./ui/sidebar";
import "../index.css"

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [user, setUser] = useState(null);
  const [signup, setSignup] = useState(false);

  // 🔄 Load logged-in user from localStorage on first render
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

  const handleSignup = () => {

  }

  const handleLogout = () => {
    setUser(null);
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
        <div className="flex flex-1 flex-col">
          <Header username={user.username} onLogout={handleLogout} />
          <div className="flex-1 overflow-auto p-2">{renderPage()}</div>
        </div>
      </SidebarProvider>
    </div>
  );
}
