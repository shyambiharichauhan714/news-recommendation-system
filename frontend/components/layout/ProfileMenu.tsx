"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, User, SlidersHorizontal, History, LogOut, Check } from "lucide-react";
import { useActiveUser } from "@/lib/user-context";
import { useCatalog } from "@/lib/catalog-context";
import { cn } from "@/lib/utils";
import { avatarFor } from "@/lib/placeholder";

export default function ProfileMenu() {
  const router = useRouter();
  const { activeUserId, setActiveUserId } = useActiveUser();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { users, userById } = useCatalog();
  const user = userById(activeUserId);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  // The catalog loads asynchronously; render a neutral placeholder rather
  // than dereferencing an undefined user on the first paint.
  if (!user) {
    return <div className="w-11 h-11 shrink-0" aria-hidden="true" />;
  }

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 pl-2 pr-1 sm:pr-3 h-11 rounded-xl hover:bg-white transition-colors"
      >
        <img
          src={avatarFor(user)}
          alt=""
          className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-soft"
        />
        <span className="hidden sm:block text-left leading-tight">
          <span className="block text-sm font-semibold text-ink-900">{user.name}</span>
          <span className="block text-[11px] text-ink-400">{user.persona}</span>
        </span>
        <ChevronDown
          size={15}
          className={cn(
            "hidden sm:block text-ink-400 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 card shadow-card-hover z-30 overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-border">
            <p className="text-sm font-semibold text-ink-900 truncate">{user.name}</p>
            <p className="text-xs text-ink-400 truncate">{user.email}</p>
          </div>

          <div className="p-1.5">
            <button
              onClick={() => go("/profile")}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-700 hover:bg-surface-muted transition-colors"
            >
              <User size={15} className="text-ink-400" />
              View profile
            </button>
            <button
              onClick={() => go("/profile")}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-700 hover:bg-surface-muted transition-colors"
            >
              <SlidersHorizontal size={15} className="text-ink-400" />
              Preferences
            </button>
            <button
              onClick={() => go("/history")}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-700 hover:bg-surface-muted transition-colors"
            >
              <History size={15} className="text-ink-400" />
              Reading history
            </button>
          </div>

          {users.length > 1 && (
            <div className="border-t border-surface-border p-1.5">
              <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Switch demo persona
              </p>
              {users.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setActiveUserId(d.id);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-ink-700 hover:bg-surface-muted transition-colors"
                >
                  <img src={avatarFor(d)} alt="" className="w-6 h-6 rounded-full object-cover" />
                  <span className="min-w-0 flex-1 truncate text-left">{d.name}</span>
                  {d.id === activeUserId && <Check size={14} className="text-brand-500 shrink-0" />}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-surface-border p-1.5">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut size={15} />
              Sign out
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
