"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal } from "lucide-react";
import { useReader } from "@/lib/reader-context";
import { useCatalog } from "@/lib/catalog-context";
import { searchArticles } from "@/lib/search";
import type { Category, NewsArticle } from "@/types";
import NewsCard from "@/components/ui/NewsCard";
import { CardGridSkeleton, EmptyState } from "@/components/ui/States";
import { cn, getCategoryColor } from "@/lib/utils";

type SortMode = "latest" | "trending";

function DiscoverContent() {
  const searchParams = useSearchParams();
  const { openArticle } = useReader();
  const { news, ready } = useCatalog();
  const loading = !ready;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "All">("All");
  const [sort, setSort] = useState<SortMode>("latest");

  // Categories come from the catalog itself, so the chips always match what
  // the API actually serves rather than a hardcoded list.
  const categories = useMemo<Category[]>(
    () => [...new Set(news.map((n) => n.category))].sort() as Category[],
    [news]
  );

  // Seed the filters from the URL so links like /discover?category=Technology
  // or ?q=Robotics (from the dashboard, trending list, or topbar search)
  // arrive with the right view already applied.
  useEffect(() => {
    const q = searchParams.get("q");
    const cat = searchParams.get("category");
    setQuery(q ?? "");
    setCategory(cat && (categories as string[]).includes(cat) ? (cat as Category) : "All");
  }, [searchParams, categories]);

  // ?article=<news_id> opens the reader directly, so links into Discover can
  // point at a specific story instead of just a filtered list.
  useEffect(() => {
    const id = searchParams.get("article");
    if (id && news.length) openArticle(id);
    // Intentionally keyed on the id + catalog arrival only: re-running on
    // openArticle identity would reopen the modal after the user closes it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, news.length]);

  const filtered = useMemo(() => {
    // Same engine as the topbar, so a query typed there and a query typed here
    // return an identical set — multi-word, and matching title, topic,
    // category, author, description and article text.
    let list = query.trim() ? searchArticles(news, query) : news;
    if (category !== "All") list = list.filter((n) => n.category === category);

    // Relevance order is the point of a search; only re-sort when browsing.
    if (!query.trim()) {
      list = [...list].sort(
        (a, b) =>
          +new Date(b.published_at) - +new Date(a.published_at) ||
          (sort === "trending" ? a.read_time_minutes - b.read_time_minutes : 0)
      );
    }
    return list;
  }, [news, category, query, sort]);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">Discover</h1>
        <p className="text-ink-500 mt-1">
          Browse all {news.length || "..."} articles across every category.
          {!loading && filtered.length !== news.length && ` Showing ${filtered.length}.`}
        </p>
      </motion.div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, topic, or keyword..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-surface-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400"
          />
        </div>
        <div className="flex items-center gap-2 bg-white border border-surface-border rounded-xl p-1">
          <SlidersHorizontal size={14} className="text-ink-400 ml-2" />
          {(["latest", "trending"] as SortMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSort(mode)}
              className={cn(
                "px-3.5 py-2 rounded-lg text-sm font-medium capitalize transition-colors",
                sort === mode ? "bg-brand-gradient text-white" : "text-ink-500 hover:text-ink-900"
              )}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <FilterChip label="All" active={category === "All"} onClick={() => setCategory("All")} />
        {categories.map((cat) => (
          <FilterChip key={cat} label={cat} active={category === cat} onClick={() => setCategory(cat)} />
        ))}
      </div>

      {loading ? (
        <CardGridSkeleton count={8} />
      ) : filtered.length === 0 ? (
        <EmptyState title="No articles found" description="Try a different search term or category." />
      ) : (
        <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))]">
          {filtered.map((a) => (
            <NewsCard key={a.news_id} article={a} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<CardGridSkeleton count={8} />}>
      <DiscoverContent />
    </Suspense>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  const colors = label !== "All" ? getCategoryColor(label) : null;
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors",
        active
          ? "bg-brand-gradient text-white border-transparent"
          : "bg-white text-ink-600 border-surface-border hover:bg-surface-muted"
      )}
    >
      {label}
    </button>
  );
}
