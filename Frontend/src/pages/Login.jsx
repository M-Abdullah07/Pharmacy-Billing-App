import React, { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle, RectangleEllipsis, User } from "lucide-react";
import "../index.css";

const Login = ({ onLogin, setSignup }) => {
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState("");
  const [fieldErrors, setFieldErrors]   = useState({});

  // ── Inline validation (UC-101 E1) ─────────────────────────────────────────
  const validate = () => {
    const errors = {};
    if (!username.trim()) errors.username = "This field is required.";
    if (!password.trim()) errors.password = "This field is required.";
    return errors;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      // All auth logic (Argon2id verify, is_active check) handled in main.js
      const result = await window.electronAPI.loginUser(username.trim(), password);

      if (result.success) {
        // Store session in localStorage for duration of app session
        localStorage.setItem("pharmax_user", JSON.stringify({
          userId: result.userId,
          username: username.trim(),
        }));
        onLogin({ userId: result.userId, username: username.trim() });
      } else {
        // UC-101 Alt Flow A — clear fields, show error without revealing which field
        setUsername("");
        setPassword("");
        setError(result.error || "Invalid username or password.");
      }
    } catch (err) {
      // UC-101 E2 — DB unavailable
      setError("Service unavailable. Contact administrator.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex fixed w-screen h-screen items-center justify-center p-[16px] bg-gradient-to-br from-[#eff6ff] to-[#e0e7ff]">
      <div className="w-full max-w-[400px]">

        {/* Card */}
        <div className="bg-white rounded-[16px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 border border-[#f3f4f6]">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-[#3b82f6] to-[#4f46e5] rounded-full flex items-center justify-center mb-4 mx-auto">
              <Lock size={32} color="white" />
            </div>
            <h1 className="text-2xl font-bold text-[#111827]">Welcome Back</h1>
            <p className="text-[#6b7280] text-sm mt-[8px]">Sign in to your PharmaX account</p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-[20px]"
          >

            {/* Username Field */}
            <div className="flex flex-col">
              <label className="block text-[14px] font-medium text-[#374151] mb-2">
                Username
              </label>
              <div className="relative">
                <User
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors(p => ({ ...p, username: "" }));
                  }}
                  className={`w-full pl-10 pr-4 py-3 border rounded-md text-sm bg-white transition-all
                    ${fieldErrors.username ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                  placeholder="Enter your username"
                />
              </div>
              {fieldErrors.username && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.username}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="flex flex-col">
              <label className="block text-[14px] font-medium text-[#374151] mb-2">
                Password
              </label>
              <div className="relative">
                <RectangleEllipsis
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: "" }));
                  }}
                  className={`w-full pl-10 pr-10 py-3 border rounded-md text-sm bg-white transition-all
                    ${fieldErrors.password ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400 p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-red-500 text-xs mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {/* Global Error (UC-101 Alt Flow A & B) */}
            {error && (
              <div className="flex items-center gap-3 text-red-600 bg-red-50 p-3 rounded-md border border-red-200 text-sm">
                <AlertCircle size={20} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?{" "}
              <button
                onClick={() => setSignup(true)}
                className="text-blue-500 font-medium hover:text-blue-600 hover:underline transition-colors cursor-pointer"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>

        {/* Bottom note */}
        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            Secure login protected by Argon2id encryption
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;