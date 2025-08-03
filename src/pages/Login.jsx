import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, AlertCircle, RectangleEllipsis } from "lucide-react";
import "../index.css"

const Login = ({ onLogin, setSignup }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
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
          <form
            form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
            className="flex flex-col gap-[24px]"
          >
            {/* Email Field */}
            <div className="flex flex-col">
              <label className="block text-[14px] font-medium text-[#374151] mb-2">Email Address</label>
              <div className="relative">
                <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
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
            <div className="flex flex-col">
              <label className="block text-[14px] font-medium text-[#374151] mb-2">Password</label>
              <div className="relative">
                <RectangleEllipsis size={20} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400 transition-colors duration-200 p-1"
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
                  <div className="w-5 h-5 mt-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
              <button onClick={() => setSignup(true)} className="text-blue-500 font-medium hover:text-blue-600 hover:underline transition-colors cursor-pointer" >
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
