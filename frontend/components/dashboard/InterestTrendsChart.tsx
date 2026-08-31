"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { InterestTrendPoint, Category } from "@/types";
import { getCategoryColor } from "@/lib/utils";

export default function InterestTrendsChart({
  data,
  categories,
}: {
  data: InterestTrendPoint[];
  categories: Category[];
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E7E9F3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#8A8FB0" }}
            axisLine={{ stroke: "#E7E9F3" }}
            tickLine={false}
          />
          <YAxis tick={{ fontSize: 11, fill: "#8A8FB0" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #E7E9F3",
              boxShadow: "0 4px 24px rgba(15,18,41,0.08)",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
          {categories.map((cat) => (
            <Line
              key={cat}
              type="monotone"
              dataKey={cat}
              stroke={getCategoryColor(cat).chart}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
