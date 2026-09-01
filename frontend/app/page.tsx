"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Target, Layers, Gauge, Sparkles, ArrowRight, TrendingUp, Check } from "lucide-react";
import { useActiveUser } from "@/lib/user-context";
import { useActivity } from "@/lib/activity-context";
import {
  fetchDashboardStats,
  fetchRecommendations,
  fetchInterestTrends,
  fetchTrendingTopics,
  fetchUserHistory,
  fetchUserPreferences,
} from "@/services/api";
import { useCatalog } from "@/lib/catalog-context";
import { isCustomUser } from "@/lib/custom-profile";
import type {
  DashboardStats,
  InterestTrendPoint,
  NewsArticle,
  RecommendedArticle,
  TrendingTopic,
  UserInteraction,
  UserPreferences,
} from "@/types";
import KpiCard from "@/components/ui/KpiCard";
import NewsCard from "@/components/ui/NewsCard";
import SectionHeader from "@/components/ui/SectionHeader";
import { CardGridSkeleton, InlineLoader } from "@/components/ui/States";
import InterestTrendsChart from "@/components/dashboard/InterestTrendsChart";
import TrendingTopics from "@/components/dashboard/TrendingTopics";
import HeroGlobe from "@/components/dashboard/HeroGlobe";
import { ProfileCard, FavoriteCategories, RecentlyRead, GruModelCard } from "@/components/dashboard/RightRail";

/** Depends on the *viewer's* local clock, so it can only be correct on the
 *  client. The server renders in UTC, which is a different time of day for
 *  most readers — see the suppressHydrationWarning note at the call site. */
