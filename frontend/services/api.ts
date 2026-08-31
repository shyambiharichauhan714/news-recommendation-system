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
  return withFallback(
    () => tryFetch<UserInteraction[]>(`/users/${userId}/history`),
    () => buildInteractionsForUser(userId)
  );
}

export async function fetchUserPreferences(userId: string): Promise<UserPreferences> {
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

export async function fetchRecommendations(userId: string, topN = 5): Promise<RecommendedArticle[]> {
  return withFallback(
    () => tryFetch<RecommendedArticle[]>(`/recommendations/${userId}?top_n=${topN}`),
    () => getRecommendationsForUser(userId, topN)
  );
}

export async function fetchTopFive(userId: string): Promise<RecommendedArticle[]> {
  return withFallback(
    () => tryFetch<RecommendedArticle[]>(`/recommendations/${userId}/top-5`),
    () => getRecommendationsForUser(userId, 5)
  );
}

// ---------------- Analytics ----------------

export async function fetchDashboardStats(userId: string): Promise<DashboardStats> {
  return withFallback(
    () => tryFetch<DashboardStats>(`/analytics/dashboard/${userId}`),
    () => getDashboardStats(userId)
  );
}

export async function fetchAnalytics(userId: string): Promise<AnalyticsData> {
  return withFallback(
    () => tryFetch<AnalyticsData>(`/analytics/reading-behavior/${userId}`),
    () => getAnalyticsForUser(userId)
  );
}

export async function fetchInterestTrends(userId: string): Promise<InterestTrendPoint[]> {
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
