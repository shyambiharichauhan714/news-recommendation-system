"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Activity, Clock, CalendarDays, Zap } from "lucide-react";
import { useActiveUser } from "@/lib/user-context";
import { fetchAnalytics } from "@/services/api";
import type { AnalyticsData } from "@/types";
import KpiCard from "@/components/ui/KpiCard";
import { getCategoryColor } from "@/lib/utils";

export default function AnalyticsPage() {
  const { activeUserId, hydrated: userReady } = useActiveUser();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Waits for the stored selection: fetching on the provisional id would
  // request the default persona's analytics for a reader who has their own.
  useEffect(() => {
    if (!userReady) return;
    let cancelled = false;
    setLoading(true);
    fetchAnalytics(activeUserId).then((d) => {
      if (cancelled) return;
      setData(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeUserId, userReady]);

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 tracking-tight">Analytics</h1>
        <p className="text-ink-500 mt-1">Your reading activity, preferences, and behavior patterns.</p>
      </motion.div>

      {loading || !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-[120px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Interactions" value={data.total_interactions} icon={Activity} accent="brand" index={0} />
          <KpiCard
            label="Avg Reading Duration"
            value={`${Math.round(data.avg_reading_duration / 60)}m`}
            icon={Clock}
            accent="violet"
            index={1}
          />
          <KpiCard label="Most Active Day" value={data.most_active_day} icon={CalendarDays} accent="emerald" index={2} />
          <KpiCard label="Most Active Time" value={data.most_active_hour} icon={Zap} accent="amber" index={3} />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <div className="card p-6">
          <p className="font-semibold text-ink-900 mb-1">Reading Activity</p>
          <p className="text-sm text-ink-500 mb-4">Articles read per day, last 14 days</p>
          {loading || !data ? (
            <div className="skeleton h-64" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.reading_activity} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="readingFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4A63FA" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#4A63FA" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E9F3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8A8FB0" }} tickLine={false} axisLine={{ stroke: "#E7E9F3" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#8A8FB0" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E7E9F3", fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#4A63FA" strokeWidth={2.5} fill="url(#readingFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card p-6">
          <p className="font-semibold text-ink-900 mb-1">Category Preferences</p>
          <p className="text-sm text-ink-500 mb-4">Breakdown of what you read</p>
          {loading || !data ? (
            <div className="skeleton h-64" />
          ) : data.category_breakdown.length === 0 ? (
            <p className="text-sm text-ink-400 py-12 text-center">No category data yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.category_breakdown}
                    dataKey="count"
                    nameKey="category"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {data.category_breakdown.map((entry) => (
                      <Cell key={entry.category} fill={getCategoryColor(entry.category).chart} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E7E9F3", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
