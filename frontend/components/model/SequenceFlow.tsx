"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { cn, getCategoryColor } from "@/lib/utils";
import type { Category } from "@/types";

interface SequenceStep {
  label: string;
  category: Category;
}

export default function SequenceFlow({
  steps,
  prediction,
}: {
  steps: SequenceStep[];
  prediction: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {steps.map((step, i) => {
        const colors = getCategoryColor(step.category);
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center gap-3"
          >
            <div className={cn("px-4 py-2.5 rounded-xl border text-sm font-medium", colors.bg, colors.text, "border-transparent")}>
              {step.label}
            </div>
            <ArrowRight size={16} className="text-ink-300" />
          </motion.div>
        );
      })}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: steps.length * 0.1 }}
        className="px-4 py-2.5 rounded-xl bg-brand-gradient text-white text-sm font-semibold flex items-center gap-1.5 shadow-glow"
      >
        <Sparkles size={14} />
        {prediction}
      </motion.div>
    </div>
  );
}
