// Locally generated artwork for article thumbnails and user avatars.
//
// The dataset ships picsum.photos URLs, which means every card depends on a
// third-party host being reachable. When it isn't, the requests hang rather
// than failing — no onError fires, so the cards just sit blank indefinitely.
//
// These generators return inline SVG data URIs instead: deterministic per
// article/user, themed to the category palette, and available offline with no
// request at all. They drop straight into an existing <img src>.

import { getCategoryColor } from "@/lib/utils";

/** Small deterministic hash so the same id always yields the same artwork. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function toDataUri(svg: string): string {
  // encodeURIComponent keeps this safe for every character SVG can contain;
  // base64 would also work but is bulkier and harder to eyeball in devtools.
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, " ").trim())}`;
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Abstract 3:2 thumbnail tinted by the article's category, with a blob layout
 * varied by news_id so a grid of cards doesn't look repetitive.
 */
export function thumbnailFor(article: {
  news_id: string;
  category: string;
}): string {
  const base = getCategoryColor(article.category).chart;
  const h = hash(article.news_id);
  const light = shade(base, 74);
  const dark = shade(base, -34);

  // Vary the composition across a few deterministic parameters.
  const cx = 30 + (h % 45);
  const cy = 25 + ((h >> 3) % 50);
  const r1 = 26 + ((h >> 6) % 22);
  const r2 = 14 + ((h >> 9) % 16);
  const angle = (h >> 12) % 180;
  const bars = 3 + ((h >> 15) % 3);

  const barRects = Array.from({ length: bars }, (_, i) => {
    const bh = 8 + ((h >> (i * 3)) % 26);
    return `<rect x="${64 + i * 9}" y="${86 - bh}" width="5" height="${bh}" rx="2.5" fill="#fff" opacity="${0.22 + i * 0.12}"/>`;
  }).join("");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 100" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} 0.5 0.5)">
      <stop offset="0%" stop-color="${light}"/>
      <stop offset="55%" stop-color="${base}"/>
      <stop offset="100%" stop-color="${dark}"/>
    </linearGradient>
  </defs>
  <rect width="150" height="100" fill="url(#g)"/>
  <circle cx="${cx}" cy="${cy}" r="${r1}" fill="#fff" opacity="0.14"/>
  <circle cx="${cx + 46}" cy="${cy + 30}" r="${r2}" fill="#fff" opacity="0.10"/>
  <circle cx="${150 - cx}" cy="${100 - cy}" r="${r2 + 10}" fill="${dark}" opacity="0.18"/>
  ${barRects}
</svg>`;

  return toDataUri(svg);
}

const AVATAR_PALETTE = [
  ["#6E8BFF", "#4A63FA"],
  ["#A78BFA", "#7C3AED"],
  ["#34D399", "#059669"],
  ["#FBBF24", "#D97706"],
  ["#F472B6", "#DB2777"],
  ["#22D3EE", "#0891B2"],
];

/** Initials on a deterministic gradient — replaces the remote avatar photo. */
export function avatarFor(user: { id?: string; name: string }): string {
  const key = user.id ?? user.name;
  const [from, to] = AVATAR_PALETTE[hash(key) % AVATAR_PALETTE.length];
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${from}"/>
      <stop offset="100%" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#a)"/>
  <text x="50" y="50" fill="#fff" font-family="Inter, system-ui, sans-serif"
        font-size="40" font-weight="600" text-anchor="middle"
        dominant-baseline="central">${initials}</text>
</svg>`;

  return toDataUri(svg);
}
