"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import type { TrendingTopic } from "@/types";
import { cn, getCategoryColor } from "@/lib/utils";

export default function TrendingTopics({ topics }: { topics: TrendingTopic[] }) {
  if (topics.length === 0) {
    return (
      <div className="card p-5">
        <p className="text-sm text-ink-400 text-center py-6">No trending topics right now.</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <div className="space-y-1">
        {topics.map((t, i) => {
          const colors = getCategoryColor(t.category);
          const up = t.growth_percent >= 0;
          return (
            <Link
              key={t.topic}
              href={`/discover?q=${encodeURIComponent(t.topic)}`}
              className="group flex items-center gap-3 py-2.5 border-b border-surface-border last:border-0 -mx-2 px-2 rounded-lg hover:bg-surface-muted transition-colors"
            >
              <span className="w-6 text-sm font-bold text-ink-400 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={cn("w-2 h-2 rounded-full shrink-0", colors.dot)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-900 truncate group-hover:text-brand-600 transition-colors">
                  {t.topic}
                </p>
                <p className="text-xs text-ink-400">{t.read_count.toLocaleString()} reads</p>
              </div>
              <span
                className={cn(
                  "flex items-center gap-0.5 text-xs font-semibold shrink-0",
                  up ? "text-emerald-600" : "text-rose-500"
                )}
              >
                {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {Math.abs(t.growth_percent)}%
              </span>
              <ArrowUpRight
                size={14}
                className="text-ink-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
