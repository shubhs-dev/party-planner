"use client";

import { useState } from "react";
import { advance, deleteParty, runoff, setDeadline } from "@/app/actions/parties";
import type { Phase } from "@/lib/db/schema";
import { ActionButton } from "./buttons";
import { Countdown } from "./time";

const ADVANCE_LABEL: Partial<Record<Phase, string>> = {
  ideas: "Close ideas & start voting →",
  idea_voting: "Close voting & crown the leader 👑",
  dates: "Close dates & start voting →",
  date_voting: "Lock in the leading date 🎉",
};

export function OrganizerPanel({
  partyId,
  phase,
  deadline,
  activeOptions,
}: {
  partyId: string;
  phase: Phase;
  deadline: number | null;
  activeOptions: number;
}) {
  const [when, setWhen] = useState("");
  const [topN, setTopN] = useState(Math.max(2, Math.min(3, activeOptions - 1)));
  const voting = phase === "idea_voting" || phase === "date_voting";
  const whenMs = when ? new Date(when).getTime() : NaN;

  return (
    <details className="card border-dashed border-grape/50 bg-grape/5" open={phase !== "done"}>
      <summary className="cursor-pointer font-display text-lg font-bold select-none">🎛️ Organizer controls</summary>
      <div className="mt-4 flex flex-col gap-4">
        {ADVANCE_LABEL[phase] && (
          <div className="flex flex-col gap-1">
            <ActionButton
              className="btn btn-primary self-start"
              action={() => advance(partyId)}
              confirmText="Move everyone on to the next step?"
              celebrateOnSuccess={phase === "date_voting"}
            >
              {ADVANCE_LABEL[phase]}
            </ActionButton>
            {voting && <p className="text-xs text-ink-soft">Ties go to whichever was added first. Or crown any option yourself below.</p>}
          </div>
        )}

        {voting && activeOptions > 2 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold">Runoff with the top</span>
            <input
              className="input w-20"
              type="number"
              min={2}
              max={activeOptions - 1}
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
            />
            <ActionButton
              action={() => runoff(partyId, topN)}
              confirmText={`Knock out everything outside the top ${topN} and reset votes for a new round?`}
            >
              🔁 Start runoff
            </ActionButton>
          </div>
        )}

        {phase !== "done" && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-bold">
              Deadline for this step: {deadline ? <Countdown to={deadline} /> : <span className="text-ink-soft">none</span>}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <input className="input w-auto" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              <ActionButton action={() => setDeadline(partyId, whenMs)}>Set deadline</ActionButton>
              {deadline && <ActionButton className="btn-ghost" action={() => setDeadline(partyId, null)}>Clear</ActionButton>}
            </div>
          </div>
        )}

        <div className="border-t-2 border-dashed border-line pt-3">
          <ActionButton
            className="btn-ghost text-pink-deep"
            action={() => deleteParty(partyId)}
            confirmText="Delete this party and everything in it? This can't be undone."
          >
            🗑️ Delete party
          </ActionButton>
        </div>
      </div>
    </details>
  );
}
