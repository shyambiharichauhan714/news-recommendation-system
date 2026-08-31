"use client";

// Client-side activity store for reads and bookmarks.
//
// In demo mode the backend is optional, so interactions have to survive
// locally for the UI to feel real: reading an article must bump the
// "Total News Read" KPI and appear in "Recently Read", and a bookmark must
// still be there after a reload. Activity is namespaced per demo user so
// switching personas on the Profile page swaps the whole picture.
//
// Every mutation also fires postInteraction(), so once the FastAPI backend
// is running the same actions are recorded server-side too.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useActiveUser } from "@/lib/user-context";
import { postInteraction } from "@/services/api";

export interface ReadEntry {
  news_id: string;
  at: string; // ISO timestamp
}

interface UserActivity {
  reads: ReadEntry[]; // most recent first
  bookmarks: string[]; // most recent first
}

type ActivityMap = Record<string, UserActivity>;

interface ActivityContextValue {
  /** Reads recorded in this browser, most recent first. */
  reads: ReadEntry[];
  /** Bookmarked news ids, most recent first. */
  bookmarks: string[];
  isBookmarked: (newsId: string) => boolean;
  isRead: (newsId: string) => boolean;
  toggleBookmark: (newsId: string) => void;
  markRead: (newsId: string) => void;
  clearActivity: () => void;
  /** False until localStorage has been read — guards against hydration mismatch. */
  hydrated: boolean;
}

const STORAGE_KEY = "newsmind_activity_v1";
const EMPTY: UserActivity = { reads: [], bookmarks: [] };

const ActivityContext = createContext<ActivityContextValue | undefined>(undefined);

function readStorage(): ActivityMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActivityMap) : {};
  } catch {
    return {};
  }
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { activeUserId } = useActiveUser();
  const [map, setMap] = useState<ActivityMap>({});
  const [hydrated, setHydrated] = useState(false);

  // Load once on mount. Runs after the server-rendered pass, so the first
  // client render still matches the server output.
  useEffect(() => {
    setMap(readStorage());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: ActivityMap) => {
    setMap(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode / blocked) — keep in-memory state.
    }
  }, []);

  const current = map[activeUserId] ?? EMPTY;

  const update = useCallback(
    (fn: (a: UserActivity) => UserActivity) => {
      setMap((prev) => {
        const next = { ...prev, [activeUserId]: fn(prev[activeUserId] ?? EMPTY) };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [activeUserId]
  );

  const markRead = useCallback(
    (newsId: string) => {
      update((a) => ({
        ...a,
        // Re-reading moves the article back to the top rather than duplicating.
        reads: [
          { news_id: newsId, at: new Date().toISOString() },
          ...a.reads.filter((r) => r.news_id !== newsId),
        ],
      }));
      void postInteraction(activeUserId, newsId, "read");
    },
    [activeUserId, update]
  );

  const toggleBookmark = useCallback(
    (newsId: string) => {
      update((a) => ({
        ...a,
        bookmarks: a.bookmarks.includes(newsId)
          ? a.bookmarks.filter((b) => b !== newsId)
          : [newsId, ...a.bookmarks],
      }));
      void postInteraction(activeUserId, newsId, "bookmark");
    },
    [activeUserId, update]
  );

  const clearActivity = useCallback(() => {
    persist({ ...map, [activeUserId]: EMPTY });
  }, [map, activeUserId, persist]);

  const value = useMemo<ActivityContextValue>(
    () => ({
      reads: current.reads,
      bookmarks: current.bookmarks,
      isBookmarked: (id) => current.bookmarks.includes(id),
      isRead: (id) => current.reads.some((r) => r.news_id === id),
      toggleBookmark,
      markRead,
      clearActivity,
      hydrated,
    }),
    [current, toggleBookmark, markRead, clearActivity, hydrated]
  );

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>;
}

export function useActivity() {
  const ctx = useContext(ActivityContext);
  if (!ctx) throw new Error("useActivity must be used within ActivityProvider");
  return ctx;
}
