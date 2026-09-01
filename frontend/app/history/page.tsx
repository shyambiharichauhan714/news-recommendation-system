"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpenCheck, Bookmark, Compass, Eye, MousePointerClick, Clock } from "lucide-react";
import { useActiveUser } from "@/lib/user-context";
import { isCustomUser } from "@/lib/custom-profile";
import { useActivity } from "@/lib/activity-context";
import { useCatalog } from "@/lib/catalog-context";
import { useReader } from "@/lib/reader-context";
import { fetchUserHistory } from "@/services/api";
import { mergeTimeline, type TimelineEntry } from "@/lib/timeline";
import type { NewsArticle, UserInteraction } from "@/types";
import { EmptyState } from "@/components/ui/States";
import { cn, formatDate, formatTime, getCategoryColor, timeAgo } from "@/lib/utils";
import ArticleImage from "@/components/ui/ArticleImage";

const TYPE_ICON = {
  view: Eye,
  click: MousePointerClick,
  read: BookOpenCheck,
  like: BookOpenCheck,
  bookmark: Bookmark,
} as const;

type Tab = "all" | "read" | "bookmarked";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All activity" },
  { key: "read", label: "Read" },
  { key: "bookmarked", label: "Bookmarked" },
];

function HistoryContent() {
  const searchParams = useSearchParams();
  const { activeUserId, hydrated: userReady } = useActiveUser();
  const { reads, bookmarks, hydrated } = useActivity();
  const { newsById } = useCatalog();
  const { openArticle } = useReader();

  const [history, setHistory] = useState<UserInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");

  // Waits for the stored selection. Fetching on the provisional id asked for
  // the default persona's history, and that response arriving after the real
  // one put U001's reading list under someone else's profile.
  useEffect(() => {
    if (!userReady) return;
    let cancelled = false;
    setLoading(true);
    fetchUserHistory(activeUserId).then((data) => {
      if (cancelled) return;
      setHistory(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUserId, userReady]);

  // Deep link from the dashboard's "N saved articles" pill.
  useEffect(() => {
    const requested = searchParams.get("tab");
    if (requested === "bookmarks" || requested === "bookmarked") setTab("bookmarked");
    else if (requested === "read") setTab("read");
  }, [searchParams]);

  // Server history plus anything read in this browser, most recent first.
  // Local reads are withheld until hydration so the first client render still
  // matches the server output.
  const timeline = useMemo<TimelineEntry[]>(
    () => mergeTimeline(history, hydrated ? reads : []),
    [history, reads, hydrated]
  );

  const filtered = useMemo(
    () => (tab === "read" ? timeline.filter((e) => e.interaction_type === "read") : timeline),
    [timeline, tab]
  );

  const grouped = useMemo(
    () =>
      filtered.reduce<Record<string, TimelineEntry[]>>((acc, item) => {
        const key = formatDate(item.timestamp);
        (acc[key] ??= []).push(item);
        return acc;
      }, {}),
    [filtered]
  );

  const bookmarkedArticles = useMemo(
    () =>
      hydrated
        ? (bookmarks.map((id) => newsById(id)).filter(Boolean) as NewsArticle[])
        : [],
    [bookmarks, newsById, hydrated]
  );

  const counts = {
    all: timeline.length,
    read: timeline.filter((e) => e.interaction_type === "read").length,
    bookmarked: bookmarkedArticles.length,
  };

  // A profile created in this browser starts with nothing, so an empty page is
  // its expected first state rather than a failure. Saying that — and offering
  // the way out — beats a bare card that reads as a broken section.
  const ownProfile = isCustomUser(activeUserId);

  const browseAction = (
    <Link href="/discover" className="btn-primary text-sm">
      <Compass size={16} />
      Browse articles
    </Link>
  );

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">
          Reading History
        </h1>
        <p className="text-ink-500 mt-1">
          Chronological record of the sequence that trains your GRU profile.
        </p>
      </motion.div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
              tab === t.key
                ? "bg-brand-gradient text-white border-transparent"
                : "bg-white text-ink-600 border-surface-border hover:bg-surface-muted"
            )}
          >
            {t.label}
            <span className={cn("ml-1.5", tab === t.key ? "text-white/70" : "text-ink-400")}>
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-20" />
          ))}
        </div>
      ) : tab === "bookmarked" ? (
        bookmarkedArticles.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="Nothing saved yet"
            description="Tap the bookmark on any article card, or Save for later while reading, and it will show up here."
            action={browseAction}
          />
        ) : (
          <div className="card divide-y divide-surface-border overflow-hidden">
            {bookmarkedArticles.map((a) => {
              const colors = getCategoryColor(a.category);
              return (
                <button
                  key={a.news_id}
                  onClick={() => openArticle(a)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-surface-muted transition-colors"
                >
                  <ArticleImage
                    article={a}
                    width={160}
                    height={160}
                    className="w-14 h-14 rounded-lg object-cover shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 truncate">{a.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("badge text-[10px] py-0.5 px-2", colors.bg, colors.text)}>
                        {a.category}
                      </span>
                      <span className="text-xs text-ink-400 flex items-center gap-1">
                        <Clock size={11} />
                        {a.read_time_minutes} min · {timeAgo(a.published_at)}
                      </span>
                    </div>
                  </div>
                  <Bookmark size={15} className="fill-brand-500 text-brand-500 shrink-0" />
                </button>
              );
            })}
          </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title={ownProfile ? "Your history starts here" : "No reading history yet"}
          description={
            ownProfile
              ? "This profile hasn't opened an article yet. Each one you read is added below, and that sequence is exactly what the GRU model ranks your recommendations against."
              : "Articles you read will appear here in chronological order."
          }
          action={browseAction}
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-3">
                {date}
              </p>
              <div className="card divide-y divide-surface-border overflow-hidden">
                {items.map((item) => {
                  const article = newsById(item.news_id);
                  const Icon = TYPE_ICON[item.interaction_type];
                  const colors = article ? getCategoryColor(article.category) : null;
                  return (
                    <button
                      key={item.key}
                      onClick={() => article && openArticle(article)}
                      disabled={!article}
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-surface-muted transition-colors disabled:cursor-default"
                    >
                      {article && (
                        <ArticleImage
                          article={article}
                          width={160}
                          height={160}
                          className="w-14 h-14 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink-900 truncate">
                          {article?.title ?? item.news_id}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {colors && (
                            <span
                              className={cn("badge text-[10px] py-0.5 px-2", colors.bg, colors.text)}
                            >
                              {article?.category}
                            </span>
                          )}
                          <span className="text-xs text-ink-400">
                            {formatTime(item.timestamp)}
                          </span>
                          {item.local && (
                            <span className="badge text-[10px] py-0.5 px-2 bg-emerald-50 text-emerald-600">
                              This session
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-ink-500 shrink-0 capitalize">
                        <Icon size={14} />
                        {item.interaction_type}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-20" />
          ))}
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
