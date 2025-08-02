import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

const Login = ({ onLogin }) => {
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
    container: {
      height: '100vh',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0,
      background: 'linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      boxSizing: 'border-box'
    },
    wrapper: {
      width: '100%',
      maxWidth: '400px'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '32px',
      border: '1px solid #f3f4f6'
    },
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
    input: {
      width: '100%',
      paddingLeft: '40px',
      paddingRight: '16px',
      paddingTop: '12px',
      paddingBottom: '12px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: '#f9fafb',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
      outline: 'none'
    },
    inputFocus: {
      borderColor: '#3b82f6',
      backgroundColor: 'white',
      boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)'
    },
    passwordInput: {
      paddingRight: '48px'
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
    <div style={styles.container}>
      <div style={styles.wrapper}>
        {/* Login Card */}
        <div style={styles.card}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.iconContainer}>
              <Lock size={32} color="white" />
            </div>
            <h1 style={styles.title}>Welcome Back</h1>
            <p style={styles.subtitle}>Sign in to your account</p>
          </div>

          {/* Form */}
          <div style={styles.form}>
            {/* Email Field */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputContainer}>
                <Mail size={20} style={styles.inputIcon} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    ...styles.input,
                    ...(email && styles.inputFocus)
                  }}
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
                  style={{
                    ...styles.input,
                    ...styles.passwordInput,
                    ...(password && styles.inputFocus)
                  }}
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
              <div style={styles.errorContainer}>
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              style={{
                ...styles.submitButton,
                ...(isLoading && styles.submitButtonDisabled)
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  Object.assign(e.target.style, styles.submitButtonHover);
                }
              }}
              onMouseLeave={(e) => {
                Object.assign(e.target.style, styles.submitButton);
              }}
              onMouseDown={(e) => {
                if (!isLoading) {
                  Object.assign(e.target.style, {
                    ...styles.submitButtonHover,
                    ...styles.submitButtonActive
                  });
                }
              }}
              onMouseUp={(e) => {
                if (!isLoading) {
                  Object.assign(e.target.style, styles.submitButtonHover);
                }
              }}
            >
              {isLoading ? (
                <div style={styles.loadingContainer}>
                  <div style={styles.spinner}></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </div>

          {/* Footer */}
          <div style={styles.footer}>
            <p style={styles.footerText}>
              Don't have an account?{" "}
              <a
                style={styles.footerLink}
                onMouseEnter={(e) => {
                  e.target.style.color = '#2563eb';
                  e.target.style.textDecoration = 'underline';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#3b82f6';
                  e.target.style.textDecoration = 'none';
                }}
              >
                Sign up
              </a>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div style={styles.additionalInfo}>
          <p style={styles.securityText}>
            Secure login protected by encryption
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;