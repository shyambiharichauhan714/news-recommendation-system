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
  const { activeUserId } = useActiveUser();
  const [confidence, setConfidence] = useState<number | null>(null);

  // The meter reports the live AI-confidence figure the dashboard endpoint
  // returns for the active user, not a fixed design value.
  useEffect(() => {
    let cancelled = false;
    fetchDashboardStats(activeUserId).then((s) => {
      if (!cancelled) setConfidence(s.ai_confidence);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:w-72 bg-navy-gradient text-white z-30">
      <div className="flex items-center gap-2.5 px-6 h-20 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow shrink-0">
          <Newspaper size={18} className="text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-[15px] leading-tight tracking-tight">NewsMind AI</p>
          <p className="text-[11px] text-white/60 leading-tight truncate">
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
                  : "text-white/55 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon
                size={18}
                strokeWidth={2}
                className={cn(
                  "shrink-0 transition-colors",
                  active ? "text-white" : "text-white/50 group-hover:text-white/80"
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

      <div className="p-4 mx-3 mb-4 rounded-xl2 bg-white/5 border border-white/10">
        <div className="flex items-center gap-2 mb-1.5">
          <BrainCircuit size={15} className="text-violet-400" />
          <p className="text-xs font-semibold text-white/80">GRU Model</p>
        </div>
        <p className="text-[11px] text-white/60 leading-relaxed">
          Sequential behavior model actively learning your reading patterns.
        </p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-emerald-400 font-medium">Active</span>
        </div>

        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-white/60">Model Confidence</span>
            <span className="font-semibold text-white/85">
              {confidence === null ? "—" : `${confidence}%`}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
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
