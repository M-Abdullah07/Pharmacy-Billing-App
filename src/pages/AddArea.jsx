import React, { useState } from 'react';
import '../styles/AddArea.css';

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

  const handleReset = () => {
    setAreaName('');
    setMessage('');
    setMessageType('');
  };

  return (
    <div className="add-area-page">
      <div className="add-area-container">
        {/* Professional Header */}
        <div className="page-header">
          <h2>Add New Area</h2>
          <p className="page-subtitle">Create and organize new business areas for better management</p>
        </div>

        {/* Professional Form Container */}
        <div className="form-container">
          <h3 className="form-title">Area Information</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="areaName">Area Name</label>
              <input
                id="areaName"
                type="text"
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                placeholder="Enter area name (e.g., Lahore, Karachi, Islamabad)"
                disabled={loading}
                required
              />
            </div>

            <button 
              type="submit" 
              className={loading ? 'loading' : ''}
              disabled={loading || !areaName.trim()}
            >
              {loading ? 'Adding Area...' : 'Add Area'}
            </button>

            {areaName && (
              <div className="action-group">
                <button 
                  type="button" 
                  className="secondary-btn"
                  onClick={handleReset}
                  disabled={loading}
                >
                  Clear Form
                </button>
              </div>
            )}
          </form>

          {/* Professional Helper Text */}
          <p className="helper-text">
            Areas help organize your business operations. Choose descriptive names that clearly identify the purpose or function.
          </p>
        </div>

        {/* Professional Message Display */}
        {message && (
          <div className={`message ${messageType}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}