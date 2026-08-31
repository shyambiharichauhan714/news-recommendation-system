"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaSparkline, BarSparkline, LineSparkline, RingChart } from "@/components/ui/Sparkline";

export type KpiVisual =
  | { kind: "bar"; data: number[] }
  | { kind: "line"; data: number[] }
  | { kind: "area"; data: number[] }
  | { kind: "ring"; percent: number };

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  /** Pill in the top-right, e.g. "High". */
  badge?: string;
  badgeTone?: "emerald" | "amber" | "rose";
  accent?: "brand" | "violet" | "emerald" | "amber";
  index?: number;
  /** When set, the whole card becomes a link to this route. */
  href?: string;
  /** Small line under the value, e.g. "+3 from yesterday". */
  footer?: string;
  footerIcon?: LucideIcon;
  footerTone?: "brand" | "violet" | "emerald" | "amber" | "muted";
  visual?: KpiVisual;
}

const ACCENTS = {
  brand: "bg-brand-50 text-brand-600",
  violet: "bg-violet-50 text-violet-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
};

const BADGE_TONES = {
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
};

const FOOTER_TONES = {
  brand: "text-brand-600",
  violet: "text-violet-600",
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  muted: "text-ink-400",
};

function Visual({ visual }: { visual: KpiVisual }) {
  if (visual.kind === "ring") return <RingChart percent={visual.percent} />;
  if (visual.kind === "bar") return <BarSparkline data={visual.data} />;
  if (visual.kind === "line") return <LineSparkline data={visual.data} />;
  return <AreaSparkline data={visual.data} />;
}

export default function KpiCard({
  label,
  value,
  icon: Icon,
  badge,
  badgeTone = "emerald",
  accent = "brand",
  index = 0,
  href,
  footer,
  footerIcon: FooterIcon,
  footerTone = "muted",
  visual,
}: KpiCardProps) {
  const body = (
    <>
      {/* Icon and label share the top row so the value below can run large. */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
            ACCENTS[accent]
          )}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
        <p className="text-sm text-ink-500 leading-tight min-w-0 flex-1">{label}</p>
        {badge && (
          <span
            className={cn(
              "text-xs font-semibold px-2 py-1 rounded-full shrink-0",
              BADGE_TONES[badgeTone]
            )}
          >
            {badge}
          </span>
        )}
        {href && !badge && (
          <ArrowUpRight
            size={15}
            className="text-ink-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <p className="text-[28px] leading-none font-bold text-ink-900 tracking-tight min-w-0 truncate">
          {value}
        </p>
        {visual && (
          <div className="shrink-0 flex items-end">
            <Visual visual={visual} />
          </div>
        )}
      </div>

      {footer && (
        <p className={cn("mt-3 text-xs font-medium flex items-center gap-1", FOOTER_TONES[footerTone])}>
          {FooterIcon && <FooterIcon size={13} />}
          {footer}
        </p>
      )}
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={cn("card p-5 group", href && "card-hover")}
    >
      {href ? (
        <Link href={href} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </motion.div>
  );
}
