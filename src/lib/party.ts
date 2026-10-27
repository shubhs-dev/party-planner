import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "./db";
import {
  dateOptions,
  ideas,
  parties,
  users,
  votes,
  type DateOption,
  type Idea,
  type Party,
  type VoteKind,
} from "./db/schema";
import { deadlineExpired, leader, nextPhase, phaseIndex, runoffSurvivors, tally, voteBudget } from "./phases";

export type Member = { id: string; name: string; animal: string };

export async function listParties() {
  return db
    .select({
      id: parties.id,
      title: parties.title,
      phase: parties.phase,
      phaseDeadline: parties.phaseDeadline,
      createdAt: parties.createdAt,
      organizer: { id: users.id, name: users.name, animal: users.animal },
    })
    .from(parties)
    .innerJoin(users, eq(users.id, parties.organizerId))
    .orderBy(desc(parties.createdAt));
}

/** Active (not knocked out) options for a vote kind. */
async function activeOptions(party: Party, kind: VoteKind) {
  const table = kind === "idea" ? ideas : dateOptions;
  return db
    .select({ id: table.id, createdAt: table.createdAt })
    .from(table)
    .where(and(eq(table.partyId, party.id), isNull(table.eliminatedInRound)));
}

function roundOf(party: Party, kind: VoteKind) {
  return kind === "idea" ? party.ideaRound : party.dateRound;
}

async function currentTally(party: Party, kind: VoteKind) {
  const options = await activeOptions(party, kind);
  const roundVotes = await db
    .select({ optionId: votes.optionId })
    .from(votes)
    .where(and(eq(votes.partyId, party.id), eq(votes.kind, kind), eq(votes.round, roundOf(party, kind))));
  return tally(options, roundVotes);
}

/** How many options the phase is about (ideas for idea phases, dates for date phases). */
async function optionCount(party: Party) {
  if (party.phase === "done") return 0;
  const kind: VoteKind = party.phase === "ideas" || party.phase === "idea_voting" ? "idea" : "date";
  return (await activeOptions(party, kind)).length;
}

/**
 * Move a party to its next phase. When leaving a voting phase the winner is `winnerId`
 * if given, otherwise the current leader. Returns an error message or null.
 *
 * The update is conditional on the phase not having changed, so two requests racing
 * (e.g. two people loading an expired party at once) can't advance it twice.
 */
export async function advancePhase(party: Party, winnerId?: string): Promise<string | null> {
  const to = nextPhase(party.phase);
  if (!to) return "This party is already planned!";

  const patch: Partial<Party> = { phase: to, phaseDeadline: null };
  if (party.phase === "ideas" || party.phase === "dates") {
    if ((await optionCount(party)) === 0) {
      return party.phase === "ideas" ? "Add at least one idea first." : "Add at least one date first.";
    }
  } else {
    const kind: VoteKind = party.phase === "idea_voting" ? "idea" : "date";
    const rows = await currentTally(party, kind);
    const winner = winnerId ?? leader(rows);
    if (!winner || !rows.some((r) => r.id === winner)) return "Pick a winner from this round.";
    if (kind === "idea") patch.winningIdeaId = winner;
    else patch.winningDateId = winner;
  }

  await db
    .update(parties)
    .set(patch)
    .where(and(eq(parties.id, party.id), eq(parties.phase, party.phase)));
  return null;
}

/** Knock out everything outside the top `n` and start a fresh voting round. */
export async function startRunoff(party: Party, n: number): Promise<string | null> {
  const kind: VoteKind | null =
    party.phase === "idea_voting" ? "idea" : party.phase === "date_voting" ? "date" : null;
  if (!kind) return "Runoffs only happen during voting.";
  const rows = await currentTally(party, kind);
  const survivors = runoffSurvivors(rows, n);
  if (survivors.length < 2) return "A runoff needs at least two options left.";
  if (survivors.length === rows.length) return "That wouldn't knock anything out (ties are kept).";

  const round = roundOf(party, kind);
  const table = kind === "idea" ? ideas : dateOptions;
  const losers = rows.map((r) => r.id).filter((id) => !survivors.includes(id));
  await db.batch([
    db.update(table).set({ eliminatedInRound: round }).where(inArray(table.id, losers)),
    db
      .update(parties)
      .set(kind === "idea" ? { ideaRound: round + 1, phaseDeadline: null } : { dateRound: round + 1, phaseDeadline: null })
      .where(eq(parties.id, party.id)),
  ]);
  return null;
}

