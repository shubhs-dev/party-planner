"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ideas, votes } from "@/lib/db/schema";
import { getParty } from "@/lib/party";
import { getLinkPreview, type LinkPreview } from "@/lib/preview";
import type { FormState } from "./auth";

const imageUrl = z
  .string()
  .refine((u) => u.startsWith("/uploads/") || /^https?:\/\//.test(u), "Images must be web links.");

const ideaSchema = z.object({
  name: z.string().trim().min(1, "Give the idea a name.").max(100),
  link: z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "That link doesn't look right." })]),
  images: z.array(imageUrl).max(6, "Up to 6 photos per idea."),
  priceLevel: z.coerce.number().int().min(1).max(4).optional(),
  costPerPerson: z.coerce.number().min(0).max(100000).optional(),
  costNotes: z.string().trim().max(200),
  notes: z.string().trim().max(1000),
});

export async function addIdea(partyId: string, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const party = await getParty(partyId);
  if (!party) return { error: "Party not found." };
  if (party.phase !== "ideas") return { error: "Idea collection has closed." };

  let images: unknown = [];
  try {
    images = JSON.parse(String(form.get("images") || "[]"));
  } catch {}
  const parsed = ideaSchema.safeParse({
    name: form.get("name"),
    link: String(form.get("link") ?? "").trim(),
    images,
    priceLevel: form.get("priceLevel") || undefined,
    costPerPerson: form.get("costPerPerson") || undefined,
    costNotes: form.get("costNotes") ?? "",
    notes: form.get("notes") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  await db.insert(ideas).values({
    partyId,
    authorId: user.id,
    name: d.name,
    link: d.link || null,
    images: d.images,
    priceLevel: d.priceLevel ?? null,
    costPerPerson: d.costPerPerson ?? null,
    costNotes: d.costNotes,
    notes: d.notes,
  });
  revalidatePath(`/parties/${partyId}`);
  return {};
}

export async function deleteIdea(ideaId: string): Promise<FormState> {
  const user = await requireUser();
  const idea = await db.query.ideas.findFirst({ where: eq(ideas.id, ideaId) });
  if (!idea) return;
  const party = await getParty(idea.partyId);
  if (!party) return;
  if (idea.authorId !== user.id && party.organizerId !== user.id) {
    return { error: "Only whoever added it (or the organizer) can remove this." };
  }
  if (party.phase !== "ideas") return { error: "Ideas can only be removed while collecting ideas." };
  await db.batch([
    db.delete(votes).where(and(eq(votes.kind, "idea"), eq(votes.optionId, ideaId))),
    db.delete(ideas).where(eq(ideas.id, ideaId)),
  ]);
  revalidatePath(`/parties/${idea.partyId}`);
}

export async function previewLink(link: string): Promise<LinkPreview | { error: string }> {
  await requireUser();
  try {
    return await getLinkPreview(link);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Couldn't read that link." };
  }
}
