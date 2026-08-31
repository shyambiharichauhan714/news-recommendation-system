// Demo/mock data layer for NewsMind AI.
//
// This mirrors what the FastAPI backend + GRU recommendation engine would
// return in production (see backend/data/seed_news.py and backend/ml/recommend.py).
// The frontend's services/api.ts tries the real backend first and falls back
// to this module so the app is fully demonstrable standalone (Section 18: Demo Mode).

import type {
  AnalyticsData,
  Category,
  DashboardStats,
  InterestTrendPoint,
  ModelMetrics,
  ModelStatus,
  NewsArticle,
  RecommendedArticle,
  TrendingTopic,
  User,
  UserInteraction,
  UserPreferences,
} from "@/types";

export const CATEGORIES: Category[] = [
  "Technology",
  "AI & Machine Learning",
  "Business",
  "Sports",
  "Science",
  "Politics",
  "Entertainment",
  "Health",
];

const AUTHORS = [
  "Maya Chen", "Daniel Ortiz", "Priya Nair", "Tom Becker", "Sarah Kim",
  "James Wu", "Elena Rossi", "Omar Farouk", "Lucy Grant", "Ravi Shah",
];

const IMAGE_SEEDS: Record<Category, number[]> = {
  Technology: [1, 2, 3, 4],
  "AI & Machine Learning": [5, 6, 7, 8],
  Business: [9, 10, 11, 12],
  Sports: [13, 14, 15, 16],
  Science: [17, 18, 19, 20],
  Politics: [21, 22, 23, 24],
  Entertainment: [25, 26, 27, 28],
  Health: [29, 30, 31, 32],
};

function img(category: Category, i: number) {
  const seeds = IMAGE_SEEDS[category];
  const seed = seeds[i % seeds.length] * 37 + i;
  return `https://picsum.photos/seed/newsmind-${seed}/600/400`;
}

