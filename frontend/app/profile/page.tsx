"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, Globe, Users, Sparkles, UserPlus, Trash2, Pencil } from "lucide-react";
import { useActiveUser } from "@/lib/user-context";
import { fetchUserPreferences } from "@/services/api";
import { useCatalog } from "@/lib/catalog-context";
import {
  CUSTOM_USER_ID,
  deleteCustomProfile,
  isCustomUser,
  saveCustomProfile,
} from "@/lib/custom-profile";
import type { Category, User, UserPreferences } from "@/types";
import { cn, getCategoryColor } from "@/lib/utils";
import { avatarFor } from "@/lib/placeholder";

const LANGUAGES = ["English", "Spanish", "French", "German", "Hindi", "Japanese"];

export default function ProfilePage() {
  const { activeUserId, setActiveUserId } = useActiveUser();
  const { users, customProfile, refreshCustomProfile, news } = useCatalog();
  const [showForm, setShowForm] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftCategories, setDraftCategories] = useState<Category[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [language, setLanguage] = useState("English");
  const [saved, setSaved] = useState(false);

  // Categories come from the catalog, so the options always match what the
  // API actually serves.
  const allCategories = useMemo(
    () => [...new Set(news.map((n) => n.category))].sort() as Category[],
    [news]
  );

  useEffect(() => {
    fetchUserPreferences(activeUserId).then((p) => {
      setPrefs(p);
      setSelectedCategories(p.preferred_categories);
    });
    setSaved(false);
  }, [activeUserId]);

  const activeProfile = users.find((u) => u.id === activeUserId);

  const openForm = () => {
    setDraftName(customProfile?.name ?? "");
    setDraftCategories(customProfile?.preferred_categories ?? []);
    setShowForm(true);
  };

  const toggleDraftCategory = (cat: Category) =>
    setDraftCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  const handleCreateProfile = () => {
    // Topics follow from the chosen categories, so recommendations have
    // something to explain themselves with before any reading history exists.
    const topics = [
      ...new Set(
        news.filter((n) => draftCategories.includes(n.category)).map((n) => n.subcategory)
      ),
    ].slice(0, 6);

    saveCustomProfile({
      name: draftName,
      preferred_categories: draftCategories,
      preferred_topics: topics,
    });
    refreshCustomProfile();
    setActiveUserId(CUSTOM_USER_ID);
    setShowForm(false);
  };

  const handleDeleteProfile = () => {
    deleteCustomProfile();
    refreshCustomProfile();
    if (isCustomUser(activeUserId)) setActiveUserId("U001");
    setShowForm(false);
  };

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
          Switch between demo personas to see recommendations change based on each
          user&apos;s reading sequence &mdash; or make your own and train it by reading.
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

          {/* Your own profile */}
          {!showForm && (
            <button
              onClick={openForm}
              className={cn(
                "flex items-center gap-3 p-3.5 rounded-xl border border-dashed text-left transition-all",
                customProfile
                  ? "border-brand-300 hover:bg-surface-muted"
                  : "border-surface-border hover:border-brand-300 hover:bg-surface-muted"
              )}
            >
              <span className="w-11 h-11 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                {customProfile ? (
                  <Pencil size={17} className="text-brand-600" />
                ) : (
                  <UserPlus size={18} className="text-brand-600" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink-900">
                  {customProfile ? "Edit your profile" : "Create your own profile"}
                </span>
                <span className="block text-xs text-ink-500">
                  {customProfile
                    ? "Change your name or interests"
                    : "Pick your interests and get your own recommendations"}
                </span>
              </span>
            </button>
          )}
        </div>

        {showForm && (
          <div className="mt-4 rounded-xl border border-brand-200 bg-brand-gradient-soft p-5">
            <p className="font-semibold text-ink-900 mb-1">
              {customProfile ? "Edit your profile" : "Create your profile"}
            </p>
            <p className="text-sm text-ink-500 mb-4">
              Your profile is kept in this browser. Recommendations come from the same
              GRU model &mdash; it ranks against whatever you read, so they sharpen as
              you go.
            </p>

            <label className="block text-xs font-semibold uppercase tracking-wide text-ink-500 mb-1.5">
              Your name
            </label>
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. Shyam Chauhan"
              maxLength={40}
              className="w-full h-11 px-3.5 rounded-xl bg-white border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400"
            />

            <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
              Interests &mdash; pick at least one
            </p>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((cat) => {
                const picked = draftCategories.includes(cat);
                const c = getCategoryColor(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => toggleDraftCategory(cat)}
                    aria-pressed={picked}
                    className={cn(
                      "px-3.5 py-2 rounded-full text-sm font-medium border transition-colors",
                      picked
                        ? cn(c.bg, c.text, "border-transparent")
                        : "bg-white text-ink-600 border-surface-border hover:bg-surface-muted"
                    )}
                  >
                    {picked && <Check size={13} className="inline mr-1.5 -mt-0.5" />}
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleCreateProfile}
                disabled={!draftName.trim() || draftCategories.length === 0}
                className="btn-primary text-sm py-2 disabled:opacity-40 disabled:pointer-events-none"
              >
                {customProfile ? "Save changes" : "Create profile"}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary text-sm py-2">
                Cancel
              </button>
              {customProfile && (
                <button
                  onClick={handleDeleteProfile}
                  className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700"
                >
                  <Trash2 size={14} />
                  Delete profile
                </button>
              )}
            </div>

            {!draftName.trim() || draftCategories.length === 0 ? (
              <p className="mt-3 text-xs text-ink-400">
                Add a name and at least one interest to continue.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {/* Account info */}
      <section className="card p-6">
        <p className="font-semibold text-ink-900 mb-4">Account</p>
        <div className="flex items-center gap-4">
          <img
            src={avatarFor(activeProfile ?? { name: "You" })}
            alt={activeProfile?.name ?? "You"}
            className="w-16 h-16 rounded-full object-cover ring-4 ring-brand-50"
          />
          <div>
            <p className="font-semibold text-ink-900">{activeProfile?.name ?? "—"}</p>
            <p className="text-sm text-ink-500">
              {isCustomUser(activeUserId) ? "Your profile · saved in this browser" : activeProfile?.email}
            </p>
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
          {allCategories.map((cat) => {
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
