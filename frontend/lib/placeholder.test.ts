import { describe, expect, it } from "vitest";
import { avatarFor, thumbnailFor } from "@/lib/placeholder";
import { photoFor } from "@/lib/photos";

const ARTICLE = { news_id: "N001", category: "Technology" };

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

  it("falls back to a neutral pool for unknown categories", () => {
    expect(() => photoFor({ news_id: "N1", category: "Nonexistent" })).not.toThrow();
  });
});
