// Merging a reader's two sources of history into one timeline.
//
// Reading History draws from two places: interactions the API knows about, and
// reads recorded in this browser. For the ten seeded personas those are
// genuinely different sets. For a profile someone created here they are the
// same set — the deployed API has no row to return, so fetchUserHistory reads
// back the very localStorage the activity store wrote. Concatenating them
// listed every article twice and doubled the tab counts.

import type { InteractionType, UserInteraction } from "@/types";

export interface ReadRecord {
  news_id: string;
  at: string;
}

/** One row of the timeline. */
export interface TimelineEntry {
  key: string;
  news_id: string;
  interaction_type: InteractionType;
  timestamp: string;
  /** Read in this browser and not (yet) known to the backend. */
  local: boolean;
}

/**
 * Server interactions plus this browser's reads, newest first, deduplicated.
 *
 * Two entries collapse only when they name the same article at the same
 * instant, so a real re-read — same article, a later timestamp — stays as two
 * rows. Server entries are offered first, which makes the survivor of a pair
 * the unbadged one: right for a stored profile, where badging every read as
 * "This session" would claim they all just happened.
 */
export function mergeTimeline(
  history: UserInteraction[],
  reads: ReadRecord[]
): TimelineEntry[] {
  const server: TimelineEntry[] = history.map((h) => ({
    key: `s-${h.id}`,
    news_id: h.news_id,
    interaction_type: h.interaction_type,
    timestamp: h.timestamp,
    local: false,
  }));
  const local: TimelineEntry[] = reads.map((r) => ({
    key: `l-${r.news_id}-${r.at}`,
    news_id: r.news_id,
    interaction_type: "read" as InteractionType,
    timestamp: r.at,
    local: true,
  }));

  const seen = new Set<string>();
  const merged: TimelineEntry[] = [];
  for (const entry of [...server, ...local]) {
    const id = `${entry.news_id}|${entry.timestamp}`;
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(entry);
  }
  return merged.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));
}