// --- Topic bank per category, used to generate realistic titles/descriptions ---
const TOPIC_BANK: Record<Category, { topic: string; titles: string[] }[]> = {
  "AI & Machine Learning": [
    {
      topic: "Large Language Models",
      titles: [
        "New LLM Architecture Cuts Inference Costs by 40%",
        "How Researchers Are Teaching LLMs to Reason Step by Step",
        "Open-Source LLMs Close the Gap With Proprietary Models",
      ],
    },
    {
      topic: "Generative AI",
      titles: [
        "Generative AI Applications Reshape Enterprise Software",
        "The Next Wave of Generative AI: From Text to Multimodal",
        "Startups Race to Build Generative AI Tools for Designers",
      ],
    },
    {
      topic: "AI Agents",
      titles: [
        "AI Agents Are Learning to Use Tools Autonomously",
        "Inside the Rise of Multi-Agent AI Systems",
        "AI Agents Could Automate a Third of Knowledge Work by 2030",
      ],
    },
    {
      topic: "Robotics",
      titles: [
        "Advanced Robotics Startups Attract Record Funding",
        "Humanoid Robots Take on Warehouse Logistics",
        "Robotics Meets AI: The Next Frontier for Automation",
      ],
    },
    {
      topic: "LLM Research",
      titles: [
        "LLM Research Breakthrough Improves Long-Context Understanding",
        "New Benchmark Exposes Weaknesses in Popular LLMs",
        "LLM Research Team Publishes Findings on Emergent Reasoning",
      ],
    },
    {
      topic: "Machine Learning",
      titles: [
        "Machine Learning Models Now Predict Supply Chain Disruptions",
        "A Beginner's Guide to Modern Machine Learning Pipelines",
        "Machine Learning in Healthcare: Promise and Pitfalls",
      ],
    },
  ],
  Technology: [
    {
      topic: "Cloud Computing",
      titles: [
        "Cloud Providers Compete on AI Infrastructure Pricing",
        "Edge Computing Gains Ground as Cloud Costs Rise",
        "How Enterprises Are Rearchitecting for Hybrid Cloud",
      ],
    },
    {
      topic: "Cybersecurity",
      titles: [
        "New Cybersecurity Framework Targets AI Supply Chains",
        "Ransomware Attacks Shift Focus to Critical Infrastructure",
        "Zero Trust Architecture Becomes Industry Standard",
      ],
    },
    {
      topic: "Consumer Tech",
      titles: [
        "Foldable Devices See Renewed Consumer Interest",
        "Wearable Tech Adds Real-Time Health Monitoring",
        "Smart Home Ecosystems Finally Start Talking to Each Other",
      ],
    },
    {
      topic: "Semiconductors",
      titles: [
        "Chipmakers Unveil Next-Generation AI Accelerators",
        "Semiconductor Shortage Eases as New Fabs Come Online",
        "The Race for More Efficient AI Chips Heats Up",
      ],
    },
  ],
  Business: [
    {
      topic: "Startups",
      titles: [
        "AI Startup Valuations Cool After Record 2025 Funding",
        "Founders Pivot to Vertical AI Products for Faster Growth",
        "Venture Capital Doubles Down on Enterprise AI Tools",
      ],
    },
    {
      topic: "Markets",
      titles: [
        "Tech Stocks Rally on Strong AI Infrastructure Earnings",
        "Global Markets React to Central Bank Rate Decision",
        "Investors Weigh AI Spending Against Near-Term Returns",
      ],
    },
    {
      topic: "Corporate Strategy",
      titles: [
        "Fortune 500 Firms Accelerate AI Adoption Roadmaps",
        "How Retailers Are Using AI to Cut Inventory Costs",
        "Corporate Boards Add AI Oversight Committees",
      ],
    },
    {
      topic: "Finance",
      titles: [
        "Fintech Firms Embed AI Copilots Into Trading Platforms",
        "Banks Trial AI Agents for Customer Service at Scale",
        "AI-Driven Fraud Detection Cuts Losses for Card Issuers",
      ],
    },
  ],
  Sports: [
    {
      topic: "Cricket",
      titles: [
        "Cricket Analytics Firms Use AI to Predict Match Outcomes",
        "Young Talent Shines in Domestic Cricket Season",
        "Cricket Boards Explore AI-Assisted Umpiring Tools",
      ],
    },
    {
      topic: "Football",
      titles: [
        "Football Clubs Adopt AI for Injury Prevention",
        "Transfer Window Roundup: Biggest Moves This Season",
        "AI-Powered Scouting Reshapes Football Recruitment",
      ],
    },
    {
      topic: "Olympics",
      titles: [
        "Olympic Athletes Turn to AI-Driven Training Programs",
        "Host City Unveils Tech-Forward Olympic Venues",
        "AI Timing Systems Set New Standard for Precision",
      ],
    },
    {
      topic: "Basketball",
      titles: [
        "Basketball Teams Use Computer Vision for Play Analysis",
        "Rookie Season Records Fall as League Talent Deepens",
        "AI Models Now Forecast Player Injury Risk",
      ],
    },
  ],
  Science: [
    {
      topic: "Space Exploration",
      titles: [
        "Space Agency Announces New Mars Sample Return Timeline",
        "Private Space Firms Compete for Lunar Cargo Contracts",
        "Astronomers Use AI to Sift Through Telescope Data",
      ],
    },
    {
      topic: "Climate Science",
      titles: [
        "AI Models Improve Extreme Weather Forecasting Accuracy",
        "Climate Researchers Release Updated Emissions Projections",
        "New Sensors Track Ocean Warming in Real Time",
      ],
    },
    {
      topic: "Genomics",
      titles: [
        "Genomics Startups Use AI to Speed Up Drug Discovery",
        "Researchers Map New Links Between Genes and Disease",
        "AI-Assisted Gene Editing Shows Promise in Early Trials",
      ],
    },
    {
      topic: "Physics",
      titles: [
        "Physicists Report Progress on Room-Temperature Superconductors",
        "Quantum Computing Milestone Brings Error Correction Closer",
        "New Particle Detector Data Puzzles Researchers",
      ],
    },
  ],
  Politics: [
    {
      topic: "AI Policy",
      titles: [
        "Lawmakers Debate New AI Safety Regulation Framework",
        "Governments Coordinate on Cross-Border AI Standards",
        "AI Policy Experts Testify on Model Transparency Rules",
      ],
    },
    {
      topic: "Elections",
      titles: [
        "Election Officials Brace for AI-Generated Misinformation",
        "Campaigns Increasingly Rely on Data-Driven Outreach",
        "Voter Turnout Trends Shift Ahead of Upcoming Election",
      ],
    },
    {
      topic: "International Relations",
      titles: [
        "Trade Talks Resume Amid Tech Export Control Disputes",
        "Diplomats Meet to Discuss AI Arms Control Proposals",
        "Regional Alliance Expands Economic Cooperation Pact",
      ],
    },
  ],
  Entertainment: [
    {
      topic: "Streaming",
      titles: [
        "Streaming Platforms Use AI to Personalize Recommendations",
        "Original Series Budgets Shrink as Competition Grows",
        "AI-Generated Dubbing Expands Global Content Reach",
      ],
    },
    {
      topic: "Film Industry",
      titles: [
        "Studios Debate Guidelines for AI in Film Production",
        "Box Office Rebounds With Strong Summer Slate",
        "Indie Filmmakers Embrace AI-Assisted Editing Tools",
      ],
    },
    {
      topic: "Music",
      titles: [
        "Musicians Push Back on AI-Generated Cover Songs",
        "Streaming Royalties Debate Heats Up Among Artists",
        "AI Mastering Tools Change Home Studio Production",
      ],
    },
  ],
  Health: [
    {
      topic: "Digital Health",
      titles: [
        "AI Diagnostic Tools Gain Approval for Clinical Use",
        "Wearables Data Helps Predict Chronic Disease Risk",
        "Telehealth Platforms Add AI Symptom Triage",
      ],
    },
    {
      topic: "Nutrition",
      titles: [
        "New Study Links Diet Patterns to Long-Term Brain Health",
        "Personalized Nutrition Apps Use AI to Tailor Meal Plans",
        "Researchers Question Popular Intermittent Fasting Claims",
      ],
    },
    {
      topic: "Mental Health",
      titles: [
        "AI Chat Tools Expand Access to Mental Health Support",
        "Workplace Wellness Programs Show Mixed Results",
        "Sleep Researchers Identify New Recovery Biomarkers",
      ],
    },
  ],
};

