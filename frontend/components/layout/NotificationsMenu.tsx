"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Sparkles, TrendingUp, BrainCircuit, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useActiveUser } from "@/lib/user-context";
import { useReader } from "@/lib/reader-context";
import { fetchRecommendations, fetchTrendingTopics, fetchModelStatus } from "@/services/api";
import type { ModelStatus, RecommendedArticle, TrendingTopic } from "@/types";
import { cn, timeAgo } from "@/lib/utils";

interface Notification {
  id: string;
  icon: LucideIcon;
  tone: "brand" | "emerald" | "violet";
  title: string;
  body: string;
  meta: string;
  articleId?: string;
}

const TONES = {
  brand: "bg-brand-50 text-brand-600",
  emerald: "bg-emerald-50 text-emerald-600",
  violet: "bg-violet-50 text-violet-600",
};

const READ_KEY = "newsmind_read_notifications_v1";

/** Derives the notification feed from live API data for the active user. */
function buildNotifications(
  recs: RecommendedArticle[],
  trending: TrendingTopic[],
  model: ModelStatus | null
): Notification[] {
  const items: Notification[] = recs.map((r) => ({
    id: `rec-${r.news_id}`,
    icon: Sparkles,
    tone: "brand",
    title: `${r.match_score}% match for you`,
    body: r.title,
    meta: timeAgo(r.published_at),
    articleId: r.news_id,
  }));

  for (const t of trending.slice(0, 1)) {
    items.push({
      id: `trend-${t.topic}`,
      icon: TrendingUp,
      tone: "emerald",
      title: `${t.topic} is trending`,
      body: `${t.read_count.toLocaleString()} reads · ${t.growth_percent > 0 ? "+" : ""}${t.growth_percent}% this week`,
      meta: "Today",
    });
  }

  if (model) {
    items.push({
      id: "model-status",
      icon: BrainCircuit,
      tone: "violet",
      title: "GRU model updated",
      body: `Retrained on your latest reading sequence · ${model.version}`,
      meta: timeAgo(model.last_trained),
    });
  }

  return items;
}

export default function NotificationsMenu() {
  const { activeUserId } = useActiveUser();
  const { openArticle } = useReader();
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [recs, setRecs] = useState<RecommendedArticle[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [model, setModel] = useState<ModelStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchRecommendations(activeUserId, 3),
      fetchTrendingTopics(),
      fetchModelStatus(),
    ]).then(([r, t, m]) => {
      if (cancelled) return;
      setRecs(r);
      setTrending(t);
      setModel(m);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  const notifications = useMemo(
    () => buildNotifications(recs, trending, model),
    [recs, trending, model]
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(READ_KEY);
      if (raw) setReadIds(JSON.parse(raw));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  const persistRead = (ids: string[]) => {
    setReadIds(ids);
    try {
      window.localStorage.setItem(READ_KEY, JSON.stringify(ids));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Render the badge only after hydration so SSR and client markup agree.
  const unread = hydrated ? notifications.filter((n) => !readIds.includes(n.id)) : [];

  const markAllRead = () => persistRead(notifications.map((n) => n.id));

  const handleClick = (n: Notification) => {
    if (!readIds.includes(n.id)) persistRead([...readIds, n.id]);
    if (n.articleId) {
      setOpen(false);
      openArticle(n.articleId);
    }
  };

  return (
    <div ref={wrapRef} className="relative ml-auto shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread.length ? ` (${unread.length} unread)` : ""}`}
        aria-expanded={open}
        className="relative w-12 h-12 rounded-2xl bg-white border border-surface-border shadow-soft flex items-center justify-center text-ink-500 hover:text-ink-900 hover:bg-surface-muted transition-colors"
      >
        <Bell size={18} />
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-brand-500 ring-2 ring-surface text-white text-[11px] font-bold flex items-center justify-center">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[340px] card shadow-card-hover z-30 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
            <p className="text-sm font-semibold text-ink-900">Notifications</p>
            {unread.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                <Check size={13} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto scrollbar-thin">
            {notifications.map((n) => {
              const isUnread = hydrated && !readIds.includes(n.id);
              const Icon = n.icon;
              return (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-3 text-left border-b border-surface-border last:border-0 hover:bg-surface-muted transition-colors",
                    isUnread && "bg-brand-50/40"
                  )}
                >
                  <span
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      TONES[n.tone]
                    )}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-ink-900">{n.title}</span>
                    <span className="block text-xs text-ink-500 mt-0.5 line-clamp-2 leading-snug">
                      {n.body}
                    </span>
                    <span className="block text-[11px] text-ink-400 mt-1">{n.meta}</span>
                  </span>
                  {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
