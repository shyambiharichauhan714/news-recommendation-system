// Typed API client for the NewsMind AI backend.
//
// Every function attempts a real call to the FastAPI backend first. If the
// backend is unreachable (e.g. not started yet, or during frontend-only
// development), it gracefully falls back to the local mock/demo dataset in
// lib/mock-data.ts. This lets the frontend run standalone (Section 18: Demo
// Mode) while remaining fully wired for the real backend once it's up.

import type {
  AnalyticsData,
  Category,
  DashboardStats,
  InterestTrendPoint,
  ModelMetrics,
  ModelStatus,
  NewsArticle,
  RecommendedArticle,
  TrendingTopic,
  User,
  UserInteraction,
  UserPreferences,
} from "@/types";
import {
  DEMO_USERS,
  MODEL_METRICS,
  MODEL_STATUS,
  NEWS_DATASET,
  buildInteractionsForUser,
  getAnalyticsForUser,
  getDashboardStats,
  getDemoUser,
  getInterestTrends,
  getNewsByCategory,
  getRecommendationsForUser,
  getTrainingLossCurve,
  getTrendingTopics,
} from "@/lib/mock-data";

import {
  CUSTOM_USER_ID,
  getCustomHistory,
  getCustomProfile,
  isCustomUser,
} from "@/lib/custom-profile";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const FETCH_TIMEOUT_MS = 2500;

class ApiUnavailableError extends Error {}