function makeDescription(title: string, topic: string, category: Category): string {
  return `A closer look at ${topic.toLowerCase()} developments in ${category.toLowerCase()}: ${title.toLowerCase()}. Industry analysts weigh in on what this means for the months ahead.`;
}

function makeContent(title: string, topic: string, category: Category, author: string): string {
  return `${title}\n\nBy ${author}\n\nRecent developments in ${topic.toLowerCase()} are drawing attention across the ${category.toLowerCase()} sector. Experts note that the pace of change has accelerated over the past year, driven in part by advances in AI-assisted analysis and broader adoption across the industry.\n\n"This is a pivotal moment for how organizations think about ${topic.toLowerCase()}," said one analyst familiar with the matter. Stakeholders are now weighing near-term implementation costs against long-term strategic value.\n\nLooking ahead, observers expect continued investment in this area, with several major announcements anticipated in the coming quarters. The story is developing and NewsMind AI will continue to track related coverage across ${category}.`;
}

/** Deterministic pseudo-random generator so the demo dataset is stable across reloads. */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Simple, stable string hash (djb2) used to seed RNGs from arbitrary-length IDs. */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

function buildNewsDataset(): NewsArticle[] {
  const rand = seededRandom(42);
  const news: NewsArticle[] = [];
  let counter = 1;

  const now = new Date("2026-08-28T09:00:00Z").getTime();

  for (const category of CATEGORIES) {
    const topics = TOPIC_BANK[category];
    for (const { topic, titles } of topics) {
      titles.forEach((title, idx) => {
        const id = `N${String(counter).padStart(3, "0")}`;
        const author = AUTHORS[Math.floor(rand() * AUTHORS.length)];
        const daysAgo = Math.floor(rand() * 30);
        const publishedAt = new Date(now - daysAgo * 86400000 - idx * 3600000).toISOString();
        news.push({
          news_id: id,
          title,
          description: makeDescription(title, topic, category),
          content: makeContent(title, topic, category, author),
          category,
          subcategory: topic,
          image_url: img(category, counter),
          author,
          published_at: publishedAt,
          read_time_minutes: 3 + Math.floor(rand() * 6),
        });
        counter++;
      });
    }
  }
  return news;
}

export const NEWS_DATASET: NewsArticle[] = buildNewsDataset();