/** Load a party, first applying any deadline that has passed (no cron: we check on read). */
export async function getParty(id: string): Promise<Party | null> {
  for (let i = 0; i < 5; i++) {
    const party = await db.query.parties.findFirst({ where: eq(parties.id, id) });
    if (!party) return null;
    const expired = deadlineExpired({
      phase: party.phase,
      deadline: party.phaseDeadline,
      now: Date.now(),
      optionCount: await optionCount(party),
    });
    if (!expired) return party;
    await advancePhase(party);
  }
  return db.query.parties.findFirst({ where: eq(parties.id, id) }).then((p) => p ?? null);
}

export type IdeaWithAuthor = Idea & { author: Member };
export type DateWithAuthor = DateOption & { author: Member };

export type VoteState = {
  kind: VoteKind;
  round: number;
  budget: number;
  myVotes: string[];
  /** Vote counts and voters, only filled in when the viewer may see them. */
  results: Record<string, Member[]> | null;
  voterCount: number;
};

/** Everything the party page needs, shaped for the viewer. */
export async function getPartyView(party: Party, viewerId: string) {
  const isOrganizer = party.organizerId === viewerId;
  const author = { id: users.id, name: users.name, animal: users.animal };

  const [organizer, ideaRows, dateRows, voteRows] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, party.organizerId),
      columns: { id: true, name: true, animal: true },
    }),
    db
      .select({ idea: ideas, author })
      .from(ideas)
      .innerJoin(users, eq(users.id, ideas.authorId))
      .where(eq(ideas.partyId, party.id))
      .orderBy(asc(ideas.createdAt)),
    db
      .select({ date: dateOptions, author })
      .from(dateOptions)
      .innerJoin(users, eq(users.id, dateOptions.authorId))
      .where(eq(dateOptions.partyId, party.id))
      .orderBy(asc(dateOptions.date), asc(dateOptions.time)),
    db
      .select({ kind: votes.kind, round: votes.round, optionId: votes.optionId, voter: author })
      .from(votes)
      .innerJoin(users, eq(users.id, votes.userId))
      .where(eq(votes.partyId, party.id)),
  ]);

  const ideaList: IdeaWithAuthor[] = ideaRows.map((r) => ({ ...r.idea, author: r.author }));
  const dateList: DateWithAuthor[] = dateRows.map((r) => ({ ...r.date, author: r.author }));

  function voteState(kind: VoteKind, options: { id: string; eliminatedInRound: number | null }[], open: boolean): VoteState {
    const round = roundOf(party, kind);
    const mine = voteRows.filter((v) => v.kind === kind && v.round === round && v.voter.id === viewerId);
    const roundVotes = voteRows.filter((v) => v.kind === kind && v.round === round);
    const active = options.filter((o) => o.eliminatedInRound === null);
    const showResults = !open || isOrganizer;
    const results: Record<string, Member[]> = {};
    for (const o of active) results[o.id] = [];
    for (const v of roundVotes) results[v.optionId]?.push(v.voter);
    return {
      kind,
      round,
      budget: voteBudget(active.length),
      myVotes: mine.map((v) => v.optionId),
      results: showResults ? results : null,
      voterCount: new Set(roundVotes.map((v) => v.voter.id)).size,
    };
  }

  const ideaVotes = phaseIndex(party.phase) >= 1 ? voteState("idea", ideaList, party.phase === "idea_voting") : null;
  const dateVotes = phaseIndex(party.phase) >= 3 ? voteState("date", dateList, party.phase === "date_voting") : null;

  // Everyone who has taken part so far, for the "who's in" strip.
  const people = new Map<string, Member>();
  if (organizer) people.set(organizer.id, organizer);
  for (const i of ideaList) people.set(i.author.id, i.author);
  for (const d of dateList) people.set(d.author.id, d.author);
  for (const v of voteRows) people.set(v.voter.id, v.voter);

  return {
    party,
    isOrganizer,
    organizer: organizer!,
    ideas: ideaList,
    dates: dateList,
    ideaVotes,
    dateVotes,
    people: [...people.values()],
    winningIdea: ideaList.find((i) => i.id === party.winningIdeaId) ?? null,
    winningDate: dateList.find((d) => d.id === party.winningDateId) ?? null,
  };
}

export type PartyView = Awaited<ReturnType<typeof getPartyView>>;

/** Used by the vote action: the viewer's votes this round and the active option ids. */
export async function voteContext(party: Party, kind: VoteKind, userId: string) {
  const round = roundOf(party, kind);
  const [options, mine] = await Promise.all([
    activeOptions(party, kind),
    db
      .select({ optionId: votes.optionId })
      .from(votes)
      .where(and(eq(votes.partyId, party.id), eq(votes.kind, kind), eq(votes.round, round), eq(votes.userId, userId))),
  ]);
  return { round, activeOptionIds: options.map((o) => o.id), myVoteOptionIds: mine.map((v) => v.optionId) };
}
