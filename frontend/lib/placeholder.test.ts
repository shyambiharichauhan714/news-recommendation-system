import { describe, expect, it } from "vitest";
import { avatarFor, thumbnailFor } from "@/lib/placeholder";
import { photoFor, PHOTO_TOPICS } from "@/lib/photos";

const ARTICLE = { news_id: "N001", category: "Technology", subcategory: "Semiconductors" };

describe("thumbnailFor", () => {
  it("returns an inline SVG data URI that needs no network", () => {
    const uri = thumbnailFor(ARTICLE);
    expect(uri.startsWith("data:image/svg+xml,")).toBe(true);

    // The only http reference an inline SVG may carry is the XML namespace,
    // which is a spec literal and never fetched. Anything else would mean the
    // "offline" fallback still depends on a remote host.
    const svg = decodeURIComponent(uri.replace("data:image/svg+xml,", ""));
    const remoteRefs = [...svg.matchAll(/https?:\/\/[^\s"']+/g)].map((m) => m[0]);
    expect(remoteRefs).toEqual(["http://www.w3.org/2000/svg"]);
  });

  it("is deterministic for the same article", () => {
    expect(thumbnailFor(ARTICLE)).toBe(thumbnailFor({ ...ARTICLE }));
  });

  it("varies across articles so a grid does not look repetitive", () => {
    const a = thumbnailFor({ news_id: "N001", category: "Technology" });
    const b = thumbnailFor({ news_id: "N042", category: "Technology" });
    expect(a).not.toBe(b);
  });

  it("tints by category", () => {
    const tech = thumbnailFor({ news_id: "N001", category: "Technology" });
    const health = thumbnailFor({ news_id: "N001", category: "Health" });
    expect(tech).not.toBe(health);
  });

  it("decodes to well-formed SVG", () => {
    const svg = decodeURIComponent(thumbnailFor(ARTICLE).replace("data:image/svg+xml,", ""));
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("viewBox");
  });

  it("handles an unknown category without throwing", () => {
    expect(() => thumbnailFor({ news_id: "N1", category: "Not A Real Category" })).not.toThrow();
  });
});

describe("avatarFor", () => {
  it("renders the person's initials", () => {
    const svg = decodeURIComponent(avatarFor({ id: "U001", name: "Shyam Chauhan" }));
    expect(svg).toContain("SC");
  });

  it("uses at most two initials", () => {
    const svg = decodeURIComponent(avatarFor({ id: "U9", name: "One Two Three Four" }));
    expect(svg).toContain(">OT<");
  });

  it("is deterministic per user", () => {
    const user = { id: "U001", name: "Shyam Chauhan" };
    expect(avatarFor(user)).toBe(avatarFor({ ...user }));
  });

  it("copes with a single-word name", () => {
    expect(() => avatarFor({ id: "U1", name: "Cher" })).not.toThrow();
  });
});

describe("photoFor", () => {
  it("builds a direct Unsplash CDN url", () => {
    const url = photoFor(ARTICLE);
    expect(url.startsWith("https://images.unsplash.com/photo-")).toBe(true);
    expect(url).toContain("w=600");
    expect(url).toContain("h=400");
  });

  it("is deterministic per article", () => {
    expect(photoFor(ARTICLE)).toBe(photoFor({ ...ARTICLE }));
  });

  it("respects requested dimensions", () => {
    const url = photoFor(ARTICLE, 120, 120);
    expect(url).toContain("w=120");
    expect(url).toContain("h=120");
  });

  it("falls back without throwing for an unmapped topic", () => {
    expect(() =>
      photoFor({ news_id: "N1", category: "Nope", subcategory: "Not A Topic" })
    ).not.toThrow();
  });

  it("gives every article in a topic a different photo", () => {
    // Each topic holds exactly three articles, which is why each has three
    // photos. If two collide, a grid shows the same picture twice — the exact
    // complaint that motivated keying by topic instead of category.
    for (const [topic, photos] of Object.entries(PHOTO_TOPICS)) {
      expect(new Set(photos).size, `${topic} has a repeated photo`).toBe(3);
    }
  });

  it("uses no photo twice across the whole catalog", () => {
    const all = Object.values(PHOTO_TOPICS).flat();
    expect(new Set(all).size, "a photo is shared between topics").toBe(all.length);
  });

  it("covers 31 topics with 93 photos", () => {
    const all = Object.values(PHOTO_TOPICS).flat();
    expect(Object.keys(PHOTO_TOPICS)).toHaveLength(31);
    expect(all).toHaveLength(93);
  });

  it("distinguishes articles that share a category but not a topic", () => {
    const a = photoFor({ news_id: "N010", category: "Technology", subcategory: "Semiconductors" });
    const b = photoFor({ news_id: "N010", category: "Technology", subcategory: "Cybersecurity" });
    expect(a).not.toBe(b);
  });

  it("assigns a different photo to each of a topic's three articles", () => {
    // Asserting the *pool* holds three distinct photos is not enough: the
    // selection has to land on all three. An earlier hash-based version passed
    // the pool check while collapsing two articles onto one photo.
    for (const topic of Object.keys(PHOTO_TOPICS)) {
      const urls = ["N010", "N011", "N012"].map((news_id) =>
        photoFor({ news_id, category: "x", subcategory: topic })
      );
      expect(new Set(urls).size, `${topic} reused a photo across its articles`).toBe(3);
    }
  });

  it("assigns 93 distinct photos across a full 31-topic catalog", () => {
    // Mirrors the real dataset: topics are generated three articles at a time
    // with consecutive ids.
    const urls: string[] = [];
    Object.keys(PHOTO_TOPICS).forEach((topic, t) => {
      for (let i = 0; i < 3; i++) {
        urls.push(photoFor({ news_id: `N${t * 3 + i + 1}`, category: "x", subcategory: topic }));
      }
    });
    expect(urls).toHaveLength(93);
    expect(new Set(urls).size).toBe(93);
  });
});
