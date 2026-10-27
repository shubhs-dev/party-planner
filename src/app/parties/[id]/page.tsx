import { notFound } from "next/navigation";
import { deleteDate } from "@/app/actions/dates";
import { deleteIdea } from "@/app/actions/ideas";
import { Avatar } from "@/components/Avatar";
import { ActionButton, CrownButton, VoteButton } from "@/components/buttons";
import { Celebrate } from "@/components/Celebrate";
import { DateCard } from "@/components/DateCard";
import { DateForm } from "@/components/DateForm";
import { IdeaCard } from "@/components/IdeaCard";
import { IdeaForm } from "@/components/IdeaForm";
import { OrganizerPanel } from "@/components/OrganizerPanel";
import { PhaseStepper } from "@/components/PhaseStepper";
import { Countdown } from "@/components/time";
import { requireUser } from "@/lib/auth";
import { formatDate, formatTime } from "@/lib/format";
import { getParty, getPartyView, type PartyView, type VoteState } from "@/lib/party";
import { PHASE_INFO } from "@/lib/phases";

export default async function PartyPage({ params }: PageProps<"/parties/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/parties/${id}`);
  const party = await getParty(id);
  if (!party) notFound();
  const view = await getPartyView(party, user.id);
  const info = PHASE_INFO[party.phase];

  const activeOptions =
    party.phase === "ideas" || party.phase === "idea_voting"
      ? view.ideas.filter((i) => i.eliminatedInRound === null).length
      : view.dates.filter((d) => d.eliminatedInRound === null).length;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <Avatar animal={view.organizer.animal} size="xs" /> {view.organizer.name} is organizing
          <span className="flex items-center">
            {view.people.slice(0, 12).map((p, i) => (
              <Avatar key={p.id} animal={p.animal} name={p.name} size="sm" className={i ? "-ml-2" : "ml-2"} />
            ))}
          </span>
        </div>
        <h1 className="text-4xl font-bold sm:text-5xl">{party.title}</h1>
        {party.description && <p className="max-w-2xl whitespace-pre-line text-ink-soft">{party.description}</p>}
      </section>

      <PhaseStepper phase={party.phase} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-xl font-bold">
          {info.emoji} {info.blurb}
        </p>
        {party.phaseDeadline && <Countdown to={party.phaseDeadline} />}
      </div>

      {view.isOrganizer && (
        <OrganizerPanel partyId={party.id} phase={party.phase} deadline={party.phaseDeadline} activeOptions={activeOptions} />
      )}

      {party.phase === "ideas" && <IdeasPhase view={view} userId={user.id} />}
      {party.phase === "idea_voting" && <IdeaVoting view={view} />}
      {(party.phase === "dates" || party.phase === "date_voting") && <WinnerBanner view={view} />}
      {party.phase === "dates" && <DatesPhase view={view} userId={user.id} />}
      {party.phase === "date_voting" && <DateVoting view={view} />}
      {party.phase === "done" && <Done view={view} />}
    </div>
  );
}

