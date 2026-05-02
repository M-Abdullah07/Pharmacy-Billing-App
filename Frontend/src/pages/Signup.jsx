import React, { useState } from "react";
import { Lock, Eye, EyeOff, AlertCircle, ShieldCheck, User, CheckCircle2, X, ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- Desktop Toast Component ---
function Toast({ message, type, onClose }) {
  React.useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-lg shadow-2xl text-sm font-semibold animate-in fade-in slide-in-from-right-5 duration-300 border
      ${type === 'success' ? 'bg-white text-green-800 border-green-200' : 'bg-white text-red-800 border-red-200'}`}>
      <div className={`p-1 rounded-full ${type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
        {type === 'success' ? <CheckCircle2 size={16} className="text-green-600" /> : <AlertCircle size={16} className="text-red-600" />}
      </div>
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="ml-2 text-zinc-400 hover:text-zinc-600 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

const Signup = ({ onSignup, setSignup }) => {
  const [username, setUsername]         = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [message, setMessage]           = useState(null);
  const [fieldErrors, setFieldErrors]   = useState({});

  const validate = () => {
    const errors = {};
    if (!username.trim()) errors.username = "Required";
    if (!password.trim()) errors.password = "Required";
    else if (password.length < 6) errors.password = "Min 6 characters";
    return errors;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setMessage(null);
    setFieldErrors({});

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const response = await window.electronAPI.signupUser(username.trim(), password);

      if (response.success) {
        setSignup(false);
      } else {
        setMessage({ type: 'error', text: response.error || "Signup failed. Username might be taken." });
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Service unavailable. Database connection failed." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-screen h-screen bg-white dark:bg-zinc-950 font-sans selection:bg-blue-100">
      
      {/* Left Side: Professional Branding / Hero */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-zinc-900 p-16 relative overflow-hidden">
        {/* Abstract Background Pattern */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-full bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-900/20">
              <ShieldCheck size={24} />
            </div>
            <span className="text-2xl font-black text-white tracking-tighter uppercase">Pharmax</span>
          </div>

          <div className="space-y-6 max-w-md">
            <h1 className="text-5xl font-black text-white leading-[1.1] tracking-tight">
              Create <br />
              <span className="text-blue-500">Administrator.</span>
            </h1>
            <p className="text-lg text-zinc-400 font-medium leading-relaxed">
              Register a new administrative account to start managing your pharmacy workstation securely.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm max-w-sm">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-400">
              <UserPlus size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-white">RBAC Ready</p>
              <p className="text-xs text-zinc-500">Role-based access for your team.</p>
            </div>
          </div>
          <p className="text-xs text-zinc-600 mt-8 font-bold tracking-widest uppercase">© 2026 Pharmax Suite</p>
        </div>
      </div>

      {/* Right Side: Signup Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 lg:px-20 relative bg-zinc-50/30">
        
        <button 
          onClick={() => setSignup(false)}
          className="absolute top-12 left-8 lg:left-20 flex items-center gap-2 text-zinc-400 hover:text-zinc-900 transition-colors font-bold text-sm group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Login
        </button>

        <div className="w-full max-w-[420px] space-y-10">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">Register.</h2>
            <p className="text-zinc-500 font-medium">Set up your pharmacy administrator credentials.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                 <Label htmlFor="username" className="text-xs font-black text-zinc-400 uppercase tracking-widest">New Username</Label>
                 {fieldErrors.username && <span className="text-[10px] font-bold text-red-500 uppercase">{fieldErrors.username}</span>}
              </div>
              <div className="relative group">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
                <Input
                  id="username"
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (fieldErrors.username) setFieldErrors(p => ({ ...p, username: "" }));
                  }}
                  className={`pl-11 h-13 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-blue-600 focus:ring-0 transition-all font-semibold ${fieldErrors.username ? "border-red-500" : ""}`}
                  placeholder="e.g. manager_01"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                 <Label htmlFor="password" className="text-xs font-black text-zinc-400 uppercase tracking-widest">Choose Password</Label>
                 {fieldErrors.password && <span className="text-[10px] font-bold text-red-500 uppercase">{fieldErrors.password}</span>}
              </div>
              <div className="relative group">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-600 transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: "" }));
                  }}
                  className={`pl-11 pr-11 h-13 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl focus:border-blue-600 focus:ring-0 transition-all font-semibold ${fieldErrors.password ? "border-red-500" : ""}`}
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-13 bg-zinc-900 hover:bg-black text-white dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl font-bold shadow-xl shadow-zinc-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Administrator</span>
                    <UserPlus size={18} />
                  </>
                )}
              </Button>
            </div>
          </form>

          <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-sm text-zinc-500 font-medium">
              Already have an account?{" "}
              <button
                onClick={() => setSignup(false)}
                className="text-blue-600 font-bold hover:text-blue-700 transition-colors"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>

      {message && (
        <Toast 
          message={message.text} 
          type={message.type} 
          onClose={() => setMessage(null)} 
        />
      )}
    </div>
  );
};

export default Signup;