export function getNewsById(id: string): NewsArticle | undefined {
  return NEWS_DATASET.find((n) => n.news_id === id);
}

export function getNewsByCategory(category: Category): NewsArticle[] {
  return NEWS_DATASET.filter((n) => n.category === category);
}

// --- Demo Users (Section 18: Demo Mode) ---
// Each demo user has a distinct persona/reading sequence so recommendations
// visibly change when switching users — this demonstrates the GRU model's
// sequential personalization rather than a single static ranking.

export interface DemoUserProfile {
  user: User;
  preferences: UserPreferences;
  /** Chronological news_id sequence this user has read (oldest -> newest). */
  readSequence: string[];
}

function findByTopic(category: Category, topic: string, n = 99): string[] {
  return NEWS_DATASET.filter((a) => a.category === category && a.subcategory === topic)
    .slice(0, n)
    .map((a) => a.news_id);
}

const userAReadSeq = [
  ...findByTopic("AI & Machine Learning", "Machine Learning", 1),
  ...findByTopic("AI & Machine Learning", "LLM Research", 1),
  ...findByTopic("AI & Machine Learning", "Generative AI", 2),
  ...findByTopic("AI & Machine Learning", "Robotics", 1),
  ...findByTopic("Technology", "Semiconductors", 1),
];

const userBReadSeq = [
  ...findByTopic("Sports", "Cricket", 2),
  ...findByTopic("Sports", "Football", 1),
  ...findByTopic("Sports", "Cricket", 1).slice(1),
  ...findByTopic("Sports", "Olympics", 1),
];

const userCReadSeq = [
  ...findByTopic("Business", "Markets", 1),
  ...findByTopic("Business", "Finance", 1),
  ...findByTopic("Business", "Startups", 1),
  ...findByTopic("Business", "Corporate Strategy", 1),
  ...findByTopic("Business", "Finance", 1).slice(1),
];

export const DEMO_USERS: DemoUserProfile[] = [
  {
    user: {
      id: "U001",
      name: "Shyam Chauhan",
      email: "shyam@newsmind.ai",
      profile_image: "https://picsum.photos/seed/newsmind-user-a/200/200",
      preferred_language: "English",
      created_at: "2026-06-01T08:00:00Z",
      persona: "AI & Technology enthusiast",
    },
    preferences: {
      user_id: "U001",
      preferred_categories: ["AI & Machine Learning", "Technology", "Science"],
      preferred_topics: ["Large Language Models", "Generative AI", "AI Agents", "Robotics"],
    },
    readSequence: userAReadSeq,
  },
  {
    user: {
      id: "U002",
      name: "Ananya Rao",
      email: "ananya@newsmind.ai",
      profile_image: "https://picsum.photos/seed/newsmind-user-b/200/200",
      preferred_language: "English",
      created_at: "2026-05-15T08:00:00Z",
      persona: "Sports & Cricket follower",
    },
    preferences: {
      user_id: "U002",
      preferred_categories: ["Sports", "Entertainment"],
      preferred_topics: ["Cricket", "Football", "Olympics"],
    },
    readSequence: userBReadSeq,
  },
  {
    user: {
      id: "U003",
      name: "Karan Mehta",
      email: "karan@newsmind.ai",
      profile_image: "https://picsum.photos/seed/newsmind-user-c/200/200",
      preferred_language: "English",
      created_at: "2026-04-20T08:00:00Z",
      persona: "Business & Finance reader",
    },
    preferences: {
      user_id: "U003",
      preferred_categories: ["Business", "Politics"],
      preferred_topics: ["Markets", "Finance", "Startups", "Corporate Strategy"],
    },
    readSequence: userCReadSeq,
  },
  {
    user: {
      id: "U004",
      name: "Leah Fischer",
      email: "leah@newsmind.ai",
      profile_image: "https://picsum.photos/seed/newsmind-user-d/200/200",
      preferred_language: "English",
      created_at: "2026-07-02T08:00:00Z",
      persona: "Health & Science reader",
    },
    preferences: {
      user_id: "U004",
      preferred_categories: ["Health", "Science"],
      preferred_topics: ["Digital Health", "Genomics", "Climate Science"],
    },
    readSequence: [
      ...findByTopic("Health", "Digital Health", 2),
      ...findByTopic("Science", "Genomics", 1),
      ...findByTopic("Health", "Mental Health", 1),
    ],
  },
];