async function tryFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new ApiUnavailableError(`API ${path} returned ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/** Wraps a live API call with a fallback to demo data if the backend isn't reachable. */
async function withFallback<T>(live: () => Promise<T>, fallback: () => T): Promise<T> {
  try {
    return await live();
  } catch {
    return fallback();
  }
}

// ---------------- News ----------------

export async function fetchNews(): Promise<NewsArticle[]> {
  return withFallback(
    () => tryFetch<NewsArticle[]>("/news"),
    () => NEWS_DATASET
  );
}

export async function fetchNewsById(id: string): Promise<NewsArticle | undefined> {
  return withFallback(
    () => tryFetch<NewsArticle>(`/news/${id}`),
    () => NEWS_DATASET.find((n) => n.news_id === id)
  );
}

export async function fetchNewsByCategory(category: Category): Promise<NewsArticle[]> {
  return withFallback(
    () => tryFetch<NewsArticle[]>(`/news/category/${encodeURIComponent(category)}`),
    () => getNewsByCategory(category)
  );
}

// ---------------- Users ----------------

export async function fetchDemoUsers(): Promise<User[]> {
  return withFallback(
    () => tryFetch<User[]>("/users/demo"),
    () => DEMO_USERS.map((d) => d.user)
  );
}

export async function fetchUserHistory(userId: string): Promise<UserInteraction[]> {
  // A browser-created profile has no server-side row; its history is whatever
  // the reader has actually opened.
  if (isCustomUser(userId)) return getCustomHistory();
  return withFallback(
    () => tryFetch<UserInteraction[]>(`/users/${userId}/history`),
    () => buildInteractionsForUser(userId)
  );
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferences> {
  if (isCustomUser(userId)) {
    const profile = getCustomProfile();
    return {
      user_id: CUSTOM_USER_ID,
      preferred_categories: profile?.preferred_categories ?? [],
      preferred_topics: profile?.preferred_topics ?? [],
    };
  }
  return withFallback(
    () => tryFetch<UserPreferences>(`/users/${userId}/preferences`),
    () => getDemoUser(userId).preferences
  );
}

// ---------------- Interactions ----------------

export async function postInteraction(
  userId: string,
  newsId: string,
  type: "view" | "click" | "read" | "like" | "bookmark",
  readingDuration?: number
): Promise<{ success: boolean }> {
  return withFallback(
    () =>
      tryFetch<{ success: boolean }>(`/interactions/${type}`, {
        method: "POST",
        body: JSON.stringify({ user_id: userId, news_id: newsId, reading_duration: readingDuration }),
      }),
    () => ({ success: true }) // demo mode: interaction is simulated client-side
  );
}

// ---------------- Recommendations ----------------

/**
 * Ranks a client-held history with the same GRU the by-user route uses, by
 * posting it to the API. Used for profiles the server has no record of.
 */
async function recommendationsForCustomProfile(topN: number): Promise<RecommendedArticle[]> {
  const profile = getCustomProfile();
  const history = getCustomHistory().map((h) => h.news_id);
  return withFallback(
    () =>
      tryFetch<RecommendedArticle[]>("/recommendations/for-history", {
        method: "POST",
        body: JSON.stringify({
          history,
          preferred_categories: profile?.preferred_categories ?? [],
          top_n: topN,
        }),
      }),
    () => getRecommendationsForUser(DEMO_USERS[0].user.id, topN)
  );
}

export async function fetchRecommendations(userId: string, topN = 5): Promise<RecommendedArticle[]> {
  if (isCustomUser(userId)) return recommendationsForCustomProfile(topN);
  return withFallback(
    () => tryFetch<RecommendedArticle[]>(`/recommendations/${userId}?top_n=${topN}`),
    () => getRecommendationsForUser(userId, topN)
  );
}

export async function fetchTopFive(userId: string): Promise<RecommendedArticle[]> {
  if (isCustomUser(userId)) return recommendationsForCustomProfile(5);
  return withFallback(
    () => tryFetch<RecommendedArticle[]>(`/recommendations/${userId}/top-5`),
    () => getRecommendationsForUser(userId, 5)
  );
}

// ---------------- Analytics ----------------


// --- Client-side analytics for browser-created profiles ---------------------
//
// The API has no row for a profile that only exists in this browser, so asking
// it for that user's dashboard returns defaults — "Technology, 0% of your
// reads" regardless of what the person actually read. These derive the same
// figures from the local history instead, using the same definitions the
// server uses so the two agree.

let newsCache: NewsArticle[] | null = null;

async function catalog(): Promise<NewsArticle[]> {
  if (!newsCache) newsCache = await fetchNews();
  return newsCache;
}

async function customCategoryCounts(): Promise<Map<string, number>> {
  const articles = await catalog();
  const byId = new Map(articles.map((a) => [a.news_id, a]));
  const counts = new Map<string, number>();
  for (const h of getCustomHistory()) {
    const article = byId.get(h.news_id);
    if (article) counts.set(article.category, (counts.get(article.category) ?? 0) + 1);
  }
  return counts;
}

async function customDashboardStats(): Promise<DashboardStats> {
  const history = getCustomHistory();
  const recs = await recommendationsForCustomProfile(5);
  const avgMatch = recs.length
    ? Math.round(recs.reduce((sum, r) => sum + r.match_score, 0) / recs.length)
    : 50;

  const counts = await customCategoryCounts();
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const preferred = getCustomProfile()?.preferred_categories ?? [];

  return {
    total_news_read: new Set(history.map((h) => h.news_id)).size,
    recommendation_score: avgMatch,
    // Before anything is read, the reader's own first interest is a truer
    // answer than a hardcoded default.
    top_category: (top?.[0] ?? preferred[0] ?? "Technology") as DashboardStats["top_category"],
    ai_confidence: Math.min(99, avgMatch + 4),
  };
}

async function customInterestTrends(days = 14): Promise<InterestTrendPoint[]> {
  const history = getCustomHistory();
  if (!history.length) return [];

  const articles = await catalog();
  const byId = new Map(articles.map((a) => [a.news_id, a]));
  const latest = new Date(Math.max(...history.map((h) => +new Date(h.timestamp))));

  const key = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const window: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(latest);
    d.setDate(d.getDate() - i);
    window.push(key(d));
  }

  const counts = new Map<string, Map<string, number>>(window.map((d) => [d, new Map()]));
  const readCategories = new Set<string>();
  for (const h of history) {
    const article = byId.get(h.news_id);
    const bucket = counts.get(key(new Date(h.timestamp)));
    if (!article || !bucket) continue;
    readCategories.add(article.category);
    bucket.set(article.category, (bucket.get(article.category) ?? 0) + 1);
  }

  const plotted = [
    ...new Set([...readCategories, ...(getCustomProfile()?.preferred_categories ?? [])]),
  ].sort();

  return window.map((date) => {
    const bucket = counts.get(date)!;
    const point: Record<string, string | number> = { date };
    for (const c of plotted) point[c] = bucket.get(c) ?? 0;
    return point as unknown as InterestTrendPoint;
  });
}

async function customAnalytics(): Promise<AnalyticsData> {
  const history = getCustomHistory();
  const counts = await customCategoryCounts();
  const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;

  const trends = await customInterestTrends(14);
  const reading_activity = trends.map((point) => {
    const { date, ...rest } = point as unknown as Record<string, string | number>;
    return {
      date: String(date),
      count: Object.values(rest).reduce<number>((a, b) => a + Number(b || 0), 0),
    };
  });

  const days = new Map<string, number>();
  const hours = new Map<string, number>();
  for (const h of history) {
    const d = new Date(h.timestamp);
    const day = d.toLocaleDateString("en-US", { weekday: "long" });
    days.set(day, (days.get(day) ?? 0) + 1);
    const hour = d.getHours();
    const bucket = hour < 11 ? "8:00 AM" : hour < 15 ? "12:00 PM" : hour < 20 ? "6:00 PM" : "9:00 PM";
    hours.set(bucket, (hours.get(bucket) ?? 0) + 1);
  }
  const commonest = (m: Map<string, number>, fallback: string) =>
    [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;

  return {
    reading_activity,
    category_breakdown: [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        category: category as AnalyticsData["category_breakdown"][number]["category"],
        count,
        percent: Math.round((count / total) * 100),
      })),
    most_active_day: commonest(days, "—"),
    most_active_hour: commonest(hours, "—"),
    total_interactions: history.length,
    avg_reading_duration: 0,
  };
}

export async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  if (isCustomUser(userId)) return customDashboardStats();
  return withFallback(
    () => tryFetch<DashboardStats>(`/analytics/dashboard/${userId}`),
    () => getDashboardStats(userId)
  );
}

export async function fetchAnalytics(userId: string): Promise<AnalyticsData> {
  if (isCustomUser(userId)) return customAnalytics();
  return withFallback(
    () => tryFetch<AnalyticsData>(`/analytics/reading-behavior/${userId}`),
    () => getAnalyticsForUser(userId)
  );
}

export async function fetchInterestTrends(userId: string): Promise<InterestTrendPoint[]> {
  if (isCustomUser(userId)) return customInterestTrends();
  return withFallback(
    () => tryFetch<InterestTrendPoint[]>(`/analytics/interests/${userId}`),
    () => getInterestTrends(userId)
  );
}

export async function fetchTrendingTopics(): Promise<TrendingTopic[]> {
  return withFallback(
    () => tryFetch<TrendingTopic[]>("/analytics/trending"),
    () => getTrendingTopics()
  );
}

// ---------------- Model ----------------

export async function fetchModelStatus(): Promise<ModelStatus> {
  return withFallback(
    () => tryFetch<ModelStatus>("/model/status"),
    () => MODEL_STATUS
  );
}

export async function fetchModelMetrics(): Promise<ModelMetrics> {
  return withFallback(
    () => tryFetch<ModelMetrics>("/model/metrics"),
    () => MODEL_METRICS
  );
}

export async function fetchTrainingLossCurve() {
  return withFallback(
    () => tryFetch<ReturnType<typeof getTrainingLossCurve>>("/model/loss-curve"),
    () => getTrainingLossCurve()
  );
}