function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export default function HomePage() {
  const { activeUserId } = useActiveUser();
  const { reads, bookmarks, hydrated } = useActivity();
  const { newsById, userById } = useCatalog();
  const profile = userById(activeUserId);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recs, setRecs] = useState<RecommendedArticle[]>([]);
  const [trends, setTrends] = useState<InterestTrendPoint[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [history, setHistory] = useState<UserInteraction[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchDashboardStats(activeUserId),
      fetchRecommendations(activeUserId, 4),
      fetchInterestTrends(activeUserId),
      fetchTrendingTopics(),
      fetchUserHistory(activeUserId),
      fetchUserPreferences(activeUserId),
    ]).then(([statsRes, recsRes, trendsRes, trendingRes, historyRes, prefsRes]) => {
      if (cancelled) return;
      setStats(statsRes);
      setRecs(recsRes);
      setTrends(trendsRes);
      setTrending(trendingRes.slice(0, 6));
      setHistory(historyRes);
      setPrefs(prefsRes);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  // A browser-created profile is ranked against its own reading history, so a
  // new read should change what it is offered next. Seeded personas are ranked
  // server-side and do not need this.
  const localReadCount = hydrated && isCustomUser(activeUserId) ? reads.length : null;
  useEffect(() => {
    if (localReadCount === null) return;
    let cancelled = false;
    Promise.all([
      fetchRecommendations(activeUserId, 4),
      fetchDashboardStats(activeUserId),
    ]).then(([recsRes, statsRes]) => {
      if (cancelled) return;
      setRecs(recsRes);
      setStats(statsRes);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUserId, localReadCount]);

  // Resolved against the catalog rather than at fetch time: the catalog may
  // still be loading when the history request resolves, which would otherwise
  // leave the rail permanently empty.
  const seededRead = useMemo(() => {
    // A reading sequence legitimately revisits articles, so the raw history
    // contains repeats. Collapse to the most recent occurrence of each id —
    // otherwise the rail renders duplicate rows with duplicate React keys.
    const seen = new Set<string>();
    const out: NewsArticle[] = [];
    for (const h of [...history].reverse()) {
      if (seen.has(h.news_id)) continue;
      const article = newsById(h.news_id);
      if (!article) continue;
      seen.add(h.news_id);
      out.push(article);
    }
    return out;
  }, [history, newsById]);

  // Articles read in this browser take priority in the rail; the seeded
  // history fills the rest. Duplicates collapse to the more recent read.
  const recentArticles = useMemo(() => {
    const live = reads
      .map((r) => newsById(r.news_id))
      .filter(Boolean) as NewsArticle[];
    const seen = new Set(live.map((a) => a.news_id));
    return [...live, ...seededRead.filter((a) => !seen.has(a.news_id))];
  }, [reads, seededRead, newsById]);

  // Reads this browser recorded that weren't already in the seeded history.
  const newReadCount = useMemo(() => {
    const seeded = new Set(seededRead.map((a) => a.news_id));
    return reads.filter((r) => !seeded.has(r.news_id)).length;
  }, [reads, seededRead]);

  // Seeded personas get their count from the server, which knows nothing about
  // reads made here — so local ones are added. A browser-created profile's
  // stats are already derived from that same local history, and adding them
  // again would count every read twice.
  const totalRead =
    (stats?.total_news_read ?? 0) +
    (hydrated && !isCustomUser(activeUserId) ? newReadCount : 0);

  // --- Series behind the KPI mini-charts, all derived from real responses ---

  // Daily article counts over the trend window (interest trends carry one
  // entry per category per day; summing gives reads per day).
  const dailyReads = useMemo(
    () =>
      trends.map((point) =>
        Object.entries(point).reduce(
          (sum, [key, val]) => (key === "date" ? sum : sum + (Number(val) || 0)),
          0
        )
      ),
    [trends]
  );

  const readsYesterday = dailyReads.length >= 2 ? dailyReads[dailyReads.length - 2] : null;

  // The spread of match scores the model returned for this user.
  const matchScores = useMemo(() => recs.map((r) => r.match_score), [recs]);

  // Share of this user's history that sits in their top category.
  // Counts the merged view, so a browser-created profile — which has no
  // server-side history at all — still reports a real share once it reads.
  const topCategoryShare = useMemo(() => {
    if (!stats || !recentArticles.length) return 0;
    const inTop = recentArticles.filter((a) => a.category === stats.top_category).length;
    return (inTop / recentArticles.length) * 100;
  }, [recentArticles, stats]);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        {/* suppressHydrationWarning: the server renders this in UTC and the
            browser in the reader's own timezone, so the two legitimately
            differ. Without it React treats the mismatch as a hydration
            failure and throws away the whole server-rendered tree. */}
        <h1
          suppressHydrationWarning
          className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight"
        >
          {greeting()}, {profile?.name.split(" ")[0] ?? "there"}
          <span className="ml-1.5" role="img" aria-label="waving hand">
            👋
          </span>
        </h1>
        <p className="text-ink-500 mt-1">
          Here&apos;s your personalized news dashboard. Stay informed, stay ahead.
        </p>
      </motion.div>

      {/* AI Powered Recommendations Hero */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative overflow-hidden rounded-xl2 border border-brand-100 bg-hero-gradient p-8 sm:p-10"
      >
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="absolute -left-16 -bottom-24 w-72 h-72 rounded-full bg-brand-300/20 blur-3xl" />

        {/* Illustration sits behind the copy and is hidden on narrow screens
            so it never competes with the text for space. */}
        <HeroGlobe className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 h-[112%] w-auto pointer-events-none select-none" />

        <div className="relative max-w-xl">
          <span className="badge bg-white/70 text-brand-700 ring-1 ring-brand-200/70 mb-4">
            <Sparkles size={12} />
            AI-Powered Recommendations
          </span>
          <h2 className="text-2xl sm:text-[32px] font-bold leading-[1.15] tracking-tight text-ink-900">
            News that matches
            <br className="hidden sm:block" /> your interests
          </h2>
          <p className="mt-3 text-ink-500 leading-relaxed">
            Our GRU model analyzes your reading behavior to bring you the most
            relevant news, learning from every article you read.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href="/for-you" className="btn-primary">
              Explore Recommendations
              <ArrowRight size={16} />
            </Link>
            {hydrated && bookmarks.length > 0 && (
              <Link
                href="/history?tab=bookmarks"
                className="inline-flex items-center gap-2 rounded-xl border border-brand-200 bg-white/70 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-white transition-colors"
              >
                {bookmarks.length} saved {bookmarks.length === 1 ? "article" : "articles"}
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      {loading || !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[150px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total News Read"
            value={totalRead}
            icon={BookOpen}
            accent="brand"
            index={0}
            href="/history"
            visual={{ kind: "bar", data: dailyReads }}
            footer={
              hydrated && newReadCount > 0
                ? `+${newReadCount} this session`
                : readsYesterday
                ? `${readsYesterday} read yesterday`
                : `across ${seededRead.length} articles`
            }
            footerIcon={TrendingUp}
            footerTone="brand"
          />
          <KpiCard
            label="Recommendation Score"
            value={`${stats.recommendation_score}%`}
            icon={Target}
            accent="violet"
            index={1}
            href="/for-you"
            visual={{ kind: "line", data: matchScores }}
            footer={
              matchScores.length
                ? `Top match ${Math.max(...matchScores)}%`
                : undefined
            }
            footerIcon={TrendingUp}
            footerTone="violet"
          />
          <KpiCard
            label="Top Category"
            value={stats.top_category}
            icon={Layers}
            accent="emerald"
            index={2}
            href={`/discover?category=${encodeURIComponent(stats.top_category)}`}
            visual={{ kind: "ring", percent: topCategoryShare }}
            footer={`${Math.round(topCategoryShare)}% of your reads`}
            footerTone="emerald"
          />
          <KpiCard
            label="AI Confidence"
            value={`${stats.ai_confidence}%`}
            icon={Gauge}
            accent="amber"
            index={3}
            href="/model-insights"
            badge={stats.ai_confidence >= 60 ? "High" : "Moderate"}
            badgeTone={stats.ai_confidence >= 60 ? "emerald" : "amber"}
            visual={{ kind: "area", data: matchScores }}
            footer={stats.ai_confidence >= 60 ? "High relevance" : "Building profile"}
            footerIcon={Check}
            footerTone="amber"
          />
        </div>
      )}

      {/* Row 1 — recommendations beside the profile rail. The rail only spans
          this row, so the sections below can use the full page width instead
          of leaving a dead gutter beneath it. */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
        <section className="min-w-0">
          <SectionHeader
            title="Recommended For You"
            subtitle="Personalized picks from your GRU sequential model"
            viewAllHref="/for-you"
          />
          {loading ? (
            <CardGridSkeleton count={4} />
          ) : recs.length === 0 ? (
            <InlineLoader label="No recommendations yet — start reading to train your profile" />
          ) : (
            // Sized by the column's real width, not the viewport: the 320px
            // right rail appears at the same xl breakpoint, so a fixed
            // 4-column grid would squeeze cards to ~147px here.
            <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))]">
              {recs.map((a) => (
                <NewsCard key={a.news_id} article={a} />
              ))}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          {profile && <ProfileCard user={profile} />}
          {prefs && <FavoriteCategories preferences={prefs} />}
          <RecentlyRead articles={recentArticles} />
          <GruModelCard />
        </aside>
      </div>

      {/* Row 2 — same split as row 1 so the right column runs straight down
          the page and the vertical seam never shifts between sections. */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-8 items-start">
        <section className="card p-6 min-w-0">
          <SectionHeader title="Interest Trends" subtitle="Your reading interest over the last 14 days" />
          {loading ? (
            <div className="skeleton h-72" />
          ) : (
            <InterestTrendsChart data={trends} categories={prefs?.preferred_categories ?? []} />
          )}
        </section>

        <section className="min-w-0">
          <SectionHeader title="Trending Topics" subtitle="What readers are engaging with right now" />
          {loading ? <div className="skeleton h-64" /> : <TrendingTopics topics={trending} />}
        </section>
      </div>
    </div>
  );
}
