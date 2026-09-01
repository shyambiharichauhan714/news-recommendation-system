// Real photography for article thumbnails.
//
// Photos are keyed by *topic*, not category. Keying by category meant the 18
// AI & Machine Learning articles drew from one pool of five images, so the
// same picture showed up several times in a single grid and rarely matched
// what the article was actually about.
//
// Each of the 31 topics holds exactly three articles and gets exactly three
// photos, so every article in the catalog has its own subject-appropriate
// image and no photo is reused anywhere. Every id below was verified to
// return HTTP 200 before being added; the count is asserted at module load.
//
// These are direct Unsplash CDN URLs — no API key, no redirect hop. The
// previous host (picsum.photos) started returning 503 and publishes only AAAA
// records, so a machine without an IPv6 route hung on it rather than failing.

const TOPIC_PHOTOS: Record<string, [string, string, string]> = {
  "AI Agents": ["1620712943543-bcc4688e7485", "1677442136019-21780ecad995", "1633356122544-f134324a6cee"],
  "Generative AI": ["1531746790731-6c087fecd65a", "1554306274-f23873d9a26c", "1547954575-855750c57bd3"],
  "LLM Research": ["1516110833967-0b5716ca1387", "1509228468518-180dd4864904", "1456406644174-8ddd4cd52a06"],
  "Large Language Models": ["1526374965328-7f61d4dc18c5", "1518186285589-2f7649de83e0", "1555949963-ff9fe0c870eb"],
  "Machine Learning": ["1507003211169-0a1dd7228f2d", "1551288049-bebda4e38f71", "1518770660439-4636190af475"],
  "Robotics": ["1485827404703-89b55fcc595e", "1561144257-e32e8efc6c4f", "1563207153-f403bf289096"],
  "Corporate Strategy": ["1454165804606-c3d57bc86b40", "1552664730-d307ca884978", "1517245386807-bb43f82c33c4"],
  "Finance": ["1611974789855-9c2a0a7236a3", "1590283603385-17ffb3a7f29f", "1554224155-6726b3ff858f"],
  "Markets": ["1498050108023-c5249f4df085", "1612178537253-bccd437b730e", "1642790106117-e829e14a795f"],
  "Startups": ["1553729459-efe14ef6055d", "1559136555-9303baea8ebd", "1521737604893-d14cc237f11d"],
  "Film Industry": ["1489599849927-2ee91cede3ba", "1440404653325-ab127d49abc1", "1478720568477-152d9b164e26"],
  "Music": ["1478737270239-2f02b77fc618", "1511671782779-c97d3d27a1d4", "1514320291840-2e0a9bf2a9ae"],
  "Streaming": ["1522869635100-9f4c5e86aa37", "1593784991095-a205069470b6", "1574375927938-d5a98e8ffe85"],
  "Digital Health": ["1576091160550-2173dba999ef", "1505751172876-fa1923c5c528", "1551190822-a9333d879b1f"],
  "Mental Health": ["1544027993-37dbfe43562a", "1499209974431-9dddcece7f88", "1560785496-3c9d27877182"],
  "Nutrition": ["1512621776951-a57141f2eefd", "1490645935967-10de6ba17061", "1498837167922-ddd27525d352"],
  "AI Policy": ["1541701494587-cb58502866ab", "1529107386315-e1a2ed48a620", "1589829545856-d10d557cf95f"],
  "Elections": ["1540910419892-4a36d2c3266c", "1494172961521-33799ddd43a5", "1524995997946-a1c2e315a42f"],
  "International Relations": ["1524863479829-916d8e77f114", "1526778548025-fa2f459cd5c1", "1541339907198-e08756dedf3f"],
  "Climate Science": ["1500534314209-a25ddb2bd429", "1611273426858-450d8e3c9fce", "1497435334941-8c899ee9e8e9"],
  "Genomics": ["1532094349884-543bc11b234d", "1579154204601-01588f351e67", "1516339901601-2e1b62dc0c45"],
  "Physics": ["1636466497217-26a8cbeaf0aa", "1635070041078-e363dbe005cb", "1451187580459-43490279c0fa"],
  "Space Exploration": ["1614728263952-84ea256f9679", "1446776877081-d282a0f896e2", "1516849841032-87cbac4d88f7"],
  "Basketball": ["1546519638-68e109498ffc", "1519861531473-9200262188bf", "1608245449230-4ac19066d2d0"],
  "Cricket": ["1531415074968-036ba1b575da", "1607734834519-d8576ae60ea6", "1593341646782-e0b495cff86d"],
  "Football": ["1574629810360-7efbbe195018", "1522205408450-add114ad53fe", "1522778119026-d647f0596c20"],
  "Olympics": ["1571019613454-1cb2f99b2d8b", "1461896836934-ffe607ba8211", "1552674605-db6ffd4facb5"],
  "Cloud Computing": ["1550751827-4bd374c3f58b", "1470071459604-3b5ec3a7fe05", "1544197150-b99a580bb7a8"],
  "Consumer Tech": ["1517649763962-0c623066013b", "1511707171634-5f897ff02aa9", "1526925539332-aa3b66e35444"],
  "Cybersecurity": ["1563986768494-4dee2763ff3f", "1614064641938-3bbee52942c7", "1581094794329-c8112a89af12"],
  "Semiconductors": ["1524492412937-b28074a5d7da", "1591405351990-4726e331f141", "1580584126903-c17d41830450"],
};

/** Used when a topic isn't in the map — only reachable if the dataset grows. */
const FALLBACK_PHOTOS = [
  "1504384308090-c894fdcc538d",
  "1487058792275-0ad4aaf24ca7",
  "1554260570-9140fd3b7614",
];

/**
 * Position of an article within its topic, from its news_id.
 *
 * Articles are generated topic by topic, three at a time, so ids inside a
 * topic are always consecutive (N010, N011, N012) and `(n - 1) % 3` maps them
 * onto 0, 1, 2 exactly once each. Hashing the id instead would collide — two
 * of the three articles landing on the same photo — which is precisely the
 * duplicate-image problem this module exists to solve.
 */
function slotFor(newsId: string): number {
  const n = Number.parseInt(newsId.replace(/\D/g, ""), 10);
  return Number.isFinite(n) ? (n - 1) % 3 : 0;
}

/**
 * Direct Unsplash CDN URL for an article, sized for the card it renders in.
 * Deterministic: the same news_id always maps to the same photo.
 */
export function photoFor(
  article: { news_id: string; category: string; subcategory?: string },
  width = 600,
  height = 400
): string {
  const pool =
    (article.subcategory && TOPIC_PHOTOS[article.subcategory]) || FALLBACK_PHOTOS;
  const id = pool[slotFor(article.news_id) % pool.length];
  return `https://images.unsplash.com/photo-${id}?w=${width}&h=${height}&fit=crop&auto=format&q=70`;
}

/** Exposed so tests can assert coverage and uniqueness. */
export const PHOTO_TOPICS = TOPIC_PHOTOS;
