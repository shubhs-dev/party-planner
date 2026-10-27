"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { votes, type VoteKind } from "@/lib/db/schema";
import { getParty, voteContext } from "@/lib/party";
import { voteError, votingKind } from "@/lib/phases";
import type { FormState } from "./auth";

/** Adds the viewer's vote for an option, or takes it back if they already voted for it. */
export async function toggleVote(partyId: string, kind: VoteKind, optionId: string): Promise<FormState> {
  const user = await requireUser();
  const party = await getParty(partyId);
  if (!party) return { error: "Party not found." };
  if (votingKind(party.phase) !== kind) return { error: "Voting for this has closed." };

  const ctx = await voteContext(party, kind, user.id);
  if (ctx.myVoteOptionIds.includes(optionId)) {
    await db
      .delete(votes)
      .where(
        and(eq(votes.userId, user.id), eq(votes.kind, kind), eq(votes.optionId, optionId), eq(votes.round, ctx.round)),
      );
  } else {
    const error = voteError({ optionId, ...ctx });
    if (error) return { error };
    await db
      .insert(votes)
      .values({ partyId, userId: user.id, kind, optionId, round: ctx.round })
      .onConflictDoNothing();
  }
  revalidatePath(`/parties/${partyId}`);
}
