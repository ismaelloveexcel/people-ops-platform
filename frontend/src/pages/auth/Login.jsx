import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Building2 } from "lucide-react";
import toast from "react-hot-toast";

export default function Login() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const { login, loading }      = useAuth();
  const navigate                = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = await login(email, password);
      if (user.is_md_level)            navigate("/md");
      else if (user.role === "manager") navigate("/manager");
      else                              navigate("/employee");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid email or password.");
    }
  };

  return (
    <div className="min-h-screen bg-brand-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 size={28} className="text-brand-gold" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">People Ops Platform</h1>
          <p className="text-sm text-gray-400 mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-8 space-y-5 shadow-xl">
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@company.com"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-xs text-brand-muted pt-1">
            Forgot your password?{" "}
            <a href="/reset-password" className="text-brand-green font-medium hover:underline">
              Reset it
            </a>
          </p>
        </form>

        <p className="text-center text-xs text-gray-500 mt-6">
          People Support AI provides guidance only. All decisions are made by your line manager.
        </p>
      </div>
    </div>
  );
}
