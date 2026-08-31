"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Clock, Bookmark, User as UserIcon, Calendar } from "lucide-react";
import type { NewsArticle, RecommendedArticle } from "@/types";
import { cn, formatDate, getCategoryColor } from "@/lib/utils";
import { useActivity } from "@/lib/activity-context";
import ArticleImage from "@/components/ui/ArticleImage";

interface ArticleModalProps {
  article: NewsArticle | RecommendedArticle | null;
  onClose: () => void;
}

function matchScore(a: NewsArticle | RecommendedArticle): number | null {
  const score = (a as RecommendedArticle).match_score;
  return typeof score === "number" ? score : null;
}

export default function ArticleModal({ article, onClose }: ArticleModalProps) {
  const { isBookmarked, toggleBookmark } = useActivity();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Escape to close, and lock background scroll while open.
  useEffect(() => {
    if (!article) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [article, onClose]);

  // Unmount entirely when closed. An always-rendered overlay (even at
  // opacity 0) would sit on top of the dashboard and swallow every click.
  if (!article) return null;

  const saved = isBookmarked(article.news_id);
  const score = matchScore(article);
  const colors = getCategoryColor(article.category);

  // The stored content opens with the headline and a "By <author>" line, both
  // of which the header above already renders — so they'd appear twice. Drop
  // them from the front only, leaving any later occurrence in the body intact.
  const bodyParagraphs = article.content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  while (
    bodyParagraphs.length &&
    (bodyParagraphs[0] === article.title.trim() || /^By\s/i.test(bodyParagraphs[0]))
  ) {
    bodyParagraphs.shift();
  }

  return (
    // Scrolling lives on this outer element and the centring on the inner
    // wrapper. Doing both on one flex container clips the top of a panel
    // taller than the viewport — the overflow lands above the scroll origin
    // and simply cannot be reached. `min-h-full` keeps short articles centred.
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={article.title}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative flex min-h-full items-start sm:items-center justify-center p-0 sm:p-6">
      <motion.article
        key={article.news_id}
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative w-full max-w-2xl bg-surface-card sm:rounded-xl2 shadow-card-hover overflow-hidden"
      >
            <div className="relative aspect-[16/9] bg-surface-muted">
              <ArticleImage
                article={article}
                eager
                width={1200}
                height={675}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 to-transparent" />

              <button
                ref={closeRef}
                onClick={onClose}
                aria-label="Close article"
                className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-white/95 backdrop-blur-sm flex items-center justify-center text-ink-700 hover:bg-white transition-colors"
              >
                <X size={17} />
              </button>

              <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
                <span className={cn("badge bg-white/95 backdrop-blur-sm", colors.text)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />
                  {article.category}
                </span>
                {score !== null && (
                  <span className="badge bg-navy-900/85 backdrop-blur-sm text-white">
                    {score}% match
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 sm:p-7">
              <h2 className="text-xl sm:text-2xl font-bold text-ink-900 tracking-tight leading-snug">
                {article.title}
              </h2>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-400">
                <span className="flex items-center gap-1.5">
                  <UserIcon size={13} />
                  {article.author}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  {formatDate(article.published_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={13} />
                  {article.read_time_minutes} min read
                </span>
              </div>

              <p className="mt-5 text-[15px] text-ink-700 leading-relaxed font-medium">
                {article.description}
              </p>

              <div className="mt-4 space-y-4 text-[15px] text-ink-500 leading-relaxed">
                {bodyParagraphs.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>

              <div className="mt-7 pt-5 border-t border-surface-border flex items-center gap-3">
                <button
                  onClick={() => toggleBookmark(article.news_id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                    saved
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-surface-border text-ink-700 hover:bg-surface-muted"
                  )}
                >
                  <Bookmark size={15} className={saved ? "fill-brand-500 text-brand-500" : ""} />
                  {saved ? "Saved" : "Save for later"}
                </button>
                <button onClick={onClose} className="btn-secondary text-sm py-2">
                  Close
                </button>
                <span className="ml-auto badge bg-emerald-50 text-emerald-600">
                  Marked as read
                </span>
              </div>
        </div>
      </motion.article>
      </div>
    </div>
  );
}
