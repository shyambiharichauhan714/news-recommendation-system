"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Globe, Users, Sparkles } from "lucide-react";
import { useActiveUser } from "@/lib/user-context";
import { fetchDemoUsers, fetchUserPreferences } from "@/services/api";
import { CATEGORIES, getDemoUser } from "@/lib/mock-data";
import type { Category, User, UserPreferences } from "@/types";
import { cn, getCategoryColor } from "@/lib/utils";
import { avatarFor } from "@/lib/placeholder";

const LANGUAGES = ["English", "Spanish", "French", "German", "Hindi", "Japanese"];

export default function ProfilePage() {
  const { activeUserId, setActiveUserId } = useActiveUser();
  const [users, setUsers] = useState<User[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [language, setLanguage] = useState("English");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchDemoUsers().then(setUsers);
  }, []);

  useEffect(() => {
    fetchUserPreferences(activeUserId).then((p) => {
      setPrefs(p);
      setSelectedCategories(p.preferred_categories);
    });
    setLanguage(getDemoUser(activeUserId).user.preferred_language);
    setSaved(false);
  }, [activeUserId]);

  const activeProfile = getDemoUser(activeUserId);

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setSaved(false);
  };

  const handleSave = () => {
    // In production this posts to PUT /api/users/{id}/preferences.
    // Demo mode simulates persistence locally.
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">Profile &amp; Preferences</h1>
        <p className="text-ink-500 mt-1">Manage your account, interests, and recommendation settings.</p>
      </motion.div>

      {/* Demo user switcher */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Users size={16} className="text-brand-600" />
          <p className="font-semibold text-ink-900">Demo Mode &mdash; Switch User</p>
        </div>
        <p className="text-sm text-ink-500 mb-4">
          Switch between demo personas to see recommendations change based on each user&apos;s reading sequence.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {users.map((u) => {
            const active = u.id === activeUserId;
            return (
              <button
                key={u.id}
                onClick={() => setActiveUserId(u.id)}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all",
                  active
                    ? "border-brand-400 bg-brand-gradient-soft shadow-glow"
                    : "border-surface-border hover:bg-surface-muted"
                )}
              >
                <img src={avatarFor(u)} alt={u.name} className="w-11 h-11 rounded-full object-cover shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 truncate">{u.name}</p>
                  <p className="text-xs text-ink-500 truncate">{u.persona}</p>
                </div>
                {active && (
                  <span className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                    <Check size={14} className="text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Account info */}
      <section className="card p-6">
        <p className="font-semibold text-ink-900 mb-4">Account</p>
        <div className="flex items-center gap-4">
          <img
            src={avatarFor(activeProfile.user)}
            alt={activeProfile.user.name}
            className="w-16 h-16 rounded-full object-cover ring-4 ring-brand-50"
          />
          <div>
            <p className="font-semibold text-ink-900">{activeProfile.user.name}</p>
            <p className="text-sm text-ink-500">{activeProfile.user.email}</p>
          </div>
        </div>
      </section>

      {/* Favorite categories */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-brand-600" />
          <p className="font-semibold text-ink-900">Favorite Categories</p>
        </div>
        <p className="text-sm text-ink-500 mb-4">
          These influence your candidate news ranking alongside your GRU sequence model.
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const colors = getCategoryColor(cat);
            const active = selectedCategories.includes(cat);
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  "badge border transition-all",
                  active
                    ? cn(colors.bg, colors.text, "border-transparent")
                    : "bg-white text-ink-400 border-surface-border"
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", active ? colors.dot : "bg-ink-300")} />
                {cat}
              </button>
            );
          })}
        </div>
      </section>

      {/* Language preference */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe size={16} className="text-brand-600" />
          <p className="font-semibold text-ink-900">Preferred Language</p>
        </div>
        <p className="text-sm text-ink-500 mb-4">Content and UI language preference.</p>
        <select
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setSaved(false);
          }}
          className="w-full sm:w-64 h-11 px-4 rounded-xl bg-white border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary">
          Save Preferences
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Preferences saved</span>}
      </div>
    </div>
  );
}