function IdeasPhase({ view, userId }: { view: PartyView; userId: string }) {
  return (
    <>
      <IdeaForm partyId={view.party.id} />
      {view.ideas.length === 0 ? (
        <Empty emoji="🦗" text="No ideas yet. Got a favourite spot? Add it!" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {view.ideas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              actions={
                (idea.authorId === userId || view.isOrganizer) && (
                  <ActionButton className="btn-ghost" action={deleteIdea.bind(null, idea.id)} confirmText="Remove this idea?">
                    🗑️
                  </ActionButton>
                )
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

function VoteMeter({ votes }: { votes: VoteState }) {
  const used = votes.myVotes.length;
  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-pink/10 to-sun/20">
      <div>
        <p className="font-display text-lg font-bold">
          {used >= votes.budget ? "All votes cast! 🙌" : `You have ${votes.budget - used} of ${votes.budget} votes left`}
        </p>
        <p className="text-sm text-ink-soft">
          {votes.round > 1 && `Runoff round ${votes.round} · `}
          {votes.voterCount} {votes.voterCount === 1 ? "person has" : "people have"} voted
          {votes.results ? "" : " · results are revealed when voting closes"}
        </p>
      </div>
      <div className="flex gap-1 text-2xl" aria-hidden>
        {Array.from({ length: votes.budget }, (_, i) => (
          <span key={i} className={i < used ? "" : "opacity-25 grayscale"}>
            💖
          </span>
        ))}
      </div>
    </div>
  );
}

/** Active options first (sorted by votes when results are visible), knocked-out ones last. */
function ordered<T extends { id: string; eliminatedInRound: number | null }>(options: T[], votes: VoteState) {
  const active = options.filter((o) => o.eliminatedInRound === null);
  const out = options.filter((o) => o.eliminatedInRound !== null);
  if (votes.results) active.sort((a, b) => votes.results![b.id].length - votes.results![a.id].length);
  return { active, out };
}

function IdeaVoting({ view }: { view: PartyView }) {
  const votes = view.ideaVotes!;
  const { active, out } = ordered(view.ideas, votes);
  const outOfVotes = votes.myVotes.length >= votes.budget;
  return (
    <>
      <VoteMeter votes={votes} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {active.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            voters={votes.results?.[idea.id]}
            actions={
              <>
                {view.isOrganizer && <CrownButton partyId={view.party.id} optionId={idea.id} />}
                <VoteButton
                  partyId={view.party.id}
                  kind="idea"
                  optionId={idea.id}
                  voted={votes.myVotes.includes(idea.id)}
                  outOfVotes={outOfVotes}
                />
              </>
            }
          />
        ))}
      </div>
      {out.length > 0 && <KnockedOut>{out.map((idea) => <IdeaCard key={idea.id} idea={idea} dimmed />)}</KnockedOut>}
    </>
  );
}

function WinnerBanner({ view }: { view: PartyView }) {
  const idea = view.winningIdea;
  if (!idea) return null;
  return (
    <div className="card flex items-center gap-4 border-sun bg-sun/20">
      <span className="text-4xl">👑</span>
      <div>
        <p className="text-sm font-bold text-ink-soft">The people have spoken:</p>
        <p className="font-display text-2xl font-bold">{idea.name}</p>
      </div>
    </div>
  );
}

function DatesPhase({ view, userId }: { view: PartyView; userId: string }) {
  return (
    <div className="grid gap-6 md:grid-cols-[360px_1fr]">
      <div>
        <DateForm partyId={view.party.id} />
      </div>
      <div className="flex flex-col gap-3">
        {view.dates.length === 0 ? (
          <Empty emoji="🗓️" text="No dates yet. When are you free?" />
        ) : (
          view.dates.map((d) => (
            <DateCard
              key={d.id}
              option={d}
              actions={
                (d.authorId === userId || view.isOrganizer) && (
                  <ActionButton className="btn-ghost" action={deleteDate.bind(null, d.id)} confirmText="Remove this date?">
                    🗑️
                  </ActionButton>
                )
              }
            />
          ))
        )}
      </div>
    </div>
  );
}

function DateVoting({ view }: { view: PartyView }) {
  const votes = view.dateVotes!;
  const { active, out } = ordered(view.dates, votes);
  const outOfVotes = votes.myVotes.length >= votes.budget;
  return (
    <>
      <VoteMeter votes={votes} />
      <div className="flex flex-col gap-3">
        {active.map((d) => (
          <DateCard
            key={d.id}
            option={d}
            voters={votes.results?.[d.id]}
            actions={
              <span className="flex items-center gap-2">
                {view.isOrganizer && <CrownButton partyId={view.party.id} optionId={d.id} />}
                <VoteButton
                  partyId={view.party.id}
                  kind="date"
                  optionId={d.id}
                  voted={votes.myVotes.includes(d.id)}
                  outOfVotes={outOfVotes}
                />
              </span>
            }
          />
        ))}
      </div>
      {out.length > 0 && <KnockedOut>{out.map((d) => <DateCard key={d.id} option={d} dimmed />)}</KnockedOut>}
    </>
  );
}

function Done({ view }: { view: PartyView }) {
  const { winningIdea: idea, winningDate: date } = view;
  return (
    <section className="flex flex-col gap-6">
      <Celebrate />
      <div className="card relative overflow-hidden bg-gradient-to-br from-pink via-grape to-sky text-center text-white">
        <p className="text-6xl">🥳</p>
        <h2 className="mt-2 text-4xl font-bold sm:text-5xl">It&apos;s happening!</h2>
        {date && (
          <p className="mt-3 font-display text-2xl font-bold">
            {formatDate(date.date, { weekday: "long" })}
            {date.time && ` at ${formatTime(date.time)}`}
          </p>
        )}
        {idea && <p className="mt-1 text-xl text-white/90">at {idea.name}</p>}
      </div>
      {idea && (
        <div className="mx-auto w-full max-w-md">
          <IdeaCard idea={idea} highlight />
        </div>
      )}
    </section>
  );
}

function KnockedOut({ children }: { children: React.ReactNode }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer font-bold text-ink-soft">Knocked out in earlier rounds</summary>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </details>
  );
}

function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="card py-10 text-center text-ink-soft">
      <p className="text-5xl">{emoji}</p>
      <p className="mt-2 font-bold">{text}</p>
    </div>
  );
}
