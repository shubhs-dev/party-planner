import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { JoinForm } from "@/components/JoinForm";

export default async function JoinPage({ searchParams }: PageProps<"/join">) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  const taken = (await db.select({ animal: users.animal }).from(users)).map((u) => u.animal);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">Who are you at the party?</h1>
        <p className="mt-2 text-ink-soft">Pick a spirit animal and a fake name. Nobody needs to know it&apos;s you. 🤫</p>
      </div>
      <JoinForm taken={taken} inviteRequired={Boolean(process.env.INVITE_CODE)} next={next} />
      <p className="mt-6 text-center text-sm text-ink-soft">
        Already joined?{" "}
        <Link className="font-bold text-pink underline" href={`/login?next=${encodeURIComponent(next)}`}>
          Log in
        </Link>
      </p>
    </div>
  );
}
