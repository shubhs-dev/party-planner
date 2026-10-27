// Pure party rules: phase order, vote budgets, tallies. No DB or framework imports here,
// so everything is easy to unit test (see phases.test.ts).

import { PHASES, type Phase, type VoteKind } from "./db/schema";

export const PHASE_INFO: Record<Phase, { label: string; emoji: string; blurb: string }> = {
  ideas: { label: "Ideas", emoji: "💡", blurb: "Drop in every place or plan you'd love to do." },
  idea_voting: { label: "Vote", emoji: "🗳️", blurb: "Spend your votes on your favourite ideas." },
  dates: { label: "Dates", emoji: "📅", blurb: "Suggest dates that work for you." },
  date_voting: { label: "Pick a date", emoji: "⏰", blurb: "Vote for the dates you can make." },
  done: { label: "Party!", emoji: "🎉", blurb: "It's decided. See you there!" },
};

export function nextPhase(phase: Phase): Phase | null {
  const i = PHASES.indexOf(phase);
  return i < PHASES.length - 1 ? PHASES[i + 1] : null;
}

export function phaseIndex(phase: Phase): number {
  return PHASES.indexOf(phase);
}

/** Which kind of option is voted on in this phase, if it is a voting phase. */
export function votingKind(phase: Phase): VoteKind | null {
  if (phase === "idea_voting") return "idea";
  if (phase === "date_voting") return "date";
  return null;
}

/** Votes each person gets: about a third of the options, at least 1, at most 5. */
export function voteBudget(optionCount: number): number {
  if (optionCount <= 0) return 0;
  return Math.min(5, Math.max(1, Math.ceil(optionCount / 3)));
}

export type Option = { id: string; createdAt: number };
export type TallyRow = { id: string; count: number };

/** Vote counts per option, most votes first; ties go to the option added first. */
export function tally(options: Option[], votes: { optionId: string }[]): TallyRow[] {
  const counts = new Map<string, number>(options.map((o) => [o.id, 0]));
  for (const v of votes) {
    if (counts.has(v.optionId)) counts.set(v.optionId, counts.get(v.optionId)! + 1);
  }
  const created = new Map(options.map((o) => [o.id, o.createdAt]));
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || created.get(a.id)! - created.get(b.id)!);
}

/** The option that wins if voting closed now (null when there are no options). */
export function leader(rows: TallyRow[]): string | null {
  return rows[0]?.id ?? null;
}

/** Ids tied for first place (length > 1 means the organizer may want to break the tie). */
export function tiedForFirst(rows: TallyRow[]): string[] {
  if (rows.length === 0) return [];
  return rows.filter((r) => r.count === rows[0].count).map((r) => r.id);
}

/**
 * Options that survive a runoff of the top `n`. Anything tied with the n-th place
 * also survives, so nobody is knocked out by insertion order.
 */
export function runoffSurvivors(rows: TallyRow[], n: number): string[] {
  if (n <= 0 || rows.length === 0) return [];
  if (rows.length <= n) return rows.map((r) => r.id);
  const cutoff = rows[n - 1].count;
  return rows.filter((r) => r.count >= cutoff).map((r) => r.id);
}

/** Why a vote can't be cast, or null if it can. */
export function voteError(args: {
  optionId: string;
  activeOptionIds: string[];
  myVoteOptionIds: string[];
}): string | null {
  const { optionId, activeOptionIds, myVoteOptionIds } = args;
  if (!activeOptionIds.includes(optionId)) return "That option isn't in this round.";
  if (myVoteOptionIds.includes(optionId)) return "You already voted for that one.";
  const used = myVoteOptionIds.filter((id) => activeOptionIds.includes(id)).length;
  if (used >= voteBudget(activeOptionIds.length)) return "You're out of votes. Remove one first.";
  return null;
}

/** A phase whose deadline passed moves on by itself, unless there is nothing to move on with. */
export function deadlineExpired(args: {
  phase: Phase;
  deadline: number | null;
  now: number;
  optionCount: number;
}): boolean {
  const { phase, deadline, now, optionCount } = args;
  if (phase === "done" || deadline === null || deadline > now) return false;
  return optionCount > 0;
}
