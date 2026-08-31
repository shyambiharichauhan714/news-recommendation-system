"use client";

// Shared news + user catalog, loaded once from the API.
//
// Several surfaces need to resolve an article or a user by id outside of any
// single page's fetch: the topbar search, the article reader modal, the
// persona switcher. Before this they each reached into lib/mock-data directly,
// which meant that even with the FastAPI backend running you could search a
// mock catalog and open mock article text.
//
// services/api already falls back to the demo dataset when the backend is
// unreachable, so this keeps working in frontend-only mode — the difference is
// that when the backend IS up, these surfaces show real data.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { fetchNews, fetchDemoUsers } from "@/services/api";
import type { NewsArticle, User } from "@/types";

interface CatalogContextValue {
  news: NewsArticle[];
  users: User[];
  newsById: (id: string) => NewsArticle | undefined;
  userById: (id: string) => User | undefined;
  /** False until the first load resolves. */
  ready: boolean;
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchNews(), fetchDemoUsers()]).then(([newsRes, usersRes]) => {
      if (cancelled) return;
      setNews(newsRes);
      setUsers(usersRes);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<CatalogContextValue>(() => {
    const newsIndex = new Map(news.map((n) => [n.news_id, n]));
    const userIndex = new Map(users.map((u) => [u.id, u]));
    return {
      news,
      users,
      newsById: (id) => newsIndex.get(id),
      userById: (id) => userIndex.get(id),
      ready,
    };
  }, [news, users, ready]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
