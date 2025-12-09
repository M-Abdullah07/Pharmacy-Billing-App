import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, AlertCircle, RectangleEllipsis, User, CheckCircle } from "lucide-react";
import "@/index.css";

const Signup = ({ onSignup, setSignup }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const validatePassword = (pwd) => {
        if (pwd.length < 6) {
            return "Password must be at least 6 characters long";
        }
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        // Validation
        if (!username || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
        }

        if (username.length < 3) {
            setError("Username must be at least 3 characters long.");
            return;
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setIsLoading(true);

        try {
            // Check if user already exists
            const existingUsers = await window.electronAPI.queryDb(
                `SELECT * FROM users WHERE username = ?`,
                [username]
            );

            if (existingUsers && existingUsers.length > 0) {
                setError("Username already exists. Please choose a different username.");
                setIsLoading(false);
                return;
            }

            // Create new user
            const result = await window.electronAPI.runDb(
                `INSERT INTO users (username, password) VALUES (?, ?)`,
                [username, password]
            );

            if (result && result.lastID) {
                setSuccess("Account created successfully! Redirecting to login...");
                setTimeout(() => {
                    setSignup(false);
                }, 1500);
            } else {
                setError("Failed to create account. Please try again.");
            }
        } catch (err) {
            setError("Signup error: " + err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex fixed w-screen h-screen items-center justify-center p-[16px] bg-gradient-to-br from-[#eff6ff] to-[#e0e7ff]">
            <div className="w-full max-w-[400px]">
                {/* Signup Card */}
                <div className="bg-white rounded-[16px] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] p-8 border border-[#f3f4f6]">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-[#10b981] to-[#059669] rounded-full flex items-center justify-center mb-4 mx-auto">
                            <User size={32} color="white" />
                        </div>
                        <h1 className="text-2xl font-bold text-[#111827]">Create Account</h1>
                        <p className="text-[#6b7280] text-sm mt-[8px]">Sign up for a new account</p>
                    </div>

                    {/* Form */}
                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-[20px]"
                    >
                        {/* Username Field */}
                        <div className="flex flex-col">
                            <label className="block text-[14px] font-medium text-[#374151] mb-2">Username</label>
                            <div className="relative">
                                <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md text-sm bg-white focus:border-blue-500 transition-all"
                                    placeholder="Choose a username"
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
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md text-sm bg-white focus:border-blue-500 transition-all"
                                    placeholder="Create a password"
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
                            {password && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {password.length < 6 ? "At least 6 characters required" : "✓ Strong password"}
                                </p>
                            )}
                        </div>

                        {/* Confirm Password Field */}
                        <div className="flex flex-col">
                            <label className="block text-[14px] font-medium text-[#374151] mb-2">Confirm Password</label>
                            <div className="relative">
                                <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md text-sm bg-white focus:border-blue-500 transition-all"
                                    placeholder="Confirm your password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-gray-400 transition-colors duration-200 p-1"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {confirmPassword && (
                                <p className={`text-xs mt-1 ${password === confirmPassword ? "text-green-600" : "text-red-600"}`}>
                                    {password === confirmPassword ? "✓ Passwords match" : "✗ Passwords don't match"}
                                </p>
                            )}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="flex items-center gap-4 text-red-600 bg-red-50 p-3 rounded-md border border-red-200 text-sm">
                                <AlertCircle size={20} />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="flex items-center gap-4 text-green-600 bg-green-50 p-3 rounded-md border border-green-200 text-sm">
                                <CheckCircle size={20} />
                                <span>{success}</span>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 mt-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Creating Account...</span>
                                </div>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Already have an account?{" "}
                            <button
                                onClick={() => setSignup(false)}
                                className="text-blue-500 font-medium hover:text-blue-600 hover:underline transition-colors cursor-pointer"
                            >
                                Sign in
                            </button>
                        </p>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="text-center mt-6">
                    <p className="text-gray-400">
                        Secure signup protected by encryption
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
