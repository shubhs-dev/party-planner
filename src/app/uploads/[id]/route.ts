import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { uploads } from "@/lib/db/schema";

export async function GET(_: Request, ctx: RouteContext<"/uploads/[id]">) {
  const { id } = await ctx.params;
  const row = await db.query.uploads.findFirst({ where: eq(uploads.id, id) });
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "content-type": row.mime,
      // Uploads never change, so browsers and the CDN can keep them forever.
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
