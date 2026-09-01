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
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { fetchNews, fetchDemoUsers } from "@/services/api";
import { CUSTOM_USER_ID, getCustomProfile, type CustomProfile } from "@/lib/custom-profile";
import type { NewsArticle, User } from "@/types";

interface CatalogContextValue {
  news: NewsArticle[];
  users: User[];
  newsById: (id: string) => NewsArticle | undefined;
  userById: (id: string) => User | undefined;
  /** The reader's own profile, if they have created one. */
  customProfile: CustomProfile | null;
  /** Re-reads the stored profile after it is created, edited or removed. */
  refreshCustomProfile: () => void;
  /** False until the first load resolves. */
  ready: boolean;
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [ready, setReady] = useState(false);
  const [customProfile, setCustomProfile] = useState<CustomProfile | null>(null);

  // Read after mount: localStorage does not exist during the server render,
  // and reading it inline would desynchronise the two.
  useEffect(() => setCustomProfile(getCustomProfile()), []);
  const refreshCustomProfile = useCallback(() => setCustomProfile(getCustomProfile()), []);

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

    // The reader's own profile is presented alongside the seeded personas, so
    // every surface that resolves a user by id finds it without special cases.
    const allUsers: User[] = customProfile
      ? [
          ...users,
          {
            id: CUSTOM_USER_ID,
            name: customProfile.name,
            email: "you@localhost",
            profile_image: "",
            preferred_language: "English",
            persona: customProfile.persona,
            created_at: customProfile.created_at,
          } as User,
        ]
      : users;
    const userIndex = new Map(allUsers.map((u) => [u.id, u]));

    return {
      news,
      users: allUsers,
      newsById: (id) => newsIndex.get(id),
      userById: (id) => userIndex.get(id),
      customProfile,
      refreshCustomProfile,
      ready,
    };
  }, [news, users, ready, customProfile, refreshCustomProfile]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
