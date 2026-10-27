import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { Countdown } from "@/components/time";
import { requireUser } from "@/lib/auth";
import { listParties } from "@/lib/party";
import { PHASE_INFO, phaseIndex } from "@/lib/phases";

export default async function Home() {
  const user = await requireUser();
  const all = await listParties();

  return (
    <div>
      <section className="card relative mb-8 overflow-hidden bg-gradient-to-br from-pink to-grape text-white">
        <div className="relative z-10 max-w-lg py-4">
          <p className="font-bold text-white/80">Hey {user.name}!</p>
          <h1 className="text-4xl font-bold sm:text-5xl">Let&apos;s plan something fun.</h1>
          <p className="mt-2 text-white/90">Pitch ideas, vote on the best ones, pick a date. Done.</p>
          <Link href="/parties/new" className="btn btn-sun mt-5">
            ✨ Start a party
          </Link>
        </div>
        <span aria-hidden className="absolute -right-4 -bottom-6 animate-float text-[9rem] leading-none sm:right-8">
          🪩
        </span>
      </section>

      <h2 className="mb-3 text-2xl font-bold">Parties</h2>
      {all.length === 0 ? (
        <div className="card text-center text-ink-soft">No parties yet. Be the hero who starts one. 🦸</div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {all.map((p) => {
            const info = PHASE_INFO[p.phase];
            return (
              <li key={p.id}>
                <Link href={`/parties/${p.id}`} className="card block transition hover:-translate-y-0.5 hover:border-pink">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-bold">{p.title}</h3>
                    <span className="chip shrink-0">
                      {info.emoji} {info.label}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                    <Avatar animal={p.organizer.animal} size="xs" /> Organized by {p.organizer.name}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex flex-1 gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={`h-2 flex-1 rounded-full ${i <= phaseIndex(p.phase) ? "bg-pink" : "bg-line"}`}
                        />
                      ))}
                    </div>
                    {p.phaseDeadline && <Countdown to={p.phaseDeadline} prefix="Next step in" />}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
