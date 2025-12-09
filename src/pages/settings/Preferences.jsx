import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PageContainer, PageSection, MessageAlert } from '@/components/PageLayout';
import { Settings as SettingsIcon, Bell, Moon, Sun } from 'lucide-react';

export default function Preferences() {
  const [preferences, setPreferences] = useState({
    notifications: true,
    darkMode: false,
    autoBackup: false,
    lowStockAlert: 10,
    expiryAlertDays: 30,
    defaultTax: 0,
    receiptFooter: ''
  });
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      // Load preferences from settings table
      const darkModeResult = await window.electronAPI.queryDb(
        'SELECT value FROM settings WHERE key = ?',
        ['dark_mode']
      );

      const notificationsResult = await window.electronAPI.queryDb(
        'SELECT value FROM settings WHERE key = ?',
        ['notifications']
      );

      const lowStockResult = await window.electronAPI.queryDb(
        'SELECT value FROM settings WHERE key = ?',
        ['low_stock_alert']
      );

      const expiryAlertResult = await window.electronAPI.queryDb(
        'SELECT value FROM settings WHERE key = ?',
        ['expiry_alert_days']
      );

      setPreferences(prev => ({
        ...prev,
        darkMode: darkModeResult?.[0]?.value === 'true',
        notifications: notificationsResult?.[0]?.value !== 'false',
        lowStockAlert: parseInt(lowStockResult?.[0]?.value || '10'),
        expiryAlertDays: parseInt(expiryAlertResult?.[0]?.value || '30')
      }));
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleChange = (name, value) => {
    setPreferences(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Save each preference to settings table
      await window.electronAPI.runDb(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['dark_mode', preferences.darkMode.toString()]
      );

      await window.electronAPI.runDb(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['notifications', preferences.notifications.toString()]
      );

      await window.electronAPI.runDb(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['low_stock_alert', preferences.lowStockAlert.toString()]
      );

      await window.electronAPI.runDb(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        ['expiry_alert_days', preferences.expiryAlertDays.toString()]
      );

      // Apply dark mode
      if (preferences.darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      setMessage({ type: 'success', text: 'Preferences saved successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save preferences: ' + error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer
      title="Preferences"
      description="Customize your application settings and preferences"
    >
      {message && (
        <MessageAlert
          type={message.type}
          message={message.text}
          onDismiss={() => setMessage(null)}
        />
      )}

      {/* General Preferences */}
      <PageSection
        title="General Settings"
        description="Configure general application behavior"
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Enable desktop notifications for important events
              </p>
            </div>
            <Switch
              checked={preferences.notifications}
              onCheckedChange={(checked) => handleChange('notifications', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Use dark theme for the application
              </p>
            </div>
            <Switch
              checked={preferences.darkMode}
              onCheckedChange={(checked) => handleChange('darkMode', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Auto Backup</Label>
              <p className="text-sm text-muted-foreground">
                Automatically backup database daily
              </p>
            </div>
            <Switch
              checked={preferences.autoBackup}
              onCheckedChange={(checked) => handleChange('autoBackup', checked)}
            />
          </div>
        </div>
      </PageSection>

      {/* Inventory Alerts */}
      <PageSection
        title="Inventory Alerts"
        description="Configure stock and expiry alerts"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="lowStockAlert">Low Stock Alert Threshold</Label>
            <Input
              id="lowStockAlert"
              type="number"
              min="0"
              value={preferences.lowStockAlert}
              onChange={(e) => handleChange('lowStockAlert', parseInt(e.target.value))}
              placeholder="10"
            />
            <p className="text-sm text-muted-foreground">
              Alert when stock falls below this quantity
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryAlertDays">Expiry Alert (Days)</Label>
            <Input
              id="expiryAlertDays"
              type="number"
              min="0"
              value={preferences.expiryAlertDays}
              onChange={(e) => handleChange('expiryAlertDays', parseInt(e.target.value))}
              placeholder="30"
            />
            <p className="text-sm text-muted-foreground">
              Alert when products expire within this many days
            </p>
          </div>
        </div>
      </PageSection>

      {/* Receipt Settings */}
      <PageSection
        title="Receipt Settings"
        description="Customize receipt appearance"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultTax">Default Tax Rate (%)</Label>
            <Input
              id="defaultTax"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={preferences.defaultTax}
              onChange={(e) => handleChange('defaultTax', parseFloat(e.target.value))}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiptFooter">Receipt Footer Text</Label>
            <Input
              id="receiptFooter"
              value={preferences.receiptFooter}
              onChange={(e) => handleChange('receiptFooter', e.target.value)}
              placeholder="Thank you for your business!"
            />
          </div>
        </div>
      </PageSection>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading} size="lg">
          <SettingsIcon className="mr-2 h-4 w-4" />
          {isLoading ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </PageContainer>
  );
}
