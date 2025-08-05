import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React, { useState } from 'react';

export default function AddArea() {
  const [areaName, setAreaName] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!areaName.trim()) {
      setMessage('❌ Area name is required');
      setMessageType('error');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await window.electronAPI.addArea(areaName.trim());

      if (result.success) {
        setMessage(`✅ Area "${areaName}" added successfully with ID ${result.id}`);
        setMessageType('success');
        setAreaName('');
      } else {
        setMessage(`❌ Error: ${result.error}`);
        setMessageType('error');
      }
    } catch (error) {
      setMessage('❌ Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-col">

      {/* Professional Form Container */}
      <div className="">
        <Label className="text-xl mb-4">Area Information</Label>

        <form onSubmit={handleSubmit} className="flex flex-row gap-4">
          <Input
            type="text"
            className="w-[500px]"
            value={areaName}
            onChange={(e) => setAreaName(e.target.value)}
            placeholder="Enter area name (e.g., Lahore, Karachi, Islamabad)"
            disabled={loading}
            required
          />
          <Button
            className={loading ? 'loading' : ''}
            disabled={loading || !areaName.trim()}
          >
            {loading ? 'Adding Area...' : 'Add Area'}
          </Button>
        </form>

        {/* Professional Helper Text */}
        <p className="leading-7 [&:not(:first-child)]:mt-6 w-[600px] text-muted-foreground">
          Areas help organize your business operations. Choose descriptive names that clearly identify the purpose or function.
        </p>
      </div>

      {/* Professional Message Display */}
      {message && (
        <div className="mt-4">
          {message}
        </div>
      )}
    </div>
  );
}