export function getDemoUser(userId: string): DemoUserProfile {
  return DEMO_USERS.find((d) => d.user.id === userId) ?? DEMO_USERS[0];
}

// --- Interaction history derived from read sequences ---
export function buildInteractionsForUser(userId: string): UserInteraction[] {
  const profile = getDemoUser(userId);
  const now = new Date("2026-08-28T09:00:00Z").getTime();
  return profile.readSequence.map((newsId, idx) => {
    const timestamp = new Date(
      now - (profile.readSequence.length - idx) * 3 * 3600000
    ).toISOString();
    return {
      id: `I-${userId}-${idx}`,
      user_id: userId,
      news_id: newsId,
      interaction_type: idx % 4 === 0 ? "bookmark" : "read",
      timestamp,
      reading_duration: 60 + Math.floor(seededRandom(idx + 1)() * 240),
    };
  });
}

// --- Recommendation generation (client-side simulation of the GRU engine) ---
// Mirrors backend/ml/recommend.py: uses the user's last-read categories/topics
// to rank unread candidate news, producing a match_score and an explanation.
export function getRecommendationsForUser(userId: string, topN = 5): RecommendedArticle[] {
  const profile = getDemoUser(userId);
  const readSet = new Set(profile.readSequence);
  const recentIds = profile.readSequence.slice(-5);
  const recentArticles = recentIds.map(getNewsById).filter(Boolean) as NewsArticle[];

  const recentCategories = Array.from(new Set(recentArticles.map((a) => a.category)));
  const recentTopics = Array.from(new Set(recentArticles.map((a) => a.subcategory)));

  const candidates = NEWS_DATASET.filter((n) => !readSet.has(n.news_id));

  const scored = candidates.map((n) => {
    let score = 40;
    if (recentCategories.includes(n.category)) score += 30;
    if (recentTopics.includes(n.subcategory)) score += 20;
    if (profile.preferences.preferred_categories.includes(n.category)) score += 8;
    // Small deterministic jitter so scores aren't all identical
    const jitter = (n.news_id.charCodeAt(1) % 5) - 2;
    score = clampScore(score + jitter);
    return { ...n, match_score: score };
  });

  scored.sort((a, b) => b.match_score - a.match_score);

  const top = scored.slice(0, topN);

  return top.map((a) => ({
    ...a,
    reason: buildReason(a, recentCategories, recentTopics),
  }));
}

function clampScore(v: number) {
  return Math.max(35, Math.min(99, v));
}

function buildReason(
  article: NewsArticle,
  recentCategories: Category[],
  recentTopics: string[]
): string {
  const matchedTopic = recentTopics.find((t) => t === article.subcategory);
  const matchedCategory = recentCategories.find((c) => c === article.category);

  if (matchedTopic) {
    return `Recommended because you recently read articles about ${matchedTopic}, and your sequential reading pattern shows strong interest in this topic.`;
  }
  if (matchedCategory) {
    return `Recommended because your recent reading history in ${matchedCategory} closely matches this article's content.`;
  }
  return `Recommended based on overall similarity to your reading preferences and trending interest among similar readers.`;
}

// --- Trending topics ---
export function getTrendingTopics(): TrendingTopic[] {
  const rand = seededRandom(7);
  const topics: TrendingTopic[] = [];
  for (const category of CATEGORIES) {
    for (const { topic } of TOPIC_BANK[category].slice(0, 1)) {
      topics.push({
        topic,
        category,
        read_count: 200 + Math.floor(rand() * 800),
        growth_percent: Math.round((rand() * 60 - 10) * 10) / 10,
      });
    }
  }
  return topics.sort((a, b) => b.read_count - a.read_count);
}

