import type { IdeaWithAuthor, Member } from "@/lib/party";
import { formatMoney, priceLabel } from "@/lib/format";
import { Avatar, AvatarStack } from "./Avatar";

/** One idea. `actions` (vote/crown/delete buttons) and `voters` are filled in by the phase view. */
export function IdeaCard({
  idea,
  actions,
  voters,
  highlight,
  dimmed,
}: {
  idea: IdeaWithAuthor;
  actions?: React.ReactNode;
  voters?: Member[] | null;
  highlight?: boolean;
  dimmed?: boolean;
}) {
  const price = priceLabel(idea.priceLevel);
  let host: string | null = null;
  try {
    host = idea.link ? new URL(idea.link).hostname.replace(/^www\./, "") : null;
  } catch {}
  const isMaps = host ? /(^|\.)google\.[a-z.]+$|maps\.app\.goo\.gl|goo\.gl/.test(host) : false;

  return (
    <article
      className={`card flex flex-col gap-3 overflow-hidden p-0 ${highlight ? "border-sun ring-4 ring-sun/40" : ""} ${
        dimmed ? "opacity-50 grayscale" : ""
      }`}
    >
      {idea.images.length > 0 ? (
        <div className="flex snap-x snap-mandatory overflow-x-auto">
          {idea.images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-supplied hosts
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-44 w-full shrink-0 snap-center object-cover"
            />
          ))}
        </div>
      ) : (
        <div className="flex h-24 items-center justify-center bg-gradient-to-br from-sun/40 via-pink/20 to-grape/20 text-5xl">
          🎊
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 px-5 pb-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg leading-tight font-bold">{idea.name}</h3>
          {voters && (
            <span className="chip shrink-0 bg-pink/15 text-pink-deep">
              💖 {voters.length}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {price && <span className="chip bg-mint/20">{price}</span>}
          {idea.costPerPerson !== null && <span className="chip bg-mint/20">~{formatMoney(idea.costPerPerson)} / person</span>}
          {idea.link && (
            <a href={idea.link} target="_blank" rel="noreferrer noopener" className="chip bg-sky/15 hover:bg-sky/30">
              {isMaps ? "📍 Open in Maps" : `🔗 ${host}`}
            </a>
          )}
        </div>
        {idea.costNotes && <p className="text-sm text-ink-soft">💸 {idea.costNotes}</p>}
        {idea.notes && <p className="text-sm whitespace-pre-line">{idea.notes}</p>}
        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-2">
          <span className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Avatar animal={idea.author.animal} size="xs" /> {idea.author.name}
          </span>
          <span className="flex items-center gap-2">{actions}</span>
        </div>
        {voters && voters.length > 0 && <AvatarStack people={voters} />}
      </div>
    </article>
  );
}
