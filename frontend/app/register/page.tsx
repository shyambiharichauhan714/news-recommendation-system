"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Newspaper, Mail, Lock, User as UserIcon, Loader2 } from "lucide-react";
import { useActiveUser } from "@/lib/user-context";
import { DEMO_USERS } from "@/lib/mock-data";

export default function RegisterPage() {
  const router = useRouter();
  const { setActiveUserId } = useActiveUser();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // In production this calls POST /api/auth/register, creating a row in
    // the users table and an empty user_preferences row. In demo mode we
    // just sign the visitor in as the first demo persona so the dashboard
    // is immediately populated with sample data.
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setActiveUserId(DEMO_USERS[0].user.id);
    router.push("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-gradient px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow">
            <Newspaper size={19} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">NewsMind AI</span>
        </div>

        <div className="bg-white rounded-xl2 shadow-card p-8">
          <h1 className="text-xl font-bold text-ink-900">Create your account</h1>
          <p className="text-sm text-ink-500 mt-1">Start getting personalized intelligence, tailored to you.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-ink-700 mb-1.5 block">Full name</label>
              <div className="relative">
                <UserIcon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400"
                  placeholder="Jane Doe"
                />
              </div>
            </div>
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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-xl border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-ink-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-600 font-medium hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
