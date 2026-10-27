"use server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploads } from "@/lib/db/schema";

const MAX_BYTES = 800_000; // the browser downscales photos well below this before sending
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export async function uploadImage(form: FormData): Promise<{ url: string } | { error: string }> {
  const user = await requireUser();
  const file = form.get("file");
  if (!(file instanceof File)) return { error: "No file received." };
  if (!TYPES.includes(file.type)) return { error: "Only JPEG, PNG, WebP or GIF images." };
  if (file.size > MAX_BYTES) return { error: "That image is too big." };

  const [row] = await db
    .insert(uploads)
    .values({ uploaderId: user.id, mime: file.type, data: Buffer.from(await file.arrayBuffer()) })
    .returning({ id: uploads.id });
  return { url: `/uploads/${row.id}` };
}
