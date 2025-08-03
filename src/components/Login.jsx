import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import "../index.css"

const Login = ({ onLogin, setSignup }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await window.electronAPI.queryDb(
        `SELECT * FROM users WHERE username = ? AND password = ?`,
        [email, password]
      );

      if (result && result.length > 0) {
        onLogin(result[0]);
      } else {
        setError("Invalid credentials. Please check your email and password.");
      }
    } catch (err) {
      setError("Login error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {

    header: {
      textAlign: 'center',
      marginBottom: '32px'
    },
    iconContainer: {
      width: '64px',
      height: '64px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px auto'
    },
    title: {
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#111827',
      margin: '0'
    },
    subtitle: {
      color: '#6b7280',
      marginTop: '8px',
      fontSize: '14px'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '8px'
    },
    inputContainer: {
      position: 'relative'
    },
    inputIcon: {
      position: 'absolute',
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      color: '#9ca3af'
    },
    toggleButton: {
      position: 'absolute',
      right: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#9ca3af',
      transition: 'color 0.2s ease',
      padding: '4px'
    },
    errorContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      color: '#dc2626',
      backgroundColor: '#fef2f2',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #fecaca',
      fontSize: '14px'
    },
    submitButton: {
      width: '100%',
      background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontWeight: '500',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s ease',
      outline: 'none'
    },
    submitButtonHover: {
      background: 'linear-gradient(135deg, #2563eb 0%, #4338ca 100%)',
      transform: 'scale(1.02)'
    },
    submitButtonActive: {
      transform: 'scale(0.98)'
    },
    submitButtonDisabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
      transform: 'none'
    },
    loadingContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    spinner: {
      width: '20px',
      height: '20px',
      border: '2px solid white',
      borderTop: '2px solid transparent',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    footer: {
      marginTop: '24px',
      textAlign: 'center'
    },
    footerText: {
      fontSize: '14px',
      color: '#6b7280'
    },
    footerLink: {
      color: '#3b82f6',
      fontWeight: '500',
      textDecoration: 'none',
      cursor: 'pointer',
      transition: 'color 0.2s ease'
    },
    additionalInfo: {
      textAlign: 'center',
      marginTop: '24px'
    },
    securityText: {
      fontSize: '14px',
      color: '#9ca3af'
    }
  };

  // Add keyframes for spinner animation
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="flex fixed w-screen h-screen items-center justify-center p-[16px] bg-gradient-to-br from-[#eff6ff] to-[#e0e7ff]">
      <div className="w-full max-w-[400px]">
        {/* Login Card */}
        <div class="bg-white rounded-[16px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 border border-[#f3f4f6]">
          {/* Header */}
          <div class="text-center mb-8">
            <div class="w-16 h-16 bg-gradient-to-br from-[#3b82f6] to-[#4f46e5] rounded-full flex items-center justify-center mb-4 mx-auto">
              <Lock size={32} color="white" />
            </div>
            <h1 className="text-2xl font-bold text-[#111827]">Welcome Back</h1>
            <p className="text-[#6b7280] text-sm mt-[8px]">Sign in to your account</p>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-[24px]">
            {/* Email Field */}
            <div className="flex flex-col">
              <label className="block text-[14px] font-medium text-[#374151] mb-2">Email Address</label>
              <div className="relative">
                <Mail size={20} style={styles.inputIcon} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md text-sm bg-white focus:border-blue-500 transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputContainer}>
                <Lock size={20} style={styles.inputIcon} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md text-sm bg-white focus:border-blue-500 transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.toggleButton}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-4 text-red-600 bg-red-50 p-3 rounded-md border border-red-200 text-sm">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="btn"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>

          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <button onClick={() => setSignup(true)} className="text-blue-500 font-medium hover:text-blue-600 hover:underline transition-colors" >
                Sign up
              </button>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-6">
          <p className="text-gray-400">
            Secure login protected by encryption
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
