"use client";

import TopbarSearch from "@/components/layout/TopbarSearch";
import NotificationsMenu from "@/components/layout/NotificationsMenu";
import ProfileMenu from "@/components/layout/ProfileMenu";

export default function Topbar() {
  return (
    <header className="sticky top-0 z-20 h-20 flex items-center gap-4 px-4 sm:px-6 lg:px-8 bg-surface/80 backdrop-blur-md border-b border-surface-border">
      <div className="lg:hidden flex items-center gap-2 font-bold text-ink-900">
        NewsMind AI
      </div>

      <TopbarSearch />

      <div className="flex-1 sm:hidden" />

      <NotificationsMenu />
      <ProfileMenu />
    </header>
  );
}
