"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, RefreshCw, BrainCircuit, Cpu } from "lucide-react";
import { useActiveUser } from "@/lib/user-context";
import { fetchRecommendations, fetchModelStatus } from "@/services/api";
import type { ModelStatus, RecommendedArticle } from "@/types";
import NewsCard from "@/components/ui/NewsCard";
import { CardGridSkeleton, EmptyState } from "@/components/ui/States";
import { cn, timeAgo } from "@/lib/utils";

const TOP_N = 12;

export default function ForYouPage() {
  const { activeUserId } = useActiveUser();
  const [recs, setRecs] = useState<RecommendedArticle[]>([]);
  const [model, setModel] = useState<ModelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<string>("All");

  const load = async () => {
    const data = await fetchRecommendations(activeUserId, TOP_N);
    setRecs(data);
  };

  useEffect(() => {
    setLoading(true);
    setCategory("All");
    Promise.all([load(), fetchModelStatus().then(setModel)]).finally(() =>
      setLoading(false)
    );
  }, [activeUserId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // NewsCard records the read itself; this just refreshes the ranking so
  // recommendations update as the sequence changes (Section 16).
  const handleRead = () => {
    load();
  };

  // Filter chips are derived from what the model actually returned, so they
  // never offer a category with zero results.
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recs) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [recs]);

  const visible = useMemo(
    () => (category === "All" ? recs : recs.filter((r) => r.category === category)),
    [recs, category]
  );

  const topMatch = recs.length ? Math.max(...recs.map((r) => r.match_score)) : null;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="badge bg-brand-gradient-soft text-brand-700">
              <Sparkles size={12} />
              GRU-Powered
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight mt-2">
            For You
          </h1>
          <p className="text-ink-500 mt-1">
            Ranked by your predicted preference representation from recent reading sequences.
          </p>
        </div>
        <button onClick={handleRefresh} className="btn-secondary" disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </motion.div>

      {/* What actually produced this ranking. */}
      {model && (
        <div className="card p-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-2 font-medium text-ink-900">
            <BrainCircuit size={16} className="text-violet-500" />
            {model.model_name}
          </span>
          <span className="flex items-center gap-1.5 text-ink-500">
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                model.status === "Active" ? "bg-emerald-500" : "bg-amber-500"
              )}
            />
            {model.status} · {model.version}
          </span>
          <span className="flex items-center gap-1.5 text-ink-500">
            <Cpu size={14} />
            {model.device} · seq {model.sequence_length} · dim {model.embedding_dim}
          </span>
          <span className="text-ink-400 text-xs">
            Trained {timeAgo(model.last_trained)}
          </span>
          {topMatch !== null && (
            <span className="ml-auto badge bg-brand-50 text-brand-700">
              Top match {topMatch}%
            </span>
          )}
        </div>
      )}

      {!loading && categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <FilterChip
            label="All"
            count={recs.length}
            active={category === "All"}
            onClick={() => setCategory("All")}
          />
          {categories.map(([cat, count]) => (
            <FilterChip
              key={cat}
              label={cat}
              count={count}
              active={category === cat}
              onClick={() => setCategory(cat)}
            />
          ))}
        </div>
      )}

      {loading ? (
        <CardGridSkeleton count={8} />
      ) : visible.length === 0 ? (
        <EmptyState
          title="No recommendations yet"
          description="Read a few articles on Discover to help the GRU model learn your interests."
        />
      ) : (
        <div className="grid gap-5 grid-cols-[repeat(auto-fit,minmax(min(260px,100%),1fr))]">
          {visible.map((a) => (
            <NewsCard key={a.news_id} article={a} onRead={handleRead} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
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
      <span className={cn("ml-1.5", active ? "text-white/70" : "text-ink-400")}>{count}</span>
    </button>
  );
}
