import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Bell, Palette, Users } from "lucide-react";
import { PageContainer, PageSection, MessageAlert } from "@/components/PageLayout";

export default function Settings() {
  const [shopInfo, setShopInfo] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
  });
  const [currency, setCurrency] = useState("₹");
  const [taxRate, setTaxRate] = useState("0");
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const result = await window.electronAPI.queryDb(
        "SELECT * FROM settings WHERE key LIKE 'shop_%'"
      );

      const settings = {};
      result.forEach((row) => {
        const key = row.key.replace("shop_", "");
        settings[key] = row.value;
      });

      setShopInfo({
        name: settings.name || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
      });

      const currencyResult = await window.electronAPI.queryDb(
        "SELECT value FROM settings WHERE key = 'currency'"
      );
      if (currencyResult.length > 0) {
        setCurrency(currencyResult[0].value);
      }

      const taxResult = await window.electronAPI.queryDb(
        "SELECT value FROM settings WHERE key = 'tax_rate'"
      );
      if (taxResult.length > 0) {
        setTaxRate(taxResult[0].value);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const saveSetting = async (key, value) => {
    try {
      await window.electronAPI.runDb(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
        [key, value]
      );
    } catch (error) {
      console.error("Error saving setting:", error);
      throw error;
    }
  };

  const handleSaveShopInfo = async () => {
    try {
      setIsLoading(true);
      await saveSetting("shop_name", shopInfo.name);
      await saveSetting("shop_address", shopInfo.address);
      await saveSetting("shop_phone", shopInfo.phone);
      await saveSetting("shop_email", shopInfo.email);

      setMessage({ type: "success", text: "Shop information saved successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings: " + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveGeneralSettings = async () => {
    try {
      setIsLoading(true);
      await saveSetting("currency", currency);
      await saveSetting("tax_rate", taxRate);

      setMessage({ type: "success", text: "General settings saved successfully!" });
    } catch (error) {
      setMessage({ type: "error", text: "Failed to save settings: " + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    const isDark = document.documentElement.classList.contains("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    setMessage({ type: "success", text: `Theme changed to ${isDark ? "dark" : "light"} mode` });
  };

  return (
    <PageContainer
      title="Settings"
      description="Manage your application settings and preferences"
    >
      {message && (
        <MessageAlert
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* Shop Information */}
      <PageSection
        title="Shop Information"
        description="Update your pharmacy's basic information"
        actions={
          <Button onClick={handleSaveShopInfo} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="shop-name">Shop Name</Label>
            <Input
              id="shop-name"
              value={shopInfo.name}
              onChange={(e) =>
                setShopInfo({ ...shopInfo, name: e.target.value })
              }
              placeholder="Enter shop name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shop-phone">Phone Number</Label>
            <Input
              id="shop-phone"
              value={shopInfo.phone}
              onChange={(e) =>
                setShopInfo({ ...shopInfo, phone: e.target.value })
              }
              placeholder="Enter phone number"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="shop-address">Address</Label>
            <Input
              id="shop-address"
              value={shopInfo.address}
              onChange={(e) =>
                setShopInfo({ ...shopInfo, address: e.target.value })
              }
              placeholder="Enter shop address"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="shop-email">Email</Label>
            <Input
              id="shop-email"
              type="email"
              value={shopInfo.email}
              onChange={(e) =>
                setShopInfo({ ...shopInfo, email: e.target.value })
              }
              placeholder="Enter email address"
            />
          </div>
        </div>
      </PageSection>

      {/* General Settings */}
      <PageSection
        title="General Settings"
        description="Configure currency and tax settings"
        actions={
          <Button onClick={handleSaveGeneralSettings} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currency">Currency Symbol</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              placeholder="₹"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax-rate">Tax Rate (%)</Label>
            <Input
              id="tax-rate"
              type="number"
              min="0"
              step="0.01"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
      </PageSection>

      {/* Appearance */}
      <PageSection
        title="Appearance"
        description="Customize the look and feel of the application"
      >
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <p className="font-medium">Dark Mode</p>
            <p className="text-sm text-muted-foreground">
              Toggle between light and dark theme
            </p>
          </div>
          <Button onClick={toggleTheme} variant="outline">
            <Palette size={16} className="mr-2" />
            Toggle Theme
          </Button>
        </div>
      </PageSection>

      {/* User Management */}
      <PageSection
        title="User Management"
        description="Manage user accounts and permissions"
      >
        <div className="p-4 border rounded-lg bg-muted/50">
          <p className="text-sm text-muted-foreground mb-4">
            User management features coming soon. Currently, users can be added
            through the signup process.
          </p>
          <Button variant="outline" disabled>
            <Users size={16} className="mr-2" />
            Manage Users
          </Button>
        </div>
      </PageSection>
    </PageContainer>
  );
}
