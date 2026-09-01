import { describe, expect, it } from "vitest";
import { mergeTimeline, type ReadRecord } from "@/lib/timeline";
import type { UserInteraction } from "@/types";

const interaction = (
  id: string,
  news_id: string,
  timestamp: string,
  interaction_type: UserInteraction["interaction_type"] = "read"
): UserInteraction => ({
  id,
  user_id: "ME",
  news_id,
  interaction_type,
  timestamp,
});

const read = (news_id: string, at: string): ReadRecord => ({ news_id, at });

describe("mergeTimeline", () => {
  it("does not list a browser profile's reads twice", () => {
    // The defect this function exists for. A profile created in the browser
    // has no server row, so fetchUserHistory returns the same stored reads the
    // activity context holds — and the page showed every article twice with
    // "All activity 6" for three reads.
    const stored: ReadRecord[] = [
      read("N001", "2026-09-01T12:00:00.000Z"),
      read("N002", "2026-09-01T11:00:00.000Z"),
      read("N003", "2026-09-01T10:00:00.000Z"),
    ];
    const asHistory = stored.map((r, i) => interaction(`local-${i + 1}`, r.news_id, r.at));

    const merged = mergeTimeline(asHistory, stored);

    expect(merged).toHaveLength(3);
    expect(merged.map((e) => e.news_id)).toEqual(["N001", "N002", "N003"]);
  });

  it("keeps a genuine re-read of the same article as two rows", () => {
    // The dedupe must key on the instant too. Collapsing by article alone
    // would silently drop history the GRU sequence actually contains.
    const merged = mergeTimeline(
      [interaction("s1", "N001", "2026-09-01T09:00:00.000Z")],
      [read("N001", "2026-09-01T18:00:00.000Z")]
    );
    expect(merged).toHaveLength(2);
    expect(merged.map((e) => e.timestamp)).toEqual([
      "2026-09-01T18:00:00.000Z",
      "2026-09-01T09:00:00.000Z",
    ]);
  });

  it("drops the 'This session' badge from a stored read, keeps it on a fresh one", () => {
    // Which entry survives a pair is not cosmetic: a stored profile's whole
    // history would otherwise claim to have been read in this session.
    const merged = mergeTimeline(
      [interaction("local-1", "N001", "2026-08-30T09:00:00.000Z")],
      [read("N001", "2026-08-30T09:00:00.000Z"), read("N009", "2026-09-01T20:00:00.000Z")]
    );
    expect(merged.find((e) => e.news_id === "N001")!.local).toBe(false);
    expect(merged.find((e) => e.news_id === "N009")!.local).toBe(true);
  });

  it("leaves a seeded persona's history and this session's reads both intact", () => {
    // The other side of the fix: for the ten personas the two sources are
    // genuinely different sets, and neither may be swallowed.
    const seeded = [
      interaction("s1", "N010", "2026-08-25T08:00:00.000Z"),
      interaction("s2", "N011", "2026-08-26T08:00:00.000Z", "bookmark"),
    ];
    const merged = mergeTimeline(seeded, [read("N050", "2026-09-01T21:00:00.000Z")]);
    expect(merged).toHaveLength(3);
    expect(merged[0].news_id).toBe("N050");
    expect(merged.filter((e) => e.local)).toHaveLength(1);
  });

  it("preserves the interaction type a server entry carries", () => {
    const merged = mergeTimeline([interaction("s1", "N010", "2026-08-25T08:00:00.000Z", "bookmark")], []);
    expect(merged[0].interaction_type).toBe("bookmark");
  });

  it("counts the Read tab off deduplicated rows", () => {
    // The tab counts are derived from this array, and they were doubled too:
    // three reads reported "Read 6".
    const stored = [read("N001", "2026-09-01T12:00:00.000Z"), read("N002", "2026-09-01T11:00:00.000Z")];
    const merged = mergeTimeline(
      stored.map((r, i) => interaction(`local-${i + 1}`, r.news_id, r.at)),
      stored
    );
    expect(merged.filter((e) => e.interaction_type === "read")).toHaveLength(2);
  });

  it("orders strictly newest first across both sources", () => {
    const merged = mergeTimeline(
      [
        interaction("s1", "N001", "2026-08-20T08:00:00.000Z"),
        interaction("s2", "N002", "2026-09-01T08:00:00.000Z"),
      ],
      [read("N003", "2026-08-28T08:00:00.000Z")]
    );
    expect(merged.map((e) => e.news_id)).toEqual(["N002", "N003", "N001"]);
  });

  it("gives every row a unique React key", () => {
    const stored = [read("N001", "2026-09-01T12:00:00.000Z")];
    const merged = mergeTimeline(
      [...stored.map((r, i) => interaction(`local-${i + 1}`, r.news_id, r.at)), interaction("s9", "N001", "2026-08-01T12:00:00.000Z")],
      stored
    );
    expect(new Set(merged.map((e) => e.key)).size).toBe(merged.length);
  });

  it("returns an empty timeline for a profile that has read nothing", () => {
    expect(mergeTimeline([], [])).toEqual([]);
  });
});
