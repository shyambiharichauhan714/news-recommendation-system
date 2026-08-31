// Shared search used by both the topbar and the Discover page.
//
// The previous implementation matched the raw query as one substring against a
// few fields, so "ai robotics" found nothing (no single field contains that
// exact string) and content/author were never searched at all. This tokenises
// the query and requires every term to match somewhere in the article, scoring
// by which field it hit — so results are complete without becoming noise.

import type { NewsArticle } from "@/types";

export interface SearchHit {
  article: NewsArticle;
  score: number;
  /** Fields the query matched, for the "why did this match" hint in the UI. */
  matchedIn: string[];
}

export interface SearchResults {
  hits: SearchHit[];
  /** Category names matching the query — offered as a filter jump. */
  categories: string[];
  /** Subcategories (topics) matching the query. */
  topics: string[];
  terms: string[];
}

/** Field weights, highest first. A term hitting several fields sums them. */
const WEIGHTS = {
  titleStart: 120,
  title: 80,
  subcategory: 60,
  category: 50,
  author: 30,
  description: 22,
  content: 8,
} as const;

export function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function scoreArticle(a: NewsArticle, terms: string[]): SearchHit | null {
  const title = a.title.toLowerCase();
  const subcategory = a.subcategory.toLowerCase();
  const category = a.category.toLowerCase();
  const author = a.author.toLowerCase();
  const description = a.description.toLowerCase();
  const content = a.content.toLowerCase();

  let total = 0;
  const matchedIn = new Set<string>();

  for (const term of terms) {
    let termScore = 0;
    if (title.startsWith(term)) {
      termScore += WEIGHTS.titleStart;
      matchedIn.add("title");
    } else if (title.includes(term)) {
      termScore += WEIGHTS.title;
      matchedIn.add("title");
    }
    if (subcategory.includes(term)) {
      termScore += WEIGHTS.subcategory;
      matchedIn.add("topic");
    }
    if (category.includes(term)) {
      termScore += WEIGHTS.category;
      matchedIn.add("category");
    }
    if (author.includes(term)) {
      termScore += WEIGHTS.author;
      matchedIn.add("author");
    }
    if (description.includes(term)) {
      termScore += WEIGHTS.description;
      matchedIn.add("description");
    }
    if (content.includes(term)) {
      termScore += WEIGHTS.content;
      matchedIn.add("article text");
    }

    // Every term has to land somewhere, otherwise a two-word query would
    // return everything that matched only its most common word.
    if (termScore === 0) return null;
    total += termScore;
  }

  return { article: a, score: total, matchedIn: [...matchedIn] };
}

export function search(catalog: NewsArticle[], query: string): SearchResults {
  const terms = tokenize(query);
  if (!terms.length) return { hits: [], categories: [], topics: [], terms };

  const hits: SearchHit[] = [];
  for (const a of catalog) {
    const hit = scoreArticle(a, terms);
    if (hit) hits.push(hit);
  }

  // Ties fall back to most recent so the ordering is never arbitrary.
  hits.sort(
    (x, y) =>
      y.score - x.score ||
      +new Date(y.article.published_at) - +new Date(x.article.published_at)
  );

  const categories = [...new Set(catalog.map((a) => a.category))]
    .filter((c) => terms.some((t) => c.toLowerCase().includes(t)))
    .sort();

  const topics = [...new Set(catalog.map((a) => a.subcategory))]
    .filter((s) => terms.some((t) => s.toLowerCase().includes(t)))
    .sort();

  return { hits, categories, topics, terms };
}

/** Convenience for callers that only need the ranked articles. */
export function searchArticles(catalog: NewsArticle[], query: string): NewsArticle[] {
  return search(catalog, query).hits.map((h) => h.article);
}
