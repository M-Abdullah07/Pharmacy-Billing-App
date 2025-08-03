// src/components/App.jsx
import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Dashboard from "./Dashboard";
import AddSale from "./AddSale";
import Login from "./Login";
import Areas from "./AddArea";
import Customers from "./AddCustomers";
import Companies from "./Companies";
import Products from "./Products"; // Assuming you have a Products component
import "../styles/AppLayout.css";
import "../index.css";

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [user, setUser] = useState(null);

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
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      <Sidebar onNavigate={handleNavigate} />
      <div className="main-content">
        <Header username={user.username} onLogout={handleLogout} />
        <div className="page-content">{renderPage()}</div>
      </div>
    </div>
  );
}
