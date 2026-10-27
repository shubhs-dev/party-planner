import type { DateWithAuthor, Member } from "@/lib/party";
import { formatDate, formatTime } from "@/lib/format";
import { Avatar, AvatarStack } from "./Avatar";

export function DateCard({
  option,
  actions,
  voters,
  highlight,
  dimmed,
}: {
  option: DateWithAuthor;
  actions?: React.ReactNode;
  voters?: Member[] | null;
  highlight?: boolean;
  dimmed?: boolean;
}) {
  const [y, m, d] = option.date.split("-").map(Number);
  const day = new Date(Date.UTC(y, m - 1, d));
  return (
    <article
      className={`card flex items-center gap-4 ${highlight ? "border-sun ring-4 ring-sun/40" : ""} ${dimmed ? "opacity-50 grayscale" : ""}`}
    >
      <div className="flex w-16 shrink-0 flex-col items-center overflow-hidden rounded-2xl border-2 border-ink bg-white text-center">
        <span className="w-full bg-pink py-0.5 text-xs font-bold text-white uppercase">
          {day.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
        </span>
        <span className="font-display text-2xl leading-tight font-bold">{d}</span>
        <span className="pb-1 text-[10px] font-bold text-ink-soft uppercase">
          {day.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold">
          {formatDate(option.date)}
          {option.time && <span className="text-ink-soft"> · {formatTime(option.time)}</span>}
        </p>
        {option.note && <p className="text-sm text-ink-soft">{option.note}</p>}
        <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
          <Avatar animal={option.author.animal} size="xs" /> {option.author.name}
          {voters && voters.length > 0 && (
            <>
              <span className="mx-1">·</span>
              <AvatarStack people={voters} max={6} />
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        {voters && <span className="chip bg-pink/15 text-pink-deep">💖 {voters.length}</span>}
        {actions}
      </div>
    </article>
  );
}
