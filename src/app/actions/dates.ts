"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { dateOptions, votes } from "@/lib/db/schema";
import { getParty } from "@/lib/party";
import type { FormState } from "./auth";

const dateSchema = z.object({
  date: z.iso.date("Pick a date."),
  time: z.union([z.literal(""), z.iso.time({ precision: -1, error: "That time doesn't look right." })]),
  note: z.string().trim().max(200),
});

export async function addDate(partyId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const party = await getParty(partyId);
  if (!party) return { error: "Party not found." };
  if (party.phase !== "dates") return { error: "Date suggestions have closed." };

  const parsed = dateSchema.safeParse({
    date: form.get("date"),
    time: form.get("time") ?? "",
    note: form.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const inserted = await db
    .insert(dateOptions)
    .values({ partyId, authorId: user.id, ...parsed.data })
    .onConflictDoNothing()
    .returning({ id: dateOptions.id });
  if (inserted.length === 0) return { error: "Someone already suggested that date." };
  revalidatePath(`/parties/${partyId}`);
  return {};
}

export async function deleteDate(dateId: string): Promise<FormState> {
  const user = await requireUser();
  const option = await db.query.dateOptions.findFirst({ where: eq(dateOptions.id, dateId) });
  if (!option) return;
  const party = await getParty(option.partyId);
  if (!party) return;
  if (option.authorId !== user.id && party.organizerId !== user.id) {
    return { error: "Only whoever added it (or the organizer) can remove this." };
  }
  if (party.phase !== "dates") return { error: "Dates can only be removed while collecting dates." };
  await db.batch([
    db.delete(votes).where(and(eq(votes.kind, "date"), eq(votes.optionId, dateId))),
    db.delete(dateOptions).where(eq(dateOptions.id, dateId)),
  ]);
  revalidatePath(`/parties/${option.partyId}`);
}
