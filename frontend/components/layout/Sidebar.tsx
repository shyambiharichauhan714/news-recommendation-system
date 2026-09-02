"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveUser } from "@/lib/user-context";
import { fetchDashboardStats } from "@/services/api";
import {
  Home,
  Sparkles,
  Compass,
  BarChart3,
  BrainCircuit,
  History,
  UserCog,
  Newspaper,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/for-you", label: "For You", icon: Sparkles },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/model-insights", label: "AI Model Insights", icon: BrainCircuit },
  { href: "/history", label: "Reading History", icon: History },
  { href: "/profile", label: "Profile & Preferences", icon: UserCog },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { activeUserId, hydrated: userReady } = useActiveUser();
  const [confidence, setConfidence] = useState<number | null>(null);

  // The meter reports the live AI-confidence figure the dashboard endpoint
  // returns for the active user, not a fixed design value.
  useEffect(() => {
    if (!userReady) return;
    let cancelled = false;
    fetchDashboardStats(activeUserId).then((s) => {
      if (!cancelled) setConfidence(s.ai_confidence);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUserId, userReady]);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-72 bg-white border-r border-surface-border z-30">
      <div className="flex items-center gap-2.5 px-6 h-20 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow shrink-0">
          <Newspaper size={18} className="text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[15px] leading-tight tracking-tight text-ink-900">NewsMind AI</p>
          <p className="text-[11px] text-ink-500 leading-tight truncate">
            Personalized intelligence
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-thin">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand-gradient text-white shadow-glow"
                  : "text-ink-500 hover:text-ink-900 hover:bg-surface-muted"
              )}
            >
              <Icon
                size={18}
                strokeWidth={2}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-white" : "text-ink-400 group-hover:text-ink-700"
                )}
              />
              <span className="truncate">{label}</span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mx-3 mb-4 rounded-xl2 bg-surface-muted border border-surface-border">
        <div className="flex items-center gap-2 mb-1.5">
          <BrainCircuit size={15} className="text-violet-600" />
          <p className="text-xs font-semibold text-ink-900">GRU Model</p>
        </div>
        <p className="text-[11px] text-ink-700 leading-relaxed">
          Sequential behavior model actively learning your reading patterns.
        </p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-emerald-700 font-medium">Active</span>
        </div>

        <div className="mt-3 pt-3 border-t border-surface-border">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-ink-700">Model Confidence</span>
            <span className="font-semibold text-ink-900">
              {confidence === null ? "—" : `${confidence}%`}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-surface-border overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-gradient transition-[width] duration-500"
              style={{ width: `${confidence ?? 0}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
