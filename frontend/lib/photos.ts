// Real photography for article thumbnails.
//
// The dataset ships picsum.photos URLs, but that host started returning 503
// mid-project (and only publishes AAAA records, so a machine without an IPv6
// route hangs on it rather than failing fast). These are direct Unsplash CDN
// URLs instead — no API key, no redirect hop — grouped by category so the
// photo actually suits the story, and picked deterministically by news_id so
// a given article always shows the same image.
//
// Every id below was verified to return HTTP 200 before being added.

const CATEGORY_PHOTOS: Record<string, string[]> = {
  Technology: [
    "1518770660439-4636190af475", // circuit board
    "1519389950473-47ba0277781c", // team at screens
    "1531297484001-80022131f5a1", // laptop workspace
    "1550751827-4bd374c3f58b", // server rack lights
    "1517649763962-0c623066013b", // hardware close-up
  ],
  "AI & Machine Learning": [
    "1485827404703-89b55fcc595e", // robot figure
    "1526374965328-7f61d4dc18c5", // matrix code
    "1555949963-ff9fe0c870eb", // neural abstract
    "1507003211169-0a1dd7228f2d", // circuitry macro
    "1451187580459-43490279c0fa", // networked globe
  ],
  Business: [
    "1454165804606-c3d57bc86b40", // meeting table
    "1611974789855-9c2a0a7236a3", // trading charts
    "1553729459-efe14ef6055d", // analytics screen
    "1507679799987-c73779587ccf", // suit / handshake
    "1460925895917-afdab827c52f", // dashboard metrics
  ],
  Sports: [
    "1461896836934-ffe607ba8211", // stadium crowd
    "1571019613454-1cb2f99b2d8b", // running track
    "1546519638-68e109498ffc", // basketball court
    "1574629810360-7efbbe195018", // football action
    "1431324155629-1a6deb1dec8d", // athlete training
  ],
  Science: [
    "1507413245164-6160d8298b31", // lab glassware
    "1532094349884-543bc11b234d", // microscope work
    "1576091160399-112ba8d25d1d", // research bench
    "1451187580459-43490279c0fa", // space / earth
    "1532187863486-abf9dbad1b69", // observatory / night sky
  ],
  Politics: [
    "1541701494587-cb58502866ab", // parliament interior
    "1524863479829-916d8e77f114", // civic building
    "1529107386315-e1a2ed48a620", // podium / flags
    "1560250097-0b93528c311a", // formal meeting
    "1586339949916-3e9457bef6d3", // press conference
  ],
  Entertainment: [
    "1493225457124-a3eb161ffa5f", // concert crowd
    "1478737270239-2f02b77fc618", // music production
    "1489599849927-2ee91cede3ba", // cinema seats
    "1607619056574-7b8d3ee536b2", // stage lights
    "1631815589968-fdb09a223b1e", // streaming setup
  ],
  Health: [
    "1576091160550-2173dba999ef", // stethoscope
    "1505751172876-fa1923c5c528", // clinician
    "1584982751601-97dcc096659c", // medical scan
    "1559757148-5c350d0d3c56", // wellness
    "1522202176988-66273c2fd55f", // fitness
  ],
};

/** Neutral pool for any category not listed above. */
const FALLBACK_PHOTOS = [
  "1504384308090-c894fdcc538d",
  "1487058792275-0ad4aaf24ca7",
  "1554260570-9140fd3b7614",
  "1579952363873-27f3bade9f55",
  "1543351611-58f69d7c1781",
];

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Direct Unsplash CDN URL for an article, sized for the card it renders in.
 * Deterministic: the same news_id always maps to the same photo.
 */
export function photoFor(
  article: { news_id: string; category: string },
  width = 600,
  height = 400
): string {
  const pool = CATEGORY_PHOTOS[article.category] ?? FALLBACK_PHOTOS;
  const id = pool[hash(article.news_id) % pool.length];
  return `https://images.unsplash.com/photo-${id}?w=${width}&h=${height}&fit=crop&auto=format&q=70`;
}
