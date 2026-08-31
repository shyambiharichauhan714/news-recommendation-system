"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Newspaper, Mail, Lock, Loader2 } from "lucide-react";
import { useActiveUser } from "@/lib/user-context";
import { DEMO_USERS } from "@/lib/mock-data";

export default function LoginPage() {
  const router = useRouter();
  const { setActiveUserId } = useActiveUser();
  const [email, setEmail] = useState("shyam@newsmind.ai");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // In production this calls POST /api/auth/login and stores a JWT.
    // In demo mode, we match against the seeded demo users by email.
    await new Promise((r) => setTimeout(r, 500));
    const match = DEMO_USERS.find((d) => d.user.email.toLowerCase() === email.toLowerCase());
    setLoading(false);

    if (!match) {
      setError("No account found with that email. Try one of the demo accounts below.");
      return;
    }
    setActiveUserId(match.user.id);
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-gradient px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow">
            <Newspaper size={19} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">NewsMind AI</span>
        </div>

        <div className="bg-white rounded-xl2 shadow-card p-8">
          <h1 className="text-xl font-bold text-ink-900">Welcome back</h1>
          <p className="text-sm text-ink-500 mt-1">Sign in to your personalized news dashboard.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-ink-700 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-ink-700 mb-1.5 block">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <p className="text-sm text-rose-500">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-surface-border">
            <p className="text-xs text-ink-400 mb-2">Demo accounts (any password):</p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_USERS.map((d) => (
                <button
                  key={d.user.id}
                  onClick={() => setEmail(d.user.email)}
                  className="text-xs px-2.5 py-1 rounded-full bg-surface-muted text-ink-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  {d.user.email}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-ink-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-brand-600 font-medium hover:text-brand-700">
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
