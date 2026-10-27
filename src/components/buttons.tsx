"use client";

import { useOptimistic, useState, useTransition } from "react";
import { advance } from "@/app/actions/parties";
import { toggleVote } from "@/app/actions/votes";
import type { VoteKind } from "@/lib/db/schema";
import { burst, celebrate, originOf } from "./confetti";

type Result = { error?: string } | undefined | void;

/** Runs a server action on click and shows its error (if any) next to the button. */
function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(fn: () => Promise<Result>, onOk?: () => void) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else onOk?.();
    });
  }
  return { pending, error, run };
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? <span className="text-xs font-bold text-pink-deep">{error}</span> : null;
}

export function ActionButton({
  action,
  children,
  className = "btn btn-small",
  confirmText,
  celebrateOnSuccess,
}: {
  action: () => Promise<Result>;
  children: React.ReactNode;
  className?: string;
  confirmText?: string;
  celebrateOnSuccess?: boolean;
}) {
  const { pending, error, run } = useAction();
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
          if (confirmText && !window.confirm(confirmText)) return;
          run(action, celebrateOnSuccess ? celebrate : undefined);
        }}
      >
        {pending ? "…" : children}
      </button>
      <ErrorText error={error} />
    </span>
  );
}

export function VoteButton({
  partyId,
  kind,
  optionId,
  voted,
  outOfVotes,
}: {
  partyId: string;
  kind: VoteKind;
  optionId: string;
  voted: boolean;
  outOfVotes: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Flip immediately; once the action finishes the server re-render supplies the real `voted`.
  const [shown, setShown] = useOptimistic(voted);

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || (!shown && outOfVotes)}
        title={!shown && outOfVotes ? "You're out of votes. Remove one first." : undefined}
        onClick={(e) => {
          const origin = originOf(e.currentTarget);
          setError(null);
          start(async () => {
            setShown(!voted);
            const res = await toggleVote(partyId, kind, optionId);
            if (res?.error) setError(res.error);
            else if (!voted) burst(origin);
          });
        }}
        className={`btn btn-small ${shown ? "btn-primary" : ""}`}
      >
        {shown ? "💖 Voted" : "🤍 Vote"}
      </button>
      <ErrorText error={error} />
    </span>
  );
}

export function CrownButton({ partyId, optionId }: { partyId: string; optionId: string }) {
  return (
    <ActionButton
      className="btn btn-small btn-sun"
      action={() => advance(partyId, optionId)}
      confirmText="Crown this as the winner and move on?"
      celebrateOnSuccess
    >
      👑 Crown
    </ActionButton>
  );
}
