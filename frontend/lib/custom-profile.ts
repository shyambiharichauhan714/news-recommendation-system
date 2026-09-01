// A reader profile created in the browser.
//
// The deployed API is read-only — there is no row to insert — so a profile
// someone makes here lives in localStorage alongside their reads and
// bookmarks. It sits next to the ten seeded personas in the switcher and
// behaves like them everywhere: the greeting, preferences, history and
// recommendations all follow it.
//
// Recommendations still come from the real model: services/api.ts posts the
// profile's own reading history to /api/recommendations/for-history, which
// runs the same GRU inference the by-user route does.

import type { Category, UserInteraction } from "@/types";

export const CUSTOM_USER_ID = "ME";
const STORAGE_KEY = "newsmind_custom_profile_v1";
const ACTIVITY_KEY = "newsmind_activity_v1";

export interface CustomProfile {
  id: typeof CUSTOM_USER_ID;
  name: string;
  persona: string;
  preferred_categories: Category[];
  preferred_topics: string[];
  created_at: string;
}

export function isCustomUser(userId: string): boolean {
  return userId === CUSTOM_USER_ID;
}

export function getCustomProfile(): CustomProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomProfile;
    return parsed?.name ? parsed : null;
  } catch {
    return null;
  }
}

export function saveCustomProfile(
  input: Pick<CustomProfile, "name" | "preferred_categories" | "preferred_topics">
): CustomProfile {
  const profile: CustomProfile = {
    id: CUSTOM_USER_ID,
    name: input.name.trim() || "My profile",
    persona: describePersona(input.preferred_categories),
    preferred_categories: input.preferred_categories,
    preferred_topics: input.preferred_topics,
    created_at: getCustomProfile()?.created_at ?? new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage unavailable — the profile stays in memory for this page only.
  }
  return profile;
}

export function deleteCustomProfile(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** "Technology & Science reader" — a label in the same voice as the personas. */
function describePersona(categories: string[]): string {
  if (!categories.length) return "Building a reading profile";
  if (categories.length === 1) return `${categories[0]} reader`;
  return `${categories[0]} & ${categories[1]} reader`;
}

/**
 * The profile's reading history, read from the activity store.
 *
 * A browser profile has no seeded history: everything it knows comes from
 * what the person has actually opened. Reads are stored newest-first, and the
 * model expects oldest-first, so the order is reversed here.
 */
export function getCustomHistory(): UserInteraction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return [];
    const activity = JSON.parse(raw) as Record<
      string,
      { reads?: { news_id: string; at: string }[]; bookmarks?: string[] }
    >;
    const reads = activity[CUSTOM_USER_ID]?.reads ?? [];
    return [...reads].reverse().map<UserInteraction>((r, i) => ({
      id: `local-${i + 1}`,
      user_id: CUSTOM_USER_ID,
      news_id: r.news_id,
      interaction_type: "read",
      timestamp: r.at,
    }));
  } catch {
    return [];
  }
}
