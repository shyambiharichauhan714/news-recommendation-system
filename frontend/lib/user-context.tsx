"use client";

// Global "active user" context for demo mode. Lets any page read/set which
// demo user (persona) is currently active, so switching users on the
// Profile page immediately changes recommendations, analytics, and history
// everywhere else in the app (Section 16 & 18).

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { DEMO_USERS } from "@/lib/mock-data";

interface UserContextValue {
  activeUserId: string;
  setActiveUserId: (id: string) => void;
  /**
   * False until the stored selection has been read.
   *
   * The provider has to start on a fixed id so the server render and the first
   * client render agree, which means the real user is only known one effect
   * later. Anything that fetches per user must wait for this: otherwise every
   * page fires a request for the default persona first, and when that response
   * lands after the real one it overwrites it — a reader with their own
   * profile was shown U001's reading history.
   */
  hydrated: boolean;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

const STORAGE_KEY = "newsmind_active_user";

export function UserProvider({ children }: { children: ReactNode }) {
  const [activeUserId, setActiveUserIdState] = useState<string>(DEMO_USERS[0].user.id);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setActiveUserIdState(stored);
    } catch {
      // localStorage unavailable — keep default user
    }
    setHydrated(true);
  }, []);

  const setActiveUserId = (id: string) => {
    setActiveUserIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  };

  return (
    <UserContext.Provider value={{ activeUserId, setActiveUserId, hydrated }}>
      {children}
    </UserContext.Provider>
  );
}

export function useActiveUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useActiveUser must be used within UserProvider");
  return ctx;
}
