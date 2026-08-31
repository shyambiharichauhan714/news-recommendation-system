import { describe, expect, it } from "vitest";
import { search, searchArticles, tokenize } from "@/lib/search";
import type { NewsArticle } from "@/types";

/** Minimal fixtures — enough to exercise every field the matcher scores. */
function article(overrides: Partial<NewsArticle> & { news_id: string }): NewsArticle {
  return {
    title: "Untitled",
    description: "",
    content: "",
    category: "Technology",
    subcategory: "Gadgets",
    image_url: "",
    author: "Anon Writer",
    published_at: "2026-08-01T00:00:00Z",
    read_time_minutes: 4,
    ...overrides,
  } as NewsArticle;
}

const CATALOG: NewsArticle[] = [
  article({
    news_id: "N1",
    title: "Robotics Meets AI: The Next Frontier",
    category: "AI & Machine Learning",
    subcategory: "Robotics",
    description: "Automation across factories",
    content: "A pivotal moment for warehouse robots.",
    author: "Lucy Grant",
  }),
  article({
    news_id: "N2",
    title: "Humanoid Robots Take on Logistics",
    category: "AI & Machine Learning",
    subcategory: "Robotics",
    description: "Warehouses adopt humanoids",
    content: "Deployment is accelerating.",
    author: "Tom Becker",
  }),
  article({
    news_id: "N3",
    title: "Telehealth Platforms Add Symptom Triage",
    category: "Health",
    subcategory: "Digital Health",
    description: "Clinics expand access",
    content: "Patients report shorter waits.",
    author: "Lucy Grant",
  }),
  article({
    news_id: "N4",
    title: "Quantum Computing Milestone",
    category: "Science",
    subcategory: "Physics",
    description: "Error correction advances",
    content: "Researchers describe a pivotal moment.",
    author: "Ana Silva",
  }),
];

describe("tokenize", () => {
  it("splits on punctuation and drops single characters", () => {
    expect(tokenize("AI, robotics & a")).toEqual(["ai", "robotics"]);
  });

  it("returns nothing for empty or trivial input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
    expect(tokenize("a")).toEqual([]);
  });
});

describe("search", () => {
  it("finds a single term across titles", () => {
    const ids = searchArticles(CATALOG, "robots").map((a) => a.news_id);
    expect(ids).toContain("N2");
  });

  it("handles multi-word queries where no single field holds the whole string", () => {
    // The regression this whole module exists for: the old substring matcher
    // returned nothing here.
    const ids = searchArticles(CATALOG, "ai robotics").map((a) => a.news_id);
    expect(ids).toEqual(expect.arrayContaining(["N1", "N2"]));
    expect(ids).not.toContain("N3");
  });

  it("requires every term to match somewhere", () => {
    expect(searchArticles(CATALOG, "robotics telehealth")).toHaveLength(0);
  });

  it("searches the author field", () => {
    const ids = searchArticles(CATALOG, "Lucy Grant").map((a) => a.news_id);
    expect(ids.sort()).toEqual(["N1", "N3"]);
  });

  it("searches article body text", () => {
    const ids = searchArticles(CATALOG, "pivotal moment").map((a) => a.news_id);
    expect(ids.sort()).toEqual(["N1", "N4"]);
  });

  it("searches category and subcategory", () => {
    expect(searchArticles(CATALOG, "health").map((a) => a.news_id)).toContain("N3");
    expect(searchArticles(CATALOG, "physics").map((a) => a.news_id)).toContain("N4");
  });

  it("ranks a title match above a body-text match", () => {
    const hits = search(CATALOG, "robotics").hits;
    expect(hits[0].article.news_id).toBe("N1");
    expect(hits[0].score).toBeGreaterThan(hits[hits.length - 1].score);
  });

  it("reports which fields matched", () => {
    const hit = search(CATALOG, "telehealth").hits[0];
    expect(hit.matchedIn).toContain("title");
  });

  it("surfaces matching categories and topics as facets", () => {
    const { categories, topics } = search(CATALOG, "health");
    expect(categories).toContain("Health");
    expect(topics).toContain("Digital Health");
  });

  it("returns empty results for a blank query rather than the whole catalog", () => {
    expect(search(CATALOG, "").hits).toHaveLength(0);
    expect(search(CATALOG, "  ").hits).toHaveLength(0);
  });

  it("is case insensitive", () => {
    expect(searchArticles(CATALOG, "ROBOTICS").length).toBe(
      searchArticles(CATALOG, "robotics").length
    );
  });

  it("orders equal scores by recency", () => {
    const catalog = [
      article({ news_id: "OLD", title: "Same Title", published_at: "2026-01-01T00:00:00Z" }),
      article({ news_id: "NEW", title: "Same Title", published_at: "2026-08-01T00:00:00Z" }),
    ];
    expect(searchArticles(catalog, "same title")[0].news_id).toBe("NEW");
  });
});
