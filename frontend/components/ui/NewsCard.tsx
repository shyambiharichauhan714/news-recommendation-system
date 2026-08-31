"use client";

import { motion } from "framer-motion";
import { Bookmark, Clock, ArrowUpRight, Sparkles, Check } from "lucide-react";
import type { NewsArticle, RecommendedArticle } from "@/types";
import { cn, getCategoryColor, timeAgo } from "@/lib/utils";
import { useActivity } from "@/lib/activity-context";
import { useReader } from "@/lib/reader-context";
import ArticleImage from "@/components/ui/ArticleImage";

interface NewsCardProps {
  article: NewsArticle | RecommendedArticle;
  onRead?: (id: string) => void;
  onBookmark?: (id: string) => void;
  compact?: boolean;
}

function isRecommended(a: NewsArticle | RecommendedArticle): a is RecommendedArticle {
  return typeof (a as RecommendedArticle).match_score === "number";
}

export default function NewsCard({ article, onRead, onBookmark, compact }: NewsCardProps) {
  const { isBookmarked, toggleBookmark, isRead, hydrated } = useActivity();
  const { openArticle } = useReader();
  const colors = getCategoryColor(article.category);
  const rec = isRecommended(article) ? article : null;

  // Gate persisted state behind hydration so the server and first client
  // render produce identical markup.
  const saved = hydrated && isBookmarked(article.news_id);
  const read = hydrated && isRead(article.news_id);

  const handleBookmark = () => {
    toggleBookmark(article.news_id);
    onBookmark?.(article.news_id);
  };

  const handleRead = () => {
    openArticle(article);
    onRead?.(article.news_id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="card card-hover group overflow-hidden flex flex-col h-full"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-surface-muted">
        <button
          onClick={handleRead}
          aria-label={`Read ${article.title}`}
          className="absolute inset-0 w-full h-full"
        >
          <ArticleImage
            article={article}
            alt={article.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </button>

        <div className="absolute top-3 left-3 flex items-center gap-1.5 pointer-events-none">
          <span className={cn("badge bg-white/95 backdrop-blur-sm", colors.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />
            {article.category}
          </span>
        </div>
        {rec && (
          <div className="absolute top-3 right-3 pointer-events-none">
            <span className="badge bg-navy-900/90 backdrop-blur-sm text-white gap-1">
              <Sparkles size={11} className="text-brand-400" />
              {rec.match_score}% match
            </span>
          </div>
        )}
        {read && (
          <div className="absolute bottom-3 left-3 pointer-events-none">
            <span className="badge bg-emerald-500/95 backdrop-blur-sm text-white gap-1">
              <Check size={11} />
              Read
            </span>
          </div>
        )}
        <button
          onClick={handleBookmark}
          aria-label={saved ? "Remove bookmark" : "Bookmark article"}
          aria-pressed={saved}
          className="absolute bottom-3 right-3 w-8 h-8 rounded-lg bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-soft hover:scale-105 transition-transform"
        >
          <Bookmark
            size={15}
            className={saved ? "fill-brand-500 text-brand-500" : "text-ink-500"}
          />
        </button>
      </div>

      <div className={cn("flex flex-col flex-1", compact ? "p-4" : "p-5")}>
        {/* The clamp lives on the button, not the h3: line-clamp sets
            display:-webkit-box, which a child button would break out of. */}
        <h3 className={cn("font-semibold text-ink-900 leading-snug", compact ? "text-sm" : "text-[15px]")}>
          <button
            onClick={handleRead}
            className="text-left line-clamp-2 hover:text-brand-600 transition-colors"
          >
            {article.title}
          </button>
        </h3>
        {!compact && (
          <p className="mt-1.5 text-sm text-ink-500 line-clamp-2 leading-relaxed">
            {article.description}
          </p>
        )}

        {rec && (
          <p className="mt-2.5 text-xs text-brand-700 bg-brand-gradient-soft rounded-lg px-2.5 py-2 leading-relaxed line-clamp-3">
            {rec.reason}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between text-xs text-ink-400">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {article.read_time_minutes} min read
          </span>
          <span>{timeAgo(article.published_at)}</span>
        </div>

        <button
          onClick={handleRead}
          className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-surface-border text-sm font-medium text-ink-700 py-2 hover:bg-brand-gradient hover:text-white hover:border-transparent transition-all duration-150"
        >
          {read ? "Read again" : "Read Article"}
          <ArrowUpRight size={14} />
        </button>
      </div>
    </motion.div>
  );
}