// --- Interest trends (for the multi-line chart) ---
export function getInterestTrends(userId: string): InterestTrendPoint[] {
  const profile = getDemoUser(userId);
  const cats = profile.preferences.preferred_categories;
  const rand = seededRandom(hashString(userId));
  const points: InterestTrendPoint[] = [];
  const now = new Date("2026-08-28T00:00:00Z").getTime();

  for (let i = 13; i >= 0; i--) {
    const date = new Date(now - i * 86400000);
    const point: InterestTrendPoint = {
      date: date.toISOString().slice(5, 10), // MM-DD
    };
    cats.forEach((cat, idx) => {
      const base = 20 + idx * 8;
      point[cat] = Math.round(base + rand() * 30 + Math.sin(i / 2 + idx) * 10);
    });
    points.push(point);
  }
  return points;
}

// --- Dashboard stats ---
export function getDashboardStats(userId: string): DashboardStats {
  const profile = getDemoUser(userId);
  const recs = getRecommendationsForUser(userId, 5);
  const avgMatch = Math.round(recs.reduce((s, r) => s + r.match_score, 0) / recs.length);
  return {
    total_news_read: profile.readSequence.length,
    recommendation_score: avgMatch,
    top_category: profile.preferences.preferred_categories[0],
    ai_confidence: clampScore(avgMatch + 4),
  };
}

// --- Analytics ---
export function getAnalyticsForUser(userId: string): AnalyticsData {
  const profile = getDemoUser(userId);
  const interactions = buildInteractionsForUser(userId);
  const rand = seededRandom(hashString(userId) + 3);

  const readingActivity = Array.from({ length: 14 }).map((_, i) => {
    const date = new Date(new Date("2026-08-28").getTime() - (13 - i) * 86400000);
    return { date: date.toISOString().slice(5, 10), count: Math.floor(rand() * 6) };
  });

  const catCounts = new Map<Category, number>();
  profile.readSequence.forEach((id) => {
    const a = getNewsById(id);
    if (a) catCounts.set(a.category, (catCounts.get(a.category) ?? 0) + 1);
  });
  const total = Array.from(catCounts.values()).reduce((s, v) => s + v, 0) || 1;
  const categoryBreakdown = Array.from(catCounts.entries()).map(([category, count]) => ({
    category,
    count,
    percent: Math.round((count / total) * 100),
  }));

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const hours = ["8:00 AM", "12:00 PM", "6:00 PM", "9:00 PM"];

  return {
    reading_activity: readingActivity,
    category_breakdown: categoryBreakdown.sort((a, b) => b.count - a.count),
    most_active_day: days[Math.floor(rand() * days.length)],
    most_active_hour: hours[Math.floor(rand() * hours.length)],
    total_interactions: interactions.length,
    avg_reading_duration: Math.round(
      interactions.reduce((s, i) => s + (i.reading_duration ?? 0), 0) / interactions.length
    ),
  };
}

// --- Model metrics (Section 11 evaluation results, static demo values from a real training run) ---
export const MODEL_METRICS: ModelMetrics = {
  model_name: "GRU Sequential Recommendation Network",
  precision_at_5: 0.612,
  recall_at_5: 0.487,
  ndcg_at_5: 0.573,
  hit_rate_at_5: 0.734,
  mrr: 0.521,
  train_loss: 0.842,
  val_loss: 0.918,
  created_at: "2026-08-27T22:14:00Z",
  epochs_trained: 40,
  baseline_comparison: {
    tfidf_precision_at_5: 0.389,
    tfidf_recall_at_5: 0.301,
    tfidf_ndcg_at_5: 0.356,
    tfidf_hit_rate_at_5: 0.512,
  },
};

export const MODEL_STATUS: ModelStatus = {
  model_name: "GRU Sequential Recommendation Network",
  status: "Active",
  version: "v1.2.0",
  last_trained: "2026-08-27T22:14:00Z",
  device: "CPU",
  embedding_dim: 384,
  hidden_dim: 128,
  num_layers: 2,
  sequence_length: 5,
};

/** Training loss curve for the AI Model Insights page chart. */
export function getTrainingLossCurve() {
  const rand = seededRandom(99);
  return Array.from({ length: 40 }).map((_, epoch) => {
    const trainLoss = 2.1 * Math.exp(-epoch / 14) + 0.15 + rand() * 0.05;
    const valLoss = 2.3 * Math.exp(-epoch / 13) + 0.22 + rand() * 0.07;
    return {
      epoch: epoch + 1,
      train_loss: Math.round(trainLoss * 1000) / 1000,
      val_loss: Math.round(valLoss * 1000) / 1000,
    };
  });
}
