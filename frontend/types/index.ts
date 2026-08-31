// Shared TypeScript types for NewsMind AI frontend.
// These mirror the Pydantic schemas defined in backend/app/schemas/*.py
// so the frontend and backend stay in sync on the API contract.

export type Category =
  | "Technology"
  | "AI & Machine Learning"
  | "Business"
  | "Sports"
  | "Science"
  | "Politics"
  | "Entertainment"
  | "Health";

export interface NewsArticle {
  news_id: string;
  title: string;
  description: string;
  content: string;
  category: Category;
  subcategory: string;
  image_url: string;
  author: string;
  published_at: string; // ISO date string
  read_time_minutes: number;
}

export interface RecommendedArticle extends NewsArticle {
  match_score: number; // 0-100
  reason: string;
}

export type InteractionType = "view" | "click" | "read" | "like" | "bookmark";

export interface UserInteraction {
  id: string;
  user_id: string;
  news_id: string;
  interaction_type: InteractionType;
  timestamp: string; // ISO date string
  reading_duration?: number; // seconds
}

export interface User {
  id: string;
  name: string;
  email: string;
  profile_image: string;
  preferred_language: string;
  created_at: string;
  persona?: string; // demo persona label, e.g. "AI & Technology enthusiast"
}

export interface UserPreferences {
  user_id: string;
  preferred_categories: Category[];
  preferred_topics: string[];
}

export interface ModelMetrics {
  model_name: string;
  precision_at_5: number;
  recall_at_5: number;
  ndcg_at_5: number;
  hit_rate_at_5: number;
  mrr: number;
  train_loss: number;
  val_loss: number;
  created_at: string;
  epochs_trained: number;
  baseline_comparison?: {
    tfidf_precision_at_5: number;
    tfidf_recall_at_5: number;
    tfidf_ndcg_at_5: number;
    tfidf_hit_rate_at_5: number;
  };
}

export interface TrendingTopic {
  topic: string;
  category: Category;
  read_count: number;
  growth_percent: number;
}

export interface InterestTrendPoint {
  date: string;
  [category: string]: number | string;
}

export interface DashboardStats {
  total_news_read: number;
  recommendation_score: number; // 0-100
  top_category: Category;
  ai_confidence: number; // 0-100
}

export interface AnalyticsData {
  reading_activity: { date: string; count: number }[];
  category_breakdown: { category: Category; count: number; percent: number }[];
  most_active_day: string;
  most_active_hour: string;
  total_interactions: number;
  avg_reading_duration: number;
}

export interface ModelStatus {
  model_name: string;
  status: "Active" | "Training" | "Idle" | "Error";
  version: string;
  last_trained: string;
  device: string;
  embedding_dim: number;
  hidden_dim: number;
  num_layers: number;
  sequence_length: number;
}
