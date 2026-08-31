"use client";

// Global article reader. Any component — a news card, a search result, a
// "Recently Read" row — can call openArticle() to pop the full-article modal
// without each page having to own modal state. Opening an article records a
// read, which is what feeds the Total News Read KPI and the Recently Read rail.

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import type { NewsArticle, RecommendedArticle } from "@/types";
import { useCatalog } from "@/lib/catalog-context";
import { useActivity } from "@/lib/activity-context";
import ArticleModal from "@/components/ui/ArticleModal";

type Readable = NewsArticle | RecommendedArticle;

interface ReaderContextValue {
  /** Open the reader for an article object or a known news id. */
  openArticle: (article: Readable | string) => void;
  closeArticle: () => void;
  currentId: string | null;
}

const ReaderContext = createContext<ReaderContextValue | undefined>(undefined);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [article, setArticle] = useState<Readable | null>(null);
  const { markRead } = useActivity();
  const { newsById } = useCatalog();

  const openArticle = useCallback(
    (target: Readable | string) => {
      const resolved = typeof target === "string" ? newsById(target) : target;
      if (!resolved) return;
      setArticle(resolved);
      markRead(resolved.news_id);
    },
    [markRead, newsById]
  );

  const closeArticle = useCallback(() => setArticle(null), []);

  const value = useMemo<ReaderContextValue>(
    () => ({ openArticle, closeArticle, currentId: article?.news_id ?? null }),
    [openArticle, closeArticle, article]
  );

  return (
    <ReaderContext.Provider value={value}>
      {children}
      <ArticleModal article={article} onClose={closeArticle} />
    </ReaderContext.Provider>
  );
}

export function useReader() {
  const ctx = useContext(ReaderContext);
  if (!ctx) throw new Error("useReader must be used within ReaderProvider");
  return ctx;
}
