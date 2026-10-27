"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateOptions, ideas, parties, votes } from "@/lib/db/schema";
import { advancePhase, getParty, startRunoff } from "@/lib/party";
import type { FormState } from "./auth";

export async function createParty(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({
      title: z.string().trim().min(2, "Give the party a name.").max(80),
      description: z.string().trim().max(500),
      deadline: z.coerce.number().int().positive().optional(),
    })
    .safeParse({
      title: form.get("title"),
      description: form.get("description") ?? "",
      deadline: form.get("deadline") || undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [party] = await db
    .insert(parties)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      organizerId: user.id,
      phaseDeadline: parsed.data.deadline ?? null,
    })
    .returning({ id: parties.id });
  redirect(`/parties/${party.id}`);
}

/** Loads the party and checks the viewer is its organizer. */
async function asOrganizer(partyId: string) {
  const user = await requireUser();
  const party = await getParty(partyId);
  if (!party) return { error: "Party not found." } as const;
  if (party.organizerId !== user.id) return { error: "Only the organizer can do that." } as const;
  return { party } as const;
}

export async function advance(partyId: string, winnerId?: string): Promise<FormState> {
  const r = await asOrganizer(partyId);
  if ("error" in r) return { error: r.error };
  const error = await advancePhase(r.party, winnerId);
  revalidatePath(`/parties/${partyId}`);
  return error ? { error } : undefined;
}

export async function runoff(partyId: string, topN: number): Promise<FormState> {
  const r = await asOrganizer(partyId);
  if ("error" in r) return { error: r.error };
  const error = await startRunoff(r.party, Math.floor(topN));
  revalidatePath(`/parties/${partyId}`);
  return error ? { error } : undefined;
}

/** Sets (or clears, with null) the deadline of the party's current phase. */
export async function setDeadline(partyId: string, deadline: number | null): Promise<FormState> {
  const r = await asOrganizer(partyId);
  if ("error" in r) return { error: r.error };
  if (deadline !== null && (!Number.isFinite(deadline) || deadline <= Date.now())) {
    return { error: "Pick a time in the future." };
  }
  await db.update(parties).set({ phaseDeadline: deadline }).where(eq(parties.id, partyId));
  revalidatePath(`/parties/${partyId}`);
}

export async function deleteParty(partyId: string): Promise<FormState> {
  const r = await asOrganizer(partyId);
  if ("error" in r) return { error: r.error };
  // Delete children explicitly rather than relying on SQLite's foreign_keys pragma being on.
  await db.batch([
    db.delete(votes).where(eq(votes.partyId, partyId)),
    db.delete(ideas).where(eq(ideas.partyId, partyId)),
    db.delete(dateOptions).where(eq(dateOptions.partyId, partyId)),
    db.delete(parties).where(eq(parties.id, partyId)),
  ]);
  redirect("/");
}
