import { LucideIcon, Inbox, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card overflow-hidden", className)}>
      <div className="skeleton aspect-[16/10] rounded-none" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-3 w-full" />
        <div className="skeleton h-3 w-2/3" />
        <div className="skeleton h-9 w-full mt-2" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function InlineLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-400">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 card">
      <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center mb-4">
        <Icon size={24} className="text-ink-400" />
      </div>
      <p className="font-semibold text-ink-900">{title}</p>
      {description && <p className="text-sm text-ink-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 card">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-rose-500" />
      </div>
      <p className="font-semibold text-ink-900">{message}</p>
      <p className="text-sm text-ink-500 mt-1">Please try again in a moment.</p>
    </div>
  );
}
