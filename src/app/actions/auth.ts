"use server";

import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAnimal } from "@/lib/animals";
import { endSession, safeNext, startSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type FormState = { error?: string } | undefined;

const nameSchema = z
  .string()
  .trim()
  .min(2, "Pick a name with at least 2 characters.")
  .max(24, "Keep your name to 24 characters.");
const passcodeSchema = z.string().min(4, "Your passcode needs at least 4 characters.").max(64);

export async function join(_: FormState, form: FormData): Promise<FormState> {
  const parsed = z
    .object({ name: nameSchema, animal: z.string(), passcode: passcodeSchema, invite: z.string().optional() })
    .safeParse({
      name: form.get("name"),
      animal: form.get("animal"),
      passcode: form.get("passcode"),
      invite: form.get("invite") ?? undefined,
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, animal, passcode, invite } = parsed.data;

  const required = process.env.INVITE_CODE;
  if (required && invite?.trim() !== required) return { error: "That invite code isn't right." };
  if (!getAnimal(animal)) return { error: "Pick an animal first." };

  const taken = await db
    .select({ name: users.name, animal: users.animal })
    .from(users)
    .where(sql`lower(${users.name}) = lower(${name}) or ${users.animal} = ${animal}`);
  if (taken.some((u) => u.name.toLowerCase() === name.toLowerCase())) return { error: "That name is taken." };
  if (taken.some((u) => u.animal === animal)) return { error: "Someone just grabbed that animal. Pick another!" };

  let id: string;
  try {
    const [user] = await db
      .insert(users)
      .values({ name, animal, passcodeHash: await bcrypt.hash(passcode, 10) })
      .returning({ id: users.id });
    id = user.id;
  } catch {
    return { error: "That name or animal was just taken. Try again." };
  }
  await startSession(id);
  redirect(safeNext(form.get("next")));
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") ?? "").trim();
  const passcode = String(form.get("passcode") ?? "");
  const user = await db.query.users.findFirst({ where: sql`lower(${users.name}) = lower(${name})` });
  if (!user || !(await bcrypt.compare(passcode, user.passcodeHash))) {
    return { error: "Name or passcode doesn't match." };
  }
  await startSession(user.id);
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  await endSession();
  redirect("/join");
}
