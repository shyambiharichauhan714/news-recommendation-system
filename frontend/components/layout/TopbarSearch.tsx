"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, X, Layers, Hash, FileText } from "lucide-react";
import { useCatalog } from "@/lib/catalog-context";
import { cn, getCategoryColor } from "@/lib/utils";
import { useReader } from "@/lib/reader-context";
import { search } from "@/lib/search";
import type { NewsArticle } from "@/types";
import ArticleImage from "@/components/ui/ArticleImage";

const MAX_ARTICLES = 6;
const MAX_FACETS = 3;

/** A single keyboard-navigable row in the results panel. */
type Row =
  | { kind: "category"; label: string }
  | { kind: "topic"; label: string }
  | { kind: "article"; article: NewsArticle; matchedIn: string[] };

export default function TopbarSearch() {
  const router = useRouter();
  const { openArticle } = useReader();
  const { news } = useCatalog();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [shortcutHint, setShortcutHint] = useState("⌘K");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => search(news, query), [news, query]);

  // One flat list so arrow keys move through every kind of result in order.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const label of results.categories.slice(0, MAX_FACETS))
      out.push({ kind: "category", label });
    for (const label of results.topics.slice(0, MAX_FACETS))
      out.push({ kind: "topic", label });
    for (const h of results.hits.slice(0, MAX_ARTICLES))
      out.push({ kind: "article", article: h.article, matchedIn: h.matchedIn });
    return out;
  }, [results]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Cmd/Ctrl+K focuses search from anywhere; "/" does too, as long as you
  // aren't already typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Rendered after mount so the server markup doesn't bake in one platform.
  useEffect(() => {
    const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
    setShortcutHint(mac ? "⌘K" : "Ctrl K");
  }, []);

  useEffect(() => setActive(0), [query]);

  // Keep the highlighted row in view when arrowing past the panel edge.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-row="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const close = () => {
    setOpen(false);
    inputRef.current?.blur();
  };

  const seeAll = () => {
    if (!query.trim()) return;
    close();
    router.push(`/discover?q=${encodeURIComponent(query.trim())}`);
  };

  const choose = (row: Row) => {
    close();
    if (row.kind === "article") {
      setQuery("");
      openArticle(row.article);
    } else if (row.kind === "category") {
      router.push(`/discover?category=${encodeURIComponent(row.label)}`);
    } else {
      router.push(`/discover?q=${encodeURIComponent(row.label)}`);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && rows[active]) choose(rows[active]);
      else seeAll();
    } else if (e.key === "Escape") {
      close();
    }
  };

  const showPanel = open && results.terms.length > 0;
  const total = results.hits.length;

  // Section headers are rendered inline against the flat row list.
  const firstTopicIndex = results.categories.slice(0, MAX_FACETS).length;
  const firstArticleIndex =
    firstTopicIndex + results.topics.slice(0, MAX_FACETS).length;

  return (
    <div ref={wrapRef} className="flex-1 max-w-2xl relative hidden sm:block">
      <Search
        size={17}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
      />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search articles, topics, categories..."
        aria-label="Search articles"
        aria-expanded={showPanel}
        role="combobox"
        aria-controls="topbar-search-results"
        className="w-full h-12 pl-11 pr-20 rounded-2xl bg-white border border-surface-border text-sm placeholder:text-ink-400 shadow-soft focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400 transition-all"
      />
      {query && (
        <button
          onClick={() => {
            setQuery("");
            inputRef.current?.focus();
          }}
          aria-label="Clear search"
          className="absolute right-14 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
        >
          <X size={15} />
        </button>
      )}
      <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none select-none rounded-lg border border-surface-border bg-surface-muted px-2 py-1 text-[11px] font-medium text-ink-400">
        {shortcutHint}
      </kbd>

      {showPanel && (
        <div
          id="topbar-search-results"
          role="listbox"
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-2 card p-1.5 shadow-card-hover max-h-[70vh] overflow-y-auto scrollbar-thin z-30"
        >
          {rows.length === 0 ? (
            <p className="px-3 py-6 text-sm text-ink-400 text-center">
              Nothing matches &ldquo;{query.trim()}&rdquo;
            </p>
          ) : (
            <>
              {rows.map((row, i) => {
                const isActive = i === active;
                const header =
                  i === 0 && row.kind === "category"
                    ? "Categories"
                    : i === firstTopicIndex && row.kind === "topic"
                    ? "Topics"
                    : i === firstArticleIndex && row.kind === "article"
                    ? `Articles (${total})`
                    : null;

                return (
                  <div key={`${row.kind}-${i}`}>
                    {header && (
                      <p className="px-2.5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                        {header}
                      </p>
                    )}
                    <button
                      data-row={i}
                      role="option"
                      aria-selected={isActive}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(row)}
                      className={cn(
                        "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors",
                        isActive ? "bg-surface-muted" : "hover:bg-surface-muted"
                      )}
                    >
                      {row.kind === "article" ? (
                        <>
                          <ArticleImage
                            article={row.article}
                            width={120}
                            height={120}
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-ink-900 truncate">
                              {row.article.title}
                            </span>
                            <span
                              className={cn(
                                "block text-[11px] mt-0.5",
                                getCategoryColor(row.article.category).text
                              )}
                            >
                              {row.article.category} · {row.article.read_time_minutes} min
                              {row.matchedIn.length > 0 && (
                                <span className="text-ink-400">
                                  {" "}
                                  · matched {row.matchedIn.slice(0, 2).join(", ")}
                                </span>
                              )}
                            </span>
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                              row.kind === "category"
                                ? getCategoryColor(row.label).bg
                                : "bg-surface-muted"
                            )}
                          >
                            {row.kind === "category" ? (
                              <Layers
                                size={16}
                                className={getCategoryColor(row.label).text}
                              />
                            ) : (
                              <Hash size={16} className="text-ink-400" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-ink-900 truncate">
                              {row.label}
                            </span>
                            <span className="block text-[11px] text-ink-400 mt-0.5">
                              {row.kind === "category"
                                ? "Browse this category"
                                : "Browse this topic"}
                            </span>
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}

              <button
                onClick={seeAll}
                className="w-full flex items-center justify-between gap-2 px-3 py-2.5 mt-1 border-t border-surface-border text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <span className="flex items-center gap-1.5">
                  <FileText size={13} />
                  See all {total} {total === 1 ? "result" : "results"} for &ldquo;
                  {query.trim()}&rdquo;
                </span>
                <CornerDownLeft size={13} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
