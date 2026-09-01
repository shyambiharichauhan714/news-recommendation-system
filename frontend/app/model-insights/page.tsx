"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from "recharts";
import { BrainCircuit, Cpu, Layers3, Timer, Target, TrendingUp, ListChecks, Trophy, type LucideIcon } from "lucide-react";
import { useActiveUser } from "@/lib/user-context";
import {
  fetchModelMetrics,
  fetchModelStatus,
  fetchTrainingLossCurve,
  fetchUserHistory,
  fetchRecommendations,
} from "@/services/api";
import { useCatalog } from "@/lib/catalog-context";
import type { ModelMetrics, ModelStatus, RecommendedArticle, UserInteraction } from "@/types";
import SequenceFlow from "@/components/model/SequenceFlow";

export default function ModelInsightsPage() {
  const { activeUserId } = useActiveUser();
  const { newsById, userById } = useCatalog();
  const profile = userById(activeUserId);
  const [history, setHistory] = useState<UserInteraction[]>([]);
  const [topPick, setTopPick] = useState<RecommendedArticle | null>(null);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [lossCurve, setLossCurve] = useState<{ epoch: number; train_loss: number; val_loss: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchModelMetrics(), fetchModelStatus(), fetchTrainingLossCurve()]).then(
      ([m, s, l]) => {
        setMetrics(m);
        setStatus(s);
        setLossCurve(l);
        setLoading(false);
      }
    );
  }, []);

  // Per-user, so this has to refetch when the persona changes.
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchUserHistory(activeUserId), fetchRecommendations(activeUserId, 1)]).then(
      ([h, recs]) => {
        if (cancelled) return;
        setHistory(h);
        setTopPick(recs[0] ?? null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  // The last four articles actually read, newest last — the same window the
  // model is fed. Consecutive repeats collapse, matching the sequence builder.
  const recentSteps = useMemo(() => {
    const ids: string[] = [];
    for (const h of history) {
      if (!ids.length || ids[ids.length - 1] !== h.news_id) ids.push(h.news_id);
    }
    return ids
      .slice(-4)
      .map((id) => newsById(id))
      .filter(Boolean)
      .map((a) => ({ label: a!.subcategory, category: a!.category }));
  }, [history, newsById]);

  // The model's actual next-item prediction. This used to read the user's
  // first *stated* preference, which meant the panel claimed to show a GRU
  // prediction while showing a value the model never produced.
  const predictedInterest = topPick?.subcategory ?? null;

  const comparisonData = metrics
    ? [
        { metric: "Precision@5", GRU: metrics.precision_at_5, TFIDF: metrics.baseline_comparison?.tfidf_precision_at_5 ?? 0 },
        { metric: "Recall@5", GRU: metrics.recall_at_5, TFIDF: metrics.baseline_comparison?.tfidf_recall_at_5 ?? 0 },
        { metric: "NDCG@5", GRU: metrics.ndcg_at_5, TFIDF: metrics.baseline_comparison?.tfidf_ndcg_at_5 ?? 0 },
        { metric: "Hit Rate@5", GRU: metrics.hit_rate_at_5, TFIDF: metrics.baseline_comparison?.tfidf_hit_rate_at_5 ?? 0 },
      ]
    : [];

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">AI Model Insights</h1>
        <p className="text-ink-500 mt-1">
          Full transparency into the sequential recommendation model powering NewsMind AI.
        </p>
      </motion.div>

      {/* Model identity card */}
      <div className="card p-6 bg-navy-gradient text-white border-0 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              <BrainCircuit size={24} className="text-violet-400" />
            </div>
            <div>
              <p className="text-lg font-bold">{status?.model_name ?? "GRU Sequential Recommendation Network"}</p>
              <p className="text-sm text-white/50">Version {status?.version} &middot; Last trained {status ? new Date(status.last_trained).toLocaleDateString() : "-"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/15 border border-emerald-400/30 rounded-full px-3.5 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-300">{status?.status ?? "Active"}</span>
          </div>
        </div>

        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <StatMini icon={Cpu} label="Embedding Dim" value={status?.embedding_dim ?? 384} />
          <StatMini icon={Layers3} label="GRU Layers" value={status?.num_layers ?? 2} />
          <StatMini icon={Timer} label="Sequence Length" value={status?.sequence_length ?? 5} />
          <StatMini icon={ListChecks} label="Device" value={status?.device ?? "CPU"} />
        </div>
      </div>

      {/* Metrics */}
      <section>
        <p className="font-semibold text-ink-900 mb-4">Evaluation Metrics</p>
        {loading || !metrics ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Precision@5" value={metrics.precision_at_5} icon={Target} />
            <MetricCard label="Recall@5" value={metrics.recall_at_5} icon={TrendingUp} />
            <MetricCard label="NDCG@5" value={metrics.ndcg_at_5} icon={ListChecks} />
            <MetricCard label="Hit Rate@5" value={metrics.hit_rate_at_5} icon={Trophy} />
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Loss curve */}
        <div className="card p-6">
          <p className="font-semibold text-ink-900 mb-1">Training vs Validation Loss</p>
          <p className="text-sm text-ink-500 mb-4">Over {metrics?.epochs_trained ?? 40} training epochs</p>
          {loading ? (
            <div className="skeleton h-64" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lossCurve} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E9F3" vertical={false} />
                  <XAxis dataKey="epoch" tick={{ fontSize: 11, fill: "#8A8FB0" }} tickLine={false} axisLine={{ stroke: "#E7E9F3" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8FB0" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E7E9F3", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                  <Line type="monotone" dataKey="train_loss" name="Train Loss" stroke="#4A63FA" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="val_loss" name="Validation Loss" stroke="#F43F5E" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Baseline comparison */}
        <div className="card p-6">
          <p className="font-semibold text-ink-900 mb-1">GRU vs TF-IDF Baseline</p>
          <p className="text-sm text-ink-500 mb-4">Transformer embeddings + GRU outperforms the TF-IDF baseline</p>
          {loading ? (
            <div className="skeleton h-64" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E9F3" vertical={false} />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: "#8A8FB0" }} tickLine={false} axisLine={{ stroke: "#E7E9F3" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8FB0" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E7E9F3", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="GRU" fill="#4A63FA" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="TFIDF" name="TF-IDF" fill="#C2D3FF" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Sequence visualization */}
      <section className="card p-6">
        <p className="font-semibold text-ink-900 mb-1">User Behavior Sequence &rarr; Prediction</p>
        <p className="text-sm text-ink-500 mb-5">
          Live example from {profile?.name ?? "this reader"}&apos;s reading sequence, processed by the GRU model
        </p>
        {recentSteps.length > 0 && predictedInterest ? (
          <div className="overflow-x-auto pb-2">
            <SequenceFlow
              steps={recentSteps}
              prediction={predictedInterest}
              matchScore={topPick?.match_score}
            />
          </div>
        ) : (
          <p className="text-sm text-ink-400">No sequence data yet for this user.</p>
        )}
        <div className="mt-5 pt-5 border-t border-surface-border flex items-center gap-2">
          <span className="text-sm text-ink-500">Predicted Interest:</span>
          <span className="badge bg-brand-gradient-soft text-brand-700 font-semibold">
            {predictedInterest ?? "—"}
          </span>
          {topPick && (
            <span className="text-xs text-ink-400">
              {topPick.match_score}% match &middot; {topPick.title}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function StatMini({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon size={16} className="text-white/40" />
      <div>
        <p className="text-sm font-semibold">{value}</p>
        <p className="text-[11px] text-white/40">{label}</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="card p-5">
      <div className="w-10 h-10 rounded-xl bg-brand-gradient-soft text-brand-600 flex items-center justify-center">
        <Icon size={18} />
      </div>
      <p className="mt-4 text-2xl font-bold text-ink-900 tracking-tight">{(value * 100).toFixed(1)}%</p>
      <p className="mt-1 text-sm text-ink-500">{label}</p>
    </div>
  );
}